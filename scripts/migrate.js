// TUC.rr Database Migration Script
// Copyright 2025 - 2882 LLC

require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs').promises;
const path = require('path');

class DatabaseMigrator {
    constructor() {
        this.pool = new Pool({
            connectionString: process.env.DATABASE_URL,
            ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
        });
    }

    async migrate() {
        const client = await this.pool.connect();
        
        try {
            console.log('*TUC muttering* Starting database migration... this better not break everything...');
            
            // Read and execute schema
            const schemaPath = path.join(__dirname, '..', 'database', 'schema.sql');
            const schema = await fs.readFile(schemaPath, 'utf8');
            
            console.log('Executing database schema...');
            await client.query(schema);
            
            // Verify critical tables exist
            const tables = await client.query(`
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name IN ('users', 'subscriptions', 'query_history', 'payment_history')
            `);
            
            if (tables.rows.length !== 4) {
                throw new Error('Critical tables missing after migration');
            }
            
            console.log('*TUC surprised* Migration completed successfully. Tables created:');
            tables.rows.forEach(row => console.log(`  - ${row.table_name}`));
            
            // Create default subscription tiers if they don't exist
            await this.createDefaultData(client);
            
            console.log('*TUC resigned* Database is ready for disappointment... I mean, operation.');
            
        } catch (error) {
            console.error('*TUC dramatic* Migration failed catastrophically:', error);
            throw error;
        } finally {
            client.release();
            await this.pool.end();
        }
    }
    
    async createDefaultData(client) {
        try {
            // Create system user if not exists
            await client.query(`
                INSERT INTO users (
                    email, password_hash, customer_id, account_status,
                    terms_accepted_version, terms_accepted_at,
                    privacy_consent, privacy_consent_at
                ) VALUES (
                    'system@theunhappycustomer.com', '', 'SYSTEM', 'active',
                    '1.0', NOW(), true, NOW()
                ) ON CONFLICT (email) DO NOTHING
            `);
            
            console.log('System user configured');
            
        } catch (error) {
            console.error('Error creating default data:', error);
            // Don't throw - this is not critical for migration
        }
    }
}

// Run migration if called directly
if (require.main === module) {
    const migrator = new DatabaseMigrator();
    migrator.migrate()
        .then(() => {
            console.log('Migration completed successfully');
            process.exit(0);
        })
        .catch((error) => {
            console.error('Migration failed:', error);
            process.exit(1);
        });
}

module.exports = DatabaseMigrator;