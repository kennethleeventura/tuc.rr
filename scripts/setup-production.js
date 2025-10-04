// TUC.rr Production Setup Script
// Initializes database with new schema and sets up services
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

async function setupProduction() {
  console.log('🚀 TUC.rr Production Setup Starting...');
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    // 1. Run main schema
    console.log('📊 Setting up main database schema...');
    const mainSchema = fs.readFileSync(path.join(__dirname, '../database/schema.sql'), 'utf8');
    await pool.query(mainSchema);
    
    // 2. Run knowledge base extensions
    console.log('🧠 Setting up knowledge base schema...');
    const kbSchema = fs.readFileSync(path.join(__dirname, '../database/knowledge-base-schema.sql'), 'utf8');
    await pool.query(kbSchema);
    
    // 3. Create initial data
    console.log('📝 Creating initial configuration data...');
    await createInitialData(pool);
    
    // 4. Test services
    console.log('🔧 Testing services...');
    await testServices();
    
    console.log('✅ TUC.rr Production Setup Complete!');
    console.log('\n📋 Next Steps:');
    console.log('1. Update .env file with your API keys');
    console.log('2. Configure domain DNS settings');
    console.log('3. Set up Stripe webhooks');
    console.log('4. Deploy to production server');
    console.log('\n*TUC voice* Well, the system is ready... probably about to break any minute now...');
    
  } catch (error) {
    console.error('❌ Setup failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

async function createInitialData(pool) {
  // Create default subscription tiers
  await pool.query(`
    INSERT INTO subscriptions (user_id, tier, status, monthly_query_limit, current_period_start, current_period_end)
    SELECT 
      u.id, 'free', 'active', 5, NOW(), NOW() + INTERVAL '1 month'
    FROM users u 
    WHERE NOT EXISTS (SELECT 1 FROM subscriptions s WHERE s.user_id = u.id)
  `);
  
  // Initialize source performance tracking
  const sources = ['trustpilot', 'google', 'yelp', 'amazon', 'bbb', 'consumerreports'];
  const categories = ['restaurants', 'products', 'services', 'companies', 'healthcare', 'automotive', 'technology', 'retail'];
  
  for (const source of sources) {
    for (const category of categories) {
      await pool.query(`
        INSERT INTO source_performance (source_name, category, success_rate, avg_response_time_ms)
        VALUES ($1, $2, 85.0, 3000)
        ON CONFLICT (source_name, category) DO NOTHING
      `, [source, category]);
    }
  }
  
  console.log('✅ Initial data created');
}

async function testServices() {
  try {
    // Test review scraper
    const ReviewScraper = require('../services/ReviewScraper');
    const scraper = new ReviewScraper();
    console.log('✅ ReviewScraper initialized');
    
    // Test intent classifier
    const IntentClassifier = require('../services/IntentClassifier');
    const classifier = new IntentClassifier();
    const testIntent = classifier.classifyIntent('best pizza restaurant', 'restaurants');
    console.log('✅ IntentClassifier working:', testIntent.primaryIntent);
    
    // Test knowledge base
    const KnowledgeBase = require('../services/KnowledgeBase');
    const kb = new KnowledgeBase();
    console.log('✅ KnowledgeBase initialized');
    
    // Test personality engine
    const TUCPersonality = require('../services/TUCPersonality');
    const personality = new TUCPersonality();
    const testResponse = personality.getVariation('greetings', 'TEST-001');
    console.log('✅ TUCPersonality working:', testResponse);
    
    // Test customer tracker
    const CustomerTracker = require('../services/CustomerTracker');
    const tracker = new CustomerTracker();
    console.log('✅ CustomerTracker initialized');
    
  } catch (error) {
    console.error('❌ Service test failed:', error.message);
    throw error;
  }
}

// Run setup if called directly
if (require.main === module) {
  require('dotenv').config();
  setupProduction();
}

module.exports = { setupProduction };