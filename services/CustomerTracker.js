// TUC.rr Customer Usage Tracking Service
// Comprehensive tracking for subscription management and analytics
const { Pool } = require('pg');

class CustomerTracker {
  constructor() {
    this.pool = new Pool({ 
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });
  }

  async trackQuery(userId, queryData) {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Update subscription usage
      await client.query(`
        UPDATE subscriptions 
        SET queries_used_current_period = queries_used_current_period + 1,
            last_usage_reset = CASE 
              WHEN current_period_end < NOW() THEN NOW()
              ELSE last_usage_reset 
            END,
            usage_history = usage_history || $1::jsonb
        WHERE user_id = $2 AND status = 'active'
      `, [
        JSON.stringify({
          timestamp: new Date().toISOString(),
          query: queryData.query,
          category: queryData.category,
          sources_used: queryData.sources_used,
          response_time_ms: queryData.response_time_ms
        }),
        userId
      ]);
      
      // Track feature usage
      await client.query(`
        INSERT INTO feature_usage (
          user_id, customer_id, feature_name, feature_category,
          action_taken, load_time_ms, success
        ) VALUES ($1, $2, 'review_analysis', $3, 'query_executed', $4, $5)
      `, [
        userId,
        queryData.customer_id,
        queryData.category,
        queryData.response_time_ms,
        queryData.success
      ]);
      
      await client.query('COMMIT');
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async getUsageStats(userId, period = '30 days') {
    const client = await this.pool.connect();
    
    try {
      const result = await client.query(`
        SELECT 
          s.tier,
          s.monthly_query_limit,
          s.queries_used_current_period,
          s.current_period_end,
          COUNT(qh.id) as total_historical_queries,
          AVG(qh.response_time_ms) as avg_response_time,
          COUNT(DISTINCT qh.category) as categories_used,
          array_agg(DISTINCT qh.category) as preferred_categories
        FROM subscriptions s
        LEFT JOIN query_history qh ON s.user_id = qh.user_id 
          AND qh.created_at > NOW() - INTERVAL '${period}'
        WHERE s.user_id = $1 AND s.status = 'active'
        GROUP BY s.id, s.tier, s.monthly_query_limit, s.queries_used_current_period, s.current_period_end
      `, [userId]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      const stats = result.rows[0];
      
      // Calculate usage patterns
      const usagePatterns = await this.getUsagePatterns(userId, client);
      
      return {
        subscription: {
          tier: stats.tier,
          monthly_limit: stats.monthly_query_limit,
          used_this_period: stats.queries_used_current_period,
          remaining: stats.monthly_query_limit - stats.queries_used_current_period,
          period_ends: stats.current_period_end,
          usage_percentage: Math.round((stats.queries_used_current_period / stats.monthly_query_limit) * 100)
        },
        analytics: {
          total_queries: parseInt(stats.total_historical_queries) || 0,
          avg_response_time: Math.round(stats.avg_response_time) || 0,
          categories_explored: parseInt(stats.categories_used) || 0,
          preferred_categories: stats.preferred_categories || []
        },
        patterns: usagePatterns
      };
      
    } finally {
      client.release();
    }
  }

  async getUsagePatterns(userId, client) {
    // Daily usage pattern
    const dailyPattern = await client.query(`
      SELECT 
        EXTRACT(hour FROM created_at) as hour,
        COUNT(*) as query_count
      FROM query_history 
      WHERE user_id = $1 AND created_at > NOW() - INTERVAL '30 days'
      GROUP BY EXTRACT(hour FROM created_at)
      ORDER BY hour
    `, [userId]);
    
    // Weekly usage pattern
    const weeklyPattern = await client.query(`
      SELECT 
        EXTRACT(dow FROM created_at) as day_of_week,
        COUNT(*) as query_count
      FROM query_history 
      WHERE user_id = $1 AND created_at > NOW() - INTERVAL '30 days'
      GROUP BY EXTRACT(dow FROM created_at)
      ORDER BY day_of_week
    `, [userId]);
    
    // Category preferences over time
    const categoryTrends = await client.query(`
      SELECT 
        category,
        DATE_TRUNC('week', created_at) as week,
        COUNT(*) as query_count
      FROM query_history 
      WHERE user_id = $1 AND created_at > NOW() - INTERVAL '12 weeks'
      GROUP BY category, DATE_TRUNC('week', created_at)
      ORDER BY week DESC, query_count DESC
    `, [userId]);
    
    return {
      hourly_usage: dailyPattern.rows,
      weekly_usage: weeklyPattern.rows,
      category_trends: categoryTrends.rows
    };
  }

  async checkUsageLimits(userId) {
    const client = await this.pool.connect();
    
    try {
      const result = await client.query(`
        SELECT 
          tier,
          monthly_query_limit,
          queries_used_current_period,
          current_period_end,
          (queries_used_current_period >= monthly_query_limit) as limit_exceeded,
          (queries_used_current_period >= monthly_query_limit * 0.8) as approaching_limit
        FROM subscriptions 
        WHERE user_id = $1 AND status = 'active'
      `, [userId]);
      
      if (result.rows.length === 0) {
        return { error: 'No active subscription found' };
      }
      
      const subscription = result.rows[0];
      
      return {
        tier: subscription.tier,
        limit_exceeded: subscription.limit_exceeded,
        approaching_limit: subscription.approaching_limit,
        remaining_queries: subscription.monthly_query_limit - subscription.queries_used_current_period,
        reset_date: subscription.current_period_end
      };
      
    } finally {
      client.release();
    }
  }

  async logFeatureUsage(userId, customerId, feature, category, success = true, metadata = {}) {
    const client = await this.pool.connect();
    
    try {
      await client.query(`
        INSERT INTO feature_usage (
          user_id, customer_id, feature_name, feature_category,
          action_taken, success, load_time_ms, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      `, [
        userId,
        customerId,
        feature,
        category,
        metadata.action || 'feature_used',
        success,
        metadata.load_time_ms || 0
      ]);
      
    } finally {
      client.release();
    }
  }

  async getCustomerInsights(userId) {
    const client = await this.pool.connect();
    
    try {
      // Get comprehensive customer insights
      const insights = await client.query(`
        SELECT 
          u.customer_id,
          u.created_at as customer_since,
          s.tier as current_tier,
          cp.query_count as total_queries,
          cp.preferred_categories,
          COUNT(qh.id) as queries_last_30_days,
          AVG(qh.satisfaction_rating) as avg_satisfaction,
          COUNT(CASE WHEN qh.satisfaction_rating >= 4 THEN 1 END) as positive_feedback_count,
          MAX(qh.created_at) as last_query_date
        FROM users u
        LEFT JOIN subscriptions s ON u.id = s.user_id AND s.status = 'active'
        LEFT JOIN customer_profiles cp ON u.id = cp.user_id
        LEFT JOIN query_history qh ON u.id = qh.user_id AND qh.created_at > NOW() - INTERVAL '30 days'
        WHERE u.id = $1
        GROUP BY u.id, u.customer_id, u.created_at, s.tier, cp.query_count, cp.preferred_categories
      `, [userId]);
      
      if (insights.rows.length === 0) {
        return null;
      }
      
      const customer = insights.rows[0];
      
      // Calculate customer health score
      const healthScore = this.calculateCustomerHealthScore(customer);
      
      return {
        customer_id: customer.customer_id,
        customer_since: customer.customer_since,
        current_tier: customer.current_tier,
        total_queries: customer.total_queries || 0,
        recent_activity: customer.queries_last_30_days || 0,
        satisfaction_score: parseFloat(customer.avg_satisfaction) || null,
        positive_feedback_ratio: customer.queries_last_30_days > 0 
          ? Math.round((customer.positive_feedback_count / customer.queries_last_30_days) * 100)
          : null,
        last_active: customer.last_query_date,
        preferred_categories: customer.preferred_categories || [],
        health_score: healthScore,
        engagement_level: this.getEngagementLevel(customer)
      };
      
    } finally {
      client.release();
    }
  }

  calculateCustomerHealthScore(customer) {
    let score = 50; // Base score
    
    // Recent activity boost
    if (customer.queries_last_30_days > 0) score += 20;
    if (customer.queries_last_30_days > 5) score += 10;
    
    // Satisfaction boost
    if (customer.avg_satisfaction >= 4) score += 15;
    else if (customer.avg_satisfaction >= 3) score += 5;
    
    // Subscription tier boost
    if (customer.current_tier === 'enterprise') score += 10;
    else if (customer.current_tier === 'professional') score += 5;
    
    // Longevity boost
    const daysSinceSignup = (Date.now() - new Date(customer.customer_since)) / (1000 * 60 * 60 * 24);
    if (daysSinceSignup > 30) score += 5;
    if (daysSinceSignup > 90) score += 5;
    
    return Math.min(100, Math.max(0, score));
  }

  getEngagementLevel(customer) {
    const recentQueries = customer.queries_last_30_days || 0;
    
    if (recentQueries === 0) return 'inactive';
    if (recentQueries <= 2) return 'low';
    if (recentQueries <= 10) return 'moderate';
    if (recentQueries <= 25) return 'high';
    return 'power_user';
  }

  async generateUsageReport(userId, startDate, endDate) {
    const client = await this.pool.connect();
    
    try {
      const report = await client.query(`
        SELECT 
          DATE_TRUNC('day', qh.created_at) as date,
          COUNT(*) as queries,
          AVG(qh.response_time_ms) as avg_response_time,
          COUNT(DISTINCT qh.category) as categories_used,
          AVG(qh.satisfaction_rating) as avg_satisfaction
        FROM query_history qh
        WHERE qh.user_id = $1 
          AND qh.created_at >= $2 
          AND qh.created_at <= $3
        GROUP BY DATE_TRUNC('day', qh.created_at)
        ORDER BY date
      `, [userId, startDate, endDate]);
      
      return {
        period: { start: startDate, end: endDate },
        daily_usage: report.rows,
        summary: {
          total_queries: report.rows.reduce((sum, day) => sum + parseInt(day.queries), 0),
          avg_daily_queries: report.rows.length > 0 
            ? Math.round(report.rows.reduce((sum, day) => sum + parseInt(day.queries), 0) / report.rows.length)
            : 0,
          avg_response_time: report.rows.length > 0
            ? Math.round(report.rows.reduce((sum, day) => sum + parseFloat(day.avg_response_time || 0), 0) / report.rows.length)
            : 0
        }
      };
      
    } finally {
      client.release();
    }
  }
}

module.exports = CustomerTracker;