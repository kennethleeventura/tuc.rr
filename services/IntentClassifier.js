// TUC.rr Intent Classification Service
// Analyzes customer queries to determine optimal review sources
const { Pool } = require('pg');

class IntentClassifier {
  constructor() {
    this.intentPatterns = {
      'product_research': {
        keywords: ['buy', 'purchase', 'compare', 'best', 'review', 'quality', 'price', 'worth'],
        sources: ['amazon', 'trustpilot', 'consumerreports'],
        priority: 'high'
      },
      'service_evaluation': {
        keywords: ['service', 'support', 'help', 'experience', 'staff', 'customer service'],
        sources: ['trustpilot', 'yelp', 'bbb'],
        priority: 'high'
      },
      'local_business': {
        keywords: ['near me', 'location', 'hours', 'address', 'local', 'nearby'],
        sources: ['google', 'yelp'],
        priority: 'medium'
      },
      'company_reputation': {
        keywords: ['company', 'business', 'reputation', 'trustworthy', 'reliable', 'scam'],
        sources: ['bbb', 'trustpilot', 'glassdoor'],
        priority: 'high'
      },
      'complaint_research': {
        keywords: ['complaint', 'problem', 'issue', 'bad', 'terrible', 'awful', 'scam'],
        sources: ['bbb', 'trustpilot', 'consumerreports'],
        priority: 'critical'
      }
    };

    this.categoryIntents = {
      'restaurants': ['service_evaluation', 'local_business'],
      'products': ['product_research', 'complaint_research'],
      'services': ['service_evaluation', 'company_reputation'],
      'companies': ['company_reputation', 'complaint_research'],
      'healthcare': ['service_evaluation', 'local_business'],
      'automotive': ['product_research', 'service_evaluation'],
      'technology': ['product_research', 'complaint_research'],
      'retail': ['service_evaluation', 'local_business']
    };
  }

  classifyIntent(query, category) {
    const queryLower = query.toLowerCase();
    const scores = {};
    
    // Score each intent based on keyword matches
    Object.entries(this.intentPatterns).forEach(([intent, config]) => {
      scores[intent] = 0;
      
      config.keywords.forEach(keyword => {
        if (queryLower.includes(keyword)) {
          scores[intent] += 1;
        }
      });
      
      // Boost score if intent is relevant to category
      if (this.categoryIntents[category]?.includes(intent)) {
        scores[intent] += 2;
      }
    });

    // Find highest scoring intent
    const topIntent = Object.entries(scores).reduce((a, b) => 
      scores[a[0]] > scores[b[0]] ? a : b
    )[0];

    return {
      primaryIntent: topIntent,
      confidence: scores[topIntent] / 5, // Normalize to 0-1
      recommendedSources: this.intentPatterns[topIntent].sources,
      priority: this.intentPatterns[topIntent].priority,
      allScores: scores
    };
  }

  getOptimalSources(query, category) {
    const intent = this.classifyIntent(query, category);
    const baseSources = this.categoryIntents[category] || ['trustpilot'];
    
    // Combine intent-based sources with category defaults
    const sources = [...new Set([
      ...intent.recommendedSources,
      ...baseSources.flatMap(i => this.intentPatterns[i]?.sources || [])
    ])];

    return {
      sources: sources.slice(0, 4), // Limit to 4 sources max
      intent: intent.primaryIntent,
      confidence: intent.confidence,
      priority: intent.priority
    };
  }

  async logIntent(userId, query, category, classification) {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    
    try {
      await pool.query(`
        INSERT INTO intent_classifications (
          user_id, query_text, category, primary_intent, 
          confidence_score, recommended_sources, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
      `, [
        userId,
        query,
        category,
        classification.primaryIntent,
        classification.confidence,
        JSON.stringify(classification.recommendedSources)
      ]);
    } catch (error) {
      console.error('Failed to log intent:', error);
    } finally {
      await pool.end();
    }
  }
}

module.exports = IntentClassifier;