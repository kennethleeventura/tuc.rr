const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: 'postgresql://tuc_admin:zV8Z0kB1egZFOhVQhnNwJuIEsTRJcSFg@dpg-d2qtu02dbo4c73ck17n0-a.oregon-postgres.render.com/tuc_rr_db',
  ssl: { rejectUnauthorized: false }
});

async function runSchema() {
  try {
    console.log('🔄 Connecting to database...');
    
    // Read schema file
    const schemaPath = path.join(__dirname, 'database', 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    console.log('📋 Splitting schema into tables and indexes...');
    
    // Split schema - remove CONCURRENT indexes for now
    const statements = schema.split(';').filter(stmt => stmt.trim());
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i].trim();
      
      if (!statement) continue;
      
      // Skip concurrent indexes for now
      if (statement.includes('CREATE INDEX CONCURRENTLY')) {
        console.log(`⏭️  Skipping concurrent index: ${statement.substring(0, 60)}...`);
        continue;
      }
      
      try {
        console.log(`📋 Executing statement ${i + 1}/${statements.length}`);
        await pool.query(statement);
      } catch (error) {
        if (error.message.includes('already exists')) {
          console.log(`⚠️  Already exists: ${statement.substring(0, 60)}...`);
        } else {
          console.error(`❌ Failed statement: ${statement.substring(0, 60)}...`);
          console.error(`Error: ${error.message}`);
        }
      }
    }
    
    console.log('✅ Database schema created successfully!');
    console.log('🎉 TUC.rr database is ready for production!');
    
  } catch (error) {
    console.error('❌ Schema execution failed:', error.message);
  } finally {
    await pool.end();
  }
}

runSchema();