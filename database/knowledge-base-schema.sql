-- TUC.rr Knowledge Base Schema Extensions
-- Additional tables for review data storage and intent tracking

-- Review summaries table for caching aggregated data
CREATE TABLE IF NOT EXISTS review_summaries (
    id SERIAL PRIMARY KEY,
    query_text VARCHAR(500) NOT NULL,
    category VARCHAR(100) NOT NULL,
    total_reviews INTEGER DEFAULT 0,
    avg_rating DECIMAL(3,1),
    frown_rating DECIMAL(3,1),
    sources JSONB DEFAULT '[]'::jsonb,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    raw_data JSONB,
    cache_hits INTEGER DEFAULT 0,
    
    -- Performance indexes
    UNIQUE(query_text, category)
);

-- Individual reviews storage
CREATE TABLE IF NOT EXISTS individual_reviews (
    id SERIAL PRIMARY KEY,
    summary_id INTEGER REFERENCES review_summaries(id) ON DELETE CASCADE,
    source VARCHAR(50) NOT NULL,
    rating DECIMAL(2,1) NOT NULL,
    review_text TEXT,
    author VARCHAR(255),
    review_date TIMESTAMP,
    verified BOOLEAN DEFAULT FALSE,
    sentiment_score DECIMAL(3,2),
    
    -- Indexes for performance
    INDEX(summary_id),
    INDEX(source),
    INDEX(rating)
);

-- Intent classification tracking
CREATE TABLE IF NOT EXISTS intent_classifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    query_text TEXT NOT NULL,
    category VARCHAR(100),
    primary_intent VARCHAR(100),
    confidence_score DECIMAL(3,2),
    recommended_sources JSONB,
    actual_sources_used JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Performance tracking
    response_quality_score INTEGER CHECK (response_quality_score BETWEEN 1 AND 5),
    user_satisfaction BOOLEAN,
    
    INDEX(user_id),
    INDEX(primary_intent),
    INDEX(created_at)
);

-- Review source performance tracking
CREATE TABLE IF NOT EXISTS source_performance (
    id SERIAL PRIMARY KEY,
    source_name VARCHAR(50) NOT NULL,
    category VARCHAR(100),
    success_rate DECIMAL(5,2) DEFAULT 0.00,
    avg_response_time_ms INTEGER DEFAULT 0,
    total_requests INTEGER DEFAULT 0,
    successful_requests INTEGER DEFAULT 0,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(source_name, category)
);

-- Customer personality tracking for response variation
CREATE TABLE IF NOT EXISTS personality_tracking (
    id SERIAL PRIMARY KEY,
    customer_id VARCHAR(100) NOT NULL,
    response_type VARCHAR(50) NOT NULL,
    used_variations JSONB DEFAULT '[]'::jsonb,
    last_reset TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    total_interactions INTEGER DEFAULT 0,
    
    UNIQUE(customer_id, response_type)
);

-- Trending topics and popular queries
CREATE TABLE IF NOT EXISTS trending_analysis (
    id SERIAL PRIMARY KEY,
    query_text VARCHAR(500),
    category VARCHAR(100),
    trend_score DECIMAL(5,2) DEFAULT 0.00,
    query_frequency INTEGER DEFAULT 0,
    avg_frown_rating DECIMAL(3,1),
    time_period VARCHAR(20), -- 'daily', 'weekly', 'monthly'
    analysis_date DATE DEFAULT CURRENT_DATE,
    
    UNIQUE(query_text, category, time_period, analysis_date)
);

