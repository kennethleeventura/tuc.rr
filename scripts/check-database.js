// TUC.rr Database Health Check Script
// Copyright 2025 - 2882 LLC

require('dotenv').config();
const { Pool } = require('pg');

class DatabaseHealthCheck {
    constructor() {
        this.pool = new Pool({
            connectionString: process.env.DATABASE_URL,
            ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
            connectionTimeoutMillis: 5000
        });
    }

    async checkHealth() {
        let client;
        
        try {
            console.log('*TUC sighing* Checking database health... preparing for the worst...');
            
            // Test connection
            client = await this.pool.connect();
            
            // Basic connectivity test
            const result = await client.query('SELECT NOW() as current_time');
            console.log(`Database connected at: ${result.rows[0].current_time}`);
            
            // Check if database exists and is accessible
            const dbInfo = await client.query(`
                SELECT 
                    current_database() as database_name,
                    version() as postgres_version,
                    current_user as connected_user
            `);
            
            const info = dbInfo.rows[0];
            console.log(`Connected to: ${info.database_name}`);
            console.log(`PostgreSQL: ${info.postgres_version.split(' ')[1]}`);
            console.log(`User: ${info.connected_user}`);
            
            // Check table existence
            const tables = await client.query(`
                SELECT 
                    schemaname,
                    tablename,
                    tableowner,
                    hasindexes,
                    hasrules
                FROM pg_tables 
                WHERE schemaname = 'public'
                ORDER BY tablename
            `);
            
            if (tables.rows.length === 0) {
                console.log('*TUC expected* No tables found. Database needs initialization.');
                return { status: 'needs_migration', tables: 0 };
            }
            
            console.log(`Found ${tables.rows.length} tables:`);
            tables.rows.forEach(table => {
                console.log(`  - ${table.tablename} (indexes: ${table.hasindexes ? 'yes' : 'no'})`);
            });
            
            // Check critical tables
            const criticalTables = ['users', 'subscriptions', 'query_history', 'payment_history'];
            const existingTables = tables.rows.map(row => row.tablename);
            const missingTables = criticalTables.filter(table => !existingTables.includes(table));
            
            if (missingTables.length > 0) {
                console.log('*TUC concerned* Missing critical tables:', missingTables.join(', '));
                return { 
                    status: 'needs_migration', 
                    tables: tables.rows.length,
                    missing: missingTables 
                };
            }
            
            // Check data integrity
            const userCount = await client.query('SELECT COUNT(*) FROM users');
            const subscriptionCount = await client.query('SELECT COUNT(*) FROM subscriptions');
            
            console.log(`Users: ${userCount.rows[0].count}`);
            console.log(`Subscriptions: ${subscriptionCount.rows[0].count}`);
            
            // Test write capability
            await client.query('BEGIN');
            await client.query(`
                INSERT INTO audit_log (action, resource_type, success, created_at) 
                VALUES ('health_check', 'database', true, NOW())
            `);
            await client.query('ROLLBACK'); // Don't actually insert
            
            console.log('*TUC surprised* Database health check passed. Everything seems functional.');
            
            return { 
                status: 'healthy', 
                tables: tables.rows.length,
                users: parseInt(userCount.rows[0].count),
                subscriptions: parseInt(subscriptionCount.rows[0].count)
            };
            
        } catch (error) {
            console.error('*TUC dramatic* Database health check failed:', error.message);
            
            if (error.code === 'ECONNREFUSED') {
                return { status: 'connection_refused', error: 'Cannot connect to database server' };
            } else if (error.code === 'ENOTFOUND') {
                return { status: 'host_not_found', error: 'Database host not found' };
            } else if (error.code === '28P01') {
                return { status: 'authentication_failed', error: 'Invalid database credentials' };
            } else if (error.code === '3D000') {
                return { status: 'database_not_found', error: 'Database does not exist' };
            }
            
            return { status: 'error', error: error.message };
            
        } finally {
            if (client) {
                client.release();
            }
            await this.pool.end();
        }
    }
    
    async checkEnvironmentVariables() {
        console.log('*TUC muttering* Checking environment variables...');
        
        const required = [
            'DATABASE_URL',
            'OPENAI_API_KEY',
            'STRIPE_SECRET_KEY',
            'JWT_SECRET'
        ];
        
        const missing = required.filter(var_name => !process.env[var_name]);
        
        if (missing.length > 0) {
            console.error('*TUC frustrated* Missing required environment variables:');
            missing.forEach(var_name => console.error(`  - ${var_name}`));
            return false;
        }
        
        // Validate DATABASE_URL format
        const dbUrl = process.env.DATABASE_URL;
        if (!dbUrl.startsWith('postgresql://') && !dbUrl.startsWith('postgres://')) {
            console.error('*TUC confused* DATABASE_URL must start with postgresql:// or postgres://');
            return false;
        }
        
        // Check OpenAI API key format
        const openaiKey = process.env.OPENAI_API_KEY;
        if (!openaiKey.startsWith('sk-')) {
            console.error('*TUC suspicious* OpenAI API key should start with sk-');
            return false;
        }
        
        // Check Stripe key format
        const stripeKey = process.env.STRIPE_SECRET_KEY;
        if (!stripeKey.startsWith('sk_')) {
            console.error('*TUC worried* Stripe secret key should start with sk_');
            return false;
        }
        
        console.log('*TUC relieved* Environment variables look acceptable.');
        return true;
    }
}

// Run health check if called directly
if (require.main === module) {
    const healthCheck = new DatabaseHealthCheck();
    
    async function runCheck() {
        try {
            // Check environment first
            const envValid = await healthCheck.checkEnvironmentVariables();
            if (!envValid) {
                console.error('Environment validation failed');
                process.exit(1);
            }
            
            // Check database
            const result = await healthCheck.checkHealth();
            
            console.log('\n=== Health Check Summary ===');
            console.log(`Status: ${result.status}`);
            
            if (result.status === 'healthy') {
                console.log(`Tables: ${result.tables}`);
                console.log(`Users: ${result.users}`);
                console.log(`Subscriptions: ${result.subscriptions}`);
                console.log('*TUC resigned* Database is ready for operation.');
                process.exit(0);
            } else {
                console.log(`Issue: ${result.error || 'Database needs initialization'}`);
                if (result.missing) {
                    console.log(`Missing tables: ${result.missing.join(', ')}`);
                }
                
                if (result.status === 'needs_migration') {
                    console.log('*TUC resigned* Database needs migration. Run migrate.js first.');
                    process.exit(2); // Exit code 2 indicates migration needed
                } else {
                    console.log('*TUC dramatic* Database health check failed.');
                    process.exit(1);
                }
            }
            
        } catch (error) {
            console.error('*TUC catastrophic* Health check crashed:', error);
            process.exit(1);
        }
    }
    
    runCheck();
}

module.exports = DatabaseHealthCheck;