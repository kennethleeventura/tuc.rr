// TUC.rr Knowledge Base Service
// Stores and retrieves review data with intelligent caching
const { Pool } = require('pg');

class KnowledgeBase {
  constructor() {
    this.pool = new Pool({ 
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });
    
    this.cacheExpiry = 24 * 60 * 60 * 1000; // 24 hours
  }

  async storeReviews(query, category, reviewData) {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Store main review summary
      const summaryResult = await client.query(`
        INSERT INTO review_summaries (
          query_text, category, total_reviews, avg_rating, 
          frown_rating, sources, last_updated, raw_data
        ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), $7)
        ON CONFLICT (query_text, category) DO UPDATE SET
          total_reviews = $3,
          avg_rating = $4,
          frown_rating = $5,
          sources = $6,
          last_updated = NOW(),
          raw_data = $7
        RETURNING id
      `, [
        query,
        category,
        reviewData.totalReviews,
        reviewData.avgRating,
        reviewData.frownRating,
        JSON.stringify(reviewData.sources),
        JSON.stringify(reviewData)
      ]);
      
      const summaryId = summaryResult.rows[0].id;
      
      // Store individual reviews
      await client.query('DELETE FROM individual_reviews WHERE summary_id = $1', [summaryId]);
      
      for (const review of reviewData.reviews.slice(0, 20)) { // Store top 20 reviews
        await client.query(`
          INSERT INTO individual_reviews (
            summary_id, source, rating, review_text, 
            author, review_date, verified
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [
          summaryId,
          review.source,
          review.rating,
          review.text,
          review.author,
          review.date,
          review.verified || false
        ]);
      }
      
      await client.query('COMMIT');
      return summaryId;
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async getReviews(query, category) {
    const client = await this.pool.connect();
    
    try {
      // Check for cached data
      const result = await client.query(`
        SELECT * FROM review_summaries 
        WHERE query_text = $1 AND category = $2
        AND last_updated > NOW() - INTERVAL '24 hours'
        ORDER BY last_updated DESC
        LIMIT 1
      `, [query, category]);
      
      if (result.rows.length > 0) {
        const summary = result.rows[0];
        
        // Get individual reviews
        const reviewsResult = await client.query(`
          SELECT * FROM individual_reviews 
          WHERE summary_id = $1
          ORDER BY rating DESC, review_date DESC
        `, [summary.id]);
        
        return {
          ...JSON.parse(summary.raw_data),
          cached: true,
          cacheAge: Date.now() - new Date(summary.last_updated).getTime()
        };
      }
      
      return null; // No cached data found
      
    } finally {
      client.release();
    }
  }

  async getPopularQueries(category = null, limit = 10) {
    const client = await this.pool.connect();
    
    try {
      const query = category 
        ? 'SELECT query_text, category, COUNT(*) as frequency FROM query_history WHERE category = $1 GROUP BY query_text, category ORDER BY frequency DESC LIMIT $2'
        : 'SELECT query_text, category, COUNT(*) as frequency FROM query_history GROUP BY query_text, category ORDER BY frequency DESC LIMIT $1';
      
      const params = category ? [category, limit] : [limit];
      const result = await client.query(query, params);
      
      return result.rows;
      
    } finally {
      client.release();
    }
  }

  async getTrendingTopics(days = 7) {
    const client = await this.pool.connect();
    
    try {
      const result = await client.query(`
        SELECT 
          category,
          query_text,
          COUNT(*) as query_count,
          AVG(CASE WHEN analysis_result->>'frown_rating' IS NOT NULL 
              THEN (analysis_result->>'frown_rating')::float 
              ELSE NULL END) as avg_frown_rating
        FROM query_history 
        WHERE created_at > NOW() - INTERVAL '${days} days'
        GROUP BY category, query_text
        HAVING COUNT(*) >= 3
        ORDER BY query_count DESC, avg_frown_rating DESC
        LIMIT 20
      `);
      
      return result.rows;
      
    } finally {
      client.release();
    }
  }

  async cleanupOldData() {
    const client = await this.pool.connect();
    
    try {
      // Remove review summaries older than 30 days
      await client.query(`
        DELETE FROM review_summaries 
        WHERE last_updated < NOW() - INTERVAL '30 days'
      `);
      
      // Remove individual reviews for deleted summaries
      await client.query(`
        DELETE FROM individual_reviews 
        WHERE summary_id NOT IN (SELECT id FROM review_summaries)
      `);
      
      console.log('Knowledge base cleanup completed');
      
    } finally {
      client.release();
    }
  }
}

module.exports = KnowledgeBase;