-- Create indexes for performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_review_summaries_query_category ON review_summaries(query_text, category);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_review_summaries_updated ON review_summaries(last_updated);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_individual_reviews_summary ON individual_reviews(summary_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_individual_reviews_rating ON individual_reviews(rating DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_intent_classifications_user ON intent_classifications(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_intent_classifications_intent ON intent_classifications(primary_intent);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_source_performance_source ON source_performance(source_name);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_personality_tracking_customer ON personality_tracking(customer_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_trending_analysis_score ON trending_analysis(trend_score DESC);

-- Views for analytics and reporting
CREATE OR REPLACE VIEW v_review_cache_performance AS
SELECT 
    rs.category,
    COUNT(*) as total_cached_queries,
    AVG(rs.cache_hits) as avg_cache_hits,
    AVG(EXTRACT(EPOCH FROM (NOW() - rs.last_updated))/3600) as avg_age_hours,
    COUNT(*) FILTER (WHERE rs.last_updated > NOW() - INTERVAL '24 hours') as fresh_cache_count
FROM review_summaries rs
GROUP BY rs.category;

CREATE OR REPLACE VIEW v_intent_accuracy AS
SELECT 
    ic.primary_intent,
    ic.category,
    COUNT(*) as total_classifications,
    AVG(ic.confidence_score) as avg_confidence,
    COUNT(*) FILTER (WHERE ic.response_quality_score >= 4) as high_quality_responses,
    COUNT(*) FILTER (WHERE ic.user_satisfaction = true) as satisfied_users
FROM intent_classifications ic
WHERE ic.created_at > NOW() - INTERVAL '30 days'
GROUP BY ic.primary_intent, ic.category;

CREATE OR REPLACE VIEW v_source_reliability AS
SELECT 
    sp.source_name,
    sp.category,
    sp.success_rate,
    sp.avg_response_time_ms,
    sp.total_requests,
    CASE 
        WHEN sp.success_rate >= 90 AND sp.avg_response_time_ms <= 5000 THEN 'excellent'
        WHEN sp.success_rate >= 75 AND sp.avg_response_time_ms <= 10000 THEN 'good'
        WHEN sp.success_rate >= 50 THEN 'fair'
        ELSE 'poor'
    END as reliability_rating
FROM source_performance sp
ORDER BY sp.success_rate DESC, sp.avg_response_time_ms ASC;

-- Functions for data management
CREATE OR REPLACE FUNCTION update_source_performance(
    p_source_name VARCHAR(50),
    p_category VARCHAR(100),
    p_success BOOLEAN,
    p_response_time_ms INTEGER
) RETURNS VOID AS $$
BEGIN
    INSERT INTO source_performance (
        source_name, category, success_rate, avg_response_time_ms, 
        total_requests, successful_requests
    ) VALUES (
        p_source_name, p_category, 
        CASE WHEN p_success THEN 100.00 ELSE 0.00 END,
        p_response_time_ms, 1,
        CASE WHEN p_success THEN 1 ELSE 0 END
    )
    ON CONFLICT (source_name, category) DO UPDATE SET
        total_requests = source_performance.total_requests + 1,
        successful_requests = source_performance.successful_requests + 
            CASE WHEN p_success THEN 1 ELSE 0 END,
        success_rate = (
            (source_performance.successful_requests + CASE WHEN p_success THEN 1 ELSE 0 END)::DECIMAL 
            / (source_performance.total_requests + 1)::DECIMAL * 100
        ),
        avg_response_time_ms = (
            (source_performance.avg_response_time_ms * source_performance.total_requests + p_response_time_ms)
            / (source_performance.total_requests + 1)
        ),
        last_updated = NOW();
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION calculate_trending_topics() RETURNS VOID AS $$
BEGIN
    -- Daily trending topics
    INSERT INTO trending_analysis (
        query_text, category, trend_score, query_frequency, 
        avg_frown_rating, time_period, analysis_date
    )
    SELECT 
        qh.query_text,
        qh.category,
        (COUNT(*) * 10 + AVG(COALESCE((qh.analysis_result->>'frown_rating')::DECIMAL, 2.5))) as trend_score,
        COUNT(*) as query_frequency,
        AVG(COALESCE((qh.analysis_result->>'frown_rating')::DECIMAL, 2.5)) as avg_frown_rating,
        'daily',
        CURRENT_DATE
    FROM query_history qh
    WHERE qh.created_at >= CURRENT_DATE - INTERVAL '1 day'
    GROUP BY qh.query_text, qh.category
    HAVING COUNT(*) >= 2
    ON CONFLICT (query_text, category, time_period, analysis_date) DO UPDATE SET
        trend_score = EXCLUDED.trend_score,
        query_frequency = EXCLUDED.query_frequency,
        avg_frown_rating = EXCLUDED.avg_frown_rating;
        
    -- Weekly trending topics
    INSERT INTO trending_analysis (
        query_text, category, trend_score, query_frequency, 
        avg_frown_rating, time_period, analysis_date
    )
    SELECT 
        qh.query_text,
        qh.category,
        (COUNT(*) * 5 + AVG(COALESCE((qh.analysis_result->>'frown_rating')::DECIMAL, 2.5))) as trend_score,
        COUNT(*) as query_frequency,
        AVG(COALESCE((qh.analysis_result->>'frown_rating')::DECIMAL, 2.5)) as avg_frown_rating,
        'weekly',
        CURRENT_DATE
    FROM query_history qh
    WHERE qh.created_at >= CURRENT_DATE - INTERVAL '7 days'
    GROUP BY qh.query_text, qh.category
    HAVING COUNT(*) >= 3
    ON CONFLICT (query_text, category, time_period, analysis_date) DO UPDATE SET
        trend_score = EXCLUDED.trend_score,
        query_frequency = EXCLUDED.query_frequency,
        avg_frown_rating = EXCLUDED.avg_frown_rating;
END;
$$ LANGUAGE plpgsql;