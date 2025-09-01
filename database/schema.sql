-- TUC.rr Reviews Retriever Database Schema
-- Legal Production Database Design
-- Compliant with GDPR, CCPA, and PCI DSS Requirements
-- Copyright 2025 - 2882 LLC

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Users table for authentication and basic account management
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    customer_id VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP,
    email_verified BOOLEAN DEFAULT FALSE,
    email_verification_token VARCHAR(255),
    email_verification_expires TIMESTAMP,
    
    -- Legal compliance fields
    terms_accepted_version VARCHAR(50),
    terms_accepted_at TIMESTAMP,
    privacy_consent BOOLEAN DEFAULT FALSE,
    privacy_consent_at TIMESTAMP,
    marketing_consent BOOLEAN DEFAULT FALSE,
    marketing_consent_at TIMESTAMP,
    
    -- GDPR compliance
    data_retention_preference VARCHAR(50) DEFAULT 'standard',
    gdpr_export_requests INTEGER DEFAULT 0,
    last_gdpr_export TIMESTAMP,
    deletion_requested BOOLEAN DEFAULT FALSE,
    deletion_scheduled_date TIMESTAMP,
    deletion_reason TEXT,
    
    -- Account management
    account_status VARCHAR(50) DEFAULT 'active',
    last_password_change TIMESTAMP,
    failed_login_attempts INTEGER DEFAULT 0,
    account_locked_until TIMESTAMP,
    
    -- Audit trail
    created_by VARCHAR(100),
    updated_by VARCHAR(100),
    
    -- Constraints
    CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    CONSTRAINT valid_account_status CHECK (account_status IN ('active', 'inactive', 'suspended', 'deleted')),
    CONSTRAINT valid_retention_preference CHECK (data_retention_preference IN ('minimal', 'standard', 'extended'))
);

-- Customer profiles for personalization and preference tracking
CREATE TABLE IF NOT EXISTS customer_profiles (
    id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    query_count INTEGER DEFAULT 0,
    preferred_categories TEXT[], 
    search_history JSONB DEFAULT '[]'::jsonb,
    recommendation_preferences JSONB DEFAULT '{}'::jsonb,
    location_preference VARCHAR(100),
    language_preference VARCHAR(10) DEFAULT 'en-US',
    timezone_preference VARCHAR(50),
    
    -- Personalization metrics
    satisfaction_scores JSONB DEFAULT '[]'::jsonb,
    interaction_patterns JSONB DEFAULT '{}'::jsonb,
    favorite_queries JSONB DEFAULT '[]'::jsonb,
    blocked_categories TEXT[] DEFAULT '{}',
    
    -- Privacy settings
    share_data_for_improvement BOOLEAN DEFAULT TRUE,
    receive_personalized_recommendations BOOLEAN DEFAULT TRUE,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_activity TIMESTAMP,
    
    -- GDPR compliance
    data_minimization_applied BOOLEAN DEFAULT TRUE,
    retention_period_days INTEGER DEFAULT 365,
    last_data_review TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Subscription management with legal compliance
CREATE TABLE IF NOT EXISTS subscriptions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    
    -- Stripe integration
    stripe_customer_id VARCHAR(255),
    stripe_subscription_id VARCHAR(255) UNIQUE,
    stripe_price_id VARCHAR(255),
    
    -- Subscription details
    tier VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL,
    current_period_start TIMESTAMP NOT NULL,
    current_period_end TIMESTAMP NOT NULL,
    cancel_at_period_end BOOLEAN DEFAULT FALSE,
    cancelled_at TIMESTAMP,
    cancellation_reason TEXT,
    cancellation_feedback JSONB,
    
    -- Trial management
    trial_start TIMESTAMP,
    trial_end TIMESTAMP,
    trial_used BOOLEAN DEFAULT FALSE,
    
    -- Usage tracking for legal compliance
    monthly_query_limit INTEGER NOT NULL,
    queries_used_current_period INTEGER DEFAULT 0,
    last_usage_reset TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    usage_history JSONB DEFAULT '[]'::jsonb,
    
    -- Billing compliance
    billing_cycle_anchor TIMESTAMP,
    proration_behavior VARCHAR(50) DEFAULT 'create_prorations',
    collection_method VARCHAR(50) DEFAULT 'charge_automatically',
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Legal audit trail
    subscription_changes JSONB DEFAULT '[]'::jsonb,
    upgrade_history JSONB DEFAULT '[]'::jsonb,
    downgrade_history JSONB DEFAULT '[]'::jsonb,
    
    -- Constraints
    CONSTRAINT valid_tier CHECK (tier IN ('free', 'professional', 'enterprise', 'custom')),
    CONSTRAINT valid_status CHECK (status IN ('active', 'cancelled', 'past_due', 'unpaid', 'paused', 'trialing')),
    CONSTRAINT valid_collection_method CHECK (collection_method IN ('charge_automatically', 'send_invoice'))
);

-- Query history for personalization and usage tracking
CREATE TABLE IF NOT EXISTS query_history (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    subscription_id INTEGER REFERENCES subscriptions(id) ON DELETE SET NULL,
    customer_id VARCHAR(100) NOT NULL,
    
    -- Query details
    query_text TEXT NOT NULL,
    category VARCHAR(100) NOT NULL,
    subcategory VARCHAR(100),
    query_intent VARCHAR(100),
    
    -- Analysis results
    analysis_result JSONB,
    frown_rating DECIMAL(3,1),
    options_provided INTEGER,
    user_selected_option INTEGER,
    
    -- Performance metrics
    response_time_ms INTEGER,
    tokens_used INTEGER,
    api_cost_cents INTEGER,
    
    -- User feedback
    satisfaction_rating INTEGER CHECK (satisfaction_rating BETWEEN 1 AND 5),
    user_feedback TEXT,
    feedback_timestamp TIMESTAMP,
    helpful_rating BOOLEAN,
    
    -- Legal compliance metadata
    data_retention_category VARCHAR(50) DEFAULT 'functional',
    legal_basis VARCHAR(50) DEFAULT 'contract',
    anonymization_applied BOOLEAN DEFAULT FALSE,
    anonymized_at TIMESTAMP,
    
    -- Geographic and context data
    user_location VARCHAR(100),
    session_id VARCHAR(255),
    user_agent TEXT,
    ip_address INET,
    referrer_url TEXT,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP,
    
    -- Constraints
    CONSTRAINT valid_retention_category CHECK (data_retention_category IN ('functional', 'analytics', 'marketing', 'legal')),
    CONSTRAINT valid_legal_basis CHECK (legal_basis IN ('consent', 'contract', 'legitimate_interest', 'legal_obligation'))
);

-- Payment history for financial and legal compliance
CREATE TABLE IF NOT EXISTS payment_history (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    subscription_id INTEGER REFERENCES subscriptions(id) ON DELETE SET NULL,
    
    -- Stripe integration
    stripe_payment_intent_id VARCHAR(255),
    stripe_invoice_id VARCHAR(255),
    stripe_charge_id VARCHAR(255),
    stripe_customer_id VARCHAR(255),
    
    -- Payment details
    amount_cents INTEGER NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    status VARCHAR(50) NOT NULL,
    payment_method VARCHAR(100),
    payment_method_details JSONB,
    
    -- Financial compliance
    tax_amount_cents INTEGER DEFAULT 0,
    tax_rate DECIMAL(5,4),
    tax_details JSONB,
    gross_amount_cents INTEGER,
    net_amount_cents INTEGER,
    fee_amount_cents INTEGER DEFAULT 0,
    
    -- Invoice and receipt data
    invoice_url TEXT,
    receipt_url TEXT,
    invoice_number VARCHAR(100),
    
    -- Refunds and disputes
    refund_amount_cents INTEGER DEFAULT 0,
    refunded_at TIMESTAMP,
    refund_reason TEXT,
    dispute_status VARCHAR(50),
    dispute_reason TEXT,
    
    -- Failure handling
    failure_reason TEXT,
    failure_code VARCHAR(100),
    failure_message TEXT,
    retry_count INTEGER DEFAULT 0,
    
    -- Fraud prevention
    risk_score DECIMAL(3,2),
    risk_factors JSONB,
    fraud_details JSONB,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    payment_date TIMESTAMP,
    due_date TIMESTAMP,
    
    -- Constraints
    CONSTRAINT valid_status CHECK (status IN ('pending', 'succeeded', 'failed', 'cancelled', 'refunded', 'disputed')),
    CONSTRAINT valid_currency CHECK (currency IN ('USD', 'EUR', 'GBP', 'CAD', 'AUD')),
    CONSTRAINT positive_amount CHECK (amount_cents >= 0)
);

-- Legal audit log for compliance tracking
CREATE TABLE IF NOT EXISTS audit_log (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    
    -- Action details
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(100),
    resource_id VARCHAR(100),
    old_values JSONB,
    new_values JSONB,
    
    -- Context information
    ip_address INET,
    user_agent TEXT,
    session_id VARCHAR(255),
    api_endpoint VARCHAR(255),
    http_method VARCHAR(10),
    request_headers JSONB,
    
    -- Legal compliance metadata
    legal_basis VARCHAR(100),
    data_subject_rights JSONB,
    retention_policy VARCHAR(100),
    processing_purpose VARCHAR(255),
    
    -- Additional context
    success BOOLEAN DEFAULT TRUE,
    error_message TEXT,
    execution_time_ms INTEGER,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT valid_legal_basis CHECK (legal_basis IN ('consent', 'contract', 'legitimate_interest', 'legal_obligation', 'vital_interests', 'public_task')),
    CONSTRAINT valid_http_method CHECK (http_method IN ('GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'))
);

-- GDPR compliance table for data subject rights
CREATE TABLE IF NOT EXISTS gdpr_requests (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    
    -- Request details
    request_type VARCHAR(50) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    priority VARCHAR(20) DEFAULT 'normal',
    
    -- Request content
    request_details JSONB,
    data_categories TEXT[],
    time_period_start DATE,
    time_period_end DATE,
    
    -- Processing information
    processing_notes TEXT,
    response_data JSONB,
    response_format VARCHAR(50) DEFAULT 'json',
    delivery_method VARCHAR(50) DEFAULT 'email',
    
    -- Legal compliance tracking
    legal_basis_verification BOOLEAN DEFAULT FALSE,
    identity_verification BOOLEAN DEFAULT FALSE,
    identity_verification_method VARCHAR(100),
    third_party_notifications JSONB,
    
    -- Timestamps
    requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    acknowledged_at TIMESTAMP,
    processing_started_at TIMESTAMP,
    processed_at TIMESTAMP,
    completed_at TIMESTAMP,
    
    -- Processing metadata
    processed_by VARCHAR(100),
    processing_duration_hours INTEGER,
    complexity_score INTEGER CHECK (complexity_score BETWEEN 1 AND 10),
    
    -- Communication
    communications JSONB DEFAULT '[]'::jsonb,
    user_notification_sent BOOLEAN DEFAULT FALSE,
    user_notification_sent_at TIMESTAMP,
    
    -- Constraints
    CONSTRAINT valid_request_type CHECK (request_type IN ('access', 'rectification', 'erasure', 'portability', 'restriction', 'objection', 'automated_decision_making')),
    CONSTRAINT valid_status CHECK (status IN ('pending', 'acknowledged', 'processing', 'completed', 'rejected', 'partially_fulfilled')),
    CONSTRAINT valid_priority CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    CONSTRAINT valid_response_format CHECK (response_format IN ('json', 'csv', 'pdf', 'xml'))
);

-- Feature usage tracking for product development and compliance
CREATE TABLE IF NOT EXISTS feature_usage (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    customer_id VARCHAR(100),
    
    -- Feature details
    feature_name VARCHAR(100) NOT NULL,
    feature_category VARCHAR(50),
    action_taken VARCHAR(100),
    
    -- Usage context
    page_url TEXT,
    referrer_url TEXT,
    session_id VARCHAR(255),
    
    -- Performance data
    load_time_ms INTEGER,
    interaction_time_ms INTEGER,
    success BOOLEAN DEFAULT TRUE,
    error_message TEXT,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT valid_feature_category CHECK (feature_category IN ('analysis', 'subscription', 'profile', 'compliance', 'support'))
);

-- Email notifications and communication log
CREATE TABLE IF NOT EXISTS email_communications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    
    -- Email details
    email_type VARCHAR(100) NOT NULL,
    recipient_email VARCHAR(255) NOT NULL,
    subject VARCHAR(500),
    
    -- Content
    template_name VARCHAR(100),
    template_version VARCHAR(20),
    personalization_data JSONB,
    
    -- Delivery tracking
    status VARCHAR(50) DEFAULT 'pending',
    sent_at TIMESTAMP,
    delivered_at TIMESTAMP,
    opened_at TIMESTAMP,
    clicked_at TIMESTAMP,
    bounced_at TIMESTAMP,
    complained_at TIMESTAMP,
    
    -- Provider data
    provider_message_id VARCHAR(255),
    provider_response JSONB,
    
    -- Legal compliance
    consent_basis VARCHAR(100),
    unsubscribe_link TEXT,
    privacy_policy_version VARCHAR(20),
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT valid_email_type CHECK (email_type IN ('welcome', 'verification', 'password_reset', 'subscription_change', 'payment_success', 'payment_failed', 'gdpr_response', 'cancellation_confirmation', 'marketing', 'transactional')),
    CONSTRAINT valid_status CHECK (status IN ('pending', 'sent', 'delivered', 'opened', 'clicked', 'bounced', 'complained', 'failed')),
    CONSTRAINT valid_consent_basis CHECK (consent_basis IN ('explicit_consent', 'transactional', 'legitimate_interest'))
);

-- Create indexes for performance optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_customer_id ON users(customer_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_created_at ON users(created_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_account_status ON users(account_status);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_customer_profiles_user_id ON customer_profiles(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_customer_profiles_updated_at ON customer_profiles(updated_at);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_subscriptions_stripe_id ON subscriptions(stripe_subscription_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_subscriptions_tier ON subscriptions(tier);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_query_history_user_id ON query_history(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_query_history_customer_id ON query_history(customer_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_query_history_created_at ON query_history(created_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_query_history_category ON query_history(category);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_query_history_session ON query_history(session_id, created_at);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payment_history_user_id ON payment_history(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payment_history_status ON payment_history(status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payment_history_created_at ON payment_history(created_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payment_history_stripe_invoice ON payment_history(stripe_invoice_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_log_action ON audit_log(action);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_log_resource ON audit_log(resource_type, resource_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_gdpr_requests_user_id ON gdpr_requests(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_gdpr_requests_status ON gdpr_requests(status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_gdpr_requests_type ON gdpr_requests(request_type);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_gdpr_requests_requested_at ON gdpr_requests(requested_at);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_feature_usage_user_id ON feature_usage(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_feature_usage_feature ON feature_usage(feature_name);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_feature_usage_created_at ON feature_usage(created_at);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_email_communications_user_id ON email_communications(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_email_communications_type ON email_communications(email_type);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_email_communications_status ON email_communications(status);

-- Create views for common queries and compliance reporting
CREATE OR REPLACE VIEW v_active_subscriptions AS
SELECT 
    s.*,
    u.email,
    u.customer_id,
    u.created_at as user_created_at,
    (s.queries_used_current_period::FLOAT / s.monthly_query_limit::FLOAT) * 100 as usage_percentage,
    (s.current_period_end - CURRENT_TIMESTAMP) as time_until_renewal
FROM subscriptions s
JOIN users u ON s.user_id = u.id
WHERE s.status = 'active'
AND u.account_status = 'active';

CREATE OR REPLACE VIEW v_subscription_analytics AS
SELECT 
    s.tier,
    s.status,
    COUNT(*) as subscription_count,
    AVG(s.queries_used_current_period) as avg_queries_used,
    AVG(s.queries_used_current_period::FLOAT / s.monthly_query_limit::FLOAT * 100) as avg_usage_percentage,
    SUM(CASE WHEN s.cancel_at_period_end THEN 1 ELSE 0 END) as pending_cancellations
FROM subscriptions s
JOIN users u ON s.user_id = u.id
WHERE u.account_status = 'active'
GROUP BY s.tier, s.status;

CREATE OR REPLACE VIEW v_gdpr_compliance_status AS
SELECT 
    u.id as user_id,
    u.email,
    u.customer_id,
    u.created_at,
    u.deletion_requested,
    u.deletion_scheduled_date,
    CASE 
        WHEN u.deletion_requested THEN 'deletion_requested'
        WHEN COUNT(gr.id) FILTER (WHERE gr.status IN ('pending', 'processing')) > 0 THEN 'requests_pending'
        WHEN COUNT(gr.id) FILTER (WHERE gr.status = 'completed') > 0 THEN 'requests_fulfilled'
        ELSE 'compliant'
    END as gdpr_status,
    COUNT(gr.id) FILTER (WHERE gr.status IN ('pending', 'processing')) as pending_requests,
    COUNT(gr.id) FILTER (WHERE gr.status = 'completed') as completed_requests,
    MAX(gr.requested_at) as last_request_date,
    MAX(gr.completed_at) as last_completion_date
FROM users u
LEFT JOIN gdpr_requests gr ON u.id = gr.user_id
WHERE u.account_status != 'deleted'
GROUP BY u.id, u.email, u.customer_id, u.created_at, u.deletion_requested, u.deletion_scheduled_date;

CREATE OR REPLACE VIEW v_query_analytics AS
SELECT 
    DATE_TRUNC('day', qh.created_at) as query_date,
    qh.category,
    COUNT(*) as query_count,
    AVG(qh.response_time_ms) as avg_response_time,
    AVG(qh.satisfaction_rating) FILTER (WHERE qh.satisfaction_rating IS NOT NULL) as avg_satisfaction,
    COUNT(*) FILTER (WHERE qh.satisfaction_rating >= 4) as positive_feedback_count,
    COUNT(*) FILTER (WHERE qh.satisfaction_rating <= 2) as negative_feedback_count
FROM query_history qh
JOIN users u ON qh.user_id = u.id
WHERE u.account_status = 'active'
AND qh.created_at >= CURRENT_DATE - INTERVAL '90 days'
GROUP BY DATE_TRUNC('day', qh.created_at), qh.category
ORDER BY query_date DESC;

-- Data retention and cleanup functions for GDPR compliance
CREATE OR REPLACE FUNCTION cleanup_expired_data()
RETURNS TABLE(
    operation VARCHAR(50),
    affected_rows INTEGER,
    completed_at TIMESTAMP
) AS $$
DECLARE
    anonymized_queries INTEGER;
    deleted_gdpr_requests INTEGER;
    deleted_audit_logs INTEGER;
    processed_deletions INTEGER;
    cleaned_feature_usage INTEGER;
BEGIN
    -- Anonymize old query history (after 1 year for functional data)
    UPDATE query_history 
    SET 
        query_text = 'anonymized',
        user_id = NULL,
        anonymized_at = NOW(),
        anonymization_applied = TRUE,
        ip_address = NULL,
        user_agent = NULL
    WHERE created_at < NOW() - INTERVAL '1 year'
    AND anonymized_at IS NULL
    AND data_retention_category = 'functional';
    
    GET DIAGNOSTICS anonymized_queries = ROW_COUNT;
    
    -- Delete completed GDPR requests older than 3 years
    DELETE FROM gdpr_requests 
    WHERE status = 'completed' 
    AND completed_at < NOW() - INTERVAL '3 years';
    
    GET DIAGNOSTICS deleted_gdpr_requests = ROW_COUNT;
    
    -- Delete old audit logs (keep 7 years for legal compliance)
    DELETE FROM audit_log 
    WHERE created_at < NOW() - INTERVAL '7 years';
    
    GET DIAGNOSTICS deleted_audit_logs = ROW_COUNT;
    
    -- Process scheduled user deletions (GDPR Article 17)
    WITH deleted_users AS (
        UPDATE users 
        SET 
            email = 'deleted_user_' || id || '@deleted.invalid',
            password_hash = '',
            customer_id = 'DELETED_' || id,
            account_status = 'deleted',
            updated_at = NOW()
        WHERE deletion_requested = TRUE 
        AND deletion_scheduled_date <= NOW()
        AND account_status != 'deleted'
        RETURNING id
    )
    SELECT COUNT(*) INTO processed_deletions FROM deleted_users;
    
    -- Clean old feature usage data (keep 2 years)
    DELETE FROM feature_usage
    WHERE created_at < NOW() - INTERVAL '2 years';
    
    GET DIAGNOSTICS cleaned_feature_usage = ROW_COUNT;
    
    -- Return cleanup summary
    RETURN QUERY
    VALUES 
        ('anonymized_queries', anonymized_queries, NOW()),
        ('deleted_gdpr_requests', deleted_gdpr_requests, NOW()),
        ('deleted_audit_logs', deleted_audit_logs, NOW()),
        ('processed_user_deletions', processed_deletions, NOW()),
        ('cleaned_feature_usage', cleaned_feature_usage, NOW());
        
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to validate data retention compliance
CREATE OR REPLACE FUNCTION validate_data_retention()
RETURNS TABLE(
    check_name VARCHAR(100),
    compliant BOOLEAN,
    details TEXT,
    recommendation TEXT
) AS $$
BEGIN
    -- Check for old non-anonymized query data
    RETURN QUERY
    SELECT 
        'query_data_retention'::VARCHAR(100),
        (COUNT(*) = 0)::BOOLEAN,
        'Found ' || COUNT(*) || ' queries older than 1 year that should be anonymized'::TEXT,
        CASE WHEN COUNT(*) > 0 THEN 'Run cleanup_expired_data() function' ELSE 'Compliant' END::TEXT
    FROM query_history 
    WHERE created_at < NOW() - INTERVAL '1 year'
    AND anonymized_at IS NULL;
    
    -- Check for overdue user deletions
    RETURN QUERY
    SELECT 
        'user_deletion_compliance'::VARCHAR(100),
        (COUNT(*) = 0)::BOOLEAN,
        'Found ' || COUNT(*) || ' users with overdue deletion requests'::TEXT,
        CASE WHEN COUNT(*) > 0 THEN 'Process deletion requests immediately' ELSE 'Compliant' END::TEXT
    FROM users
    WHERE deletion_requested = TRUE 
    AND deletion_scheduled_date <= NOW()
    AND account_status != 'deleted';
    
    -- Check for old GDPR requests
    RETURN QUERY
    SELECT 
        'gdpr_request_retention'::VARCHAR(100),
        (COUNT(*) = 0)::BOOLEAN,
        'Found ' || COUNT(*) || ' completed GDPR requests older than 3 years'::TEXT,
        CASE WHEN COUNT(*) > 0 THEN 'Archive and delete old GDPR requests' ELSE 'Compliant' END::TEXT
    FROM gdpr_requests
    WHERE status = 'completed'
    AND completed_at < NOW() - INTERVAL '3 years';
    
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Row Level Security (RLS) policies for data protection
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE query_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE gdpr_requests ENABLE ROW LEVEL SECURITY;

-- RLS policies (users can only access their own data)
CREATE POLICY users_isolation_policy ON users
    FOR ALL
    TO application_role
    USING (id = current_setting('app.current_user_id', true)::int);

CREATE POLICY customer_profiles_isolation_policy ON customer_profiles
    FOR ALL 
    TO application_role
    USING (user_id = current_setting('app.current_user_id', true)::int);

CREATE POLICY subscriptions_isolation_policy ON subscriptions
    FOR ALL
    TO application_role
    USING (user_id = current_setting('app.current_user_id', true)::int);

CREATE POLICY query_history_isolation_policy ON query_history
    FOR ALL
    TO application_role
    USING (user_id = current_setting('app.current_user_id', true)::int);

CREATE POLICY payment_history_isolation_policy ON payment_history
    FOR ALL
    TO application_role
    USING (user_id = current_setting('app.current_user_id', true)::int);

CREATE POLICY gdpr_requests_isolation_policy ON gdpr_requests
    FOR ALL
    TO application_role
    USING (user_id = current_setting('app.current_user_id', true)::int);

-- Create application database role
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'application_role') THEN
        CREATE ROLE application_role;
    END IF;
END
$$;

-- Grant appropriate permissions
GRANT USAGE ON SCHEMA public TO application_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO application_role;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO application_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO application_role;

-- Insert default data and configuration
INSERT INTO users (email, password_hash, customer_id, account_status, terms_accepted_version, terms_accepted_at, privacy_consent, privacy_consent_at, created_at)
VALUES 
('system@theunhappycustomer.com', '', 'SYSTEM', 'active', '1.0', NOW(), true, NOW(), NOW())
ON CONFLICT (email) DO NOTHING;

-- Create system subscription for administrative purposes
INSERT INTO subscriptions (user_id, tier, status, monthly_query_limit, current_period_start, current_period_end)
SELECT 
    u.id, 'enterprise', 'active', 999999, NOW(), NOW() + INTERVAL '10 years'
FROM users u 
WHERE u.email = 'system@theunhappycustomer.com'
ON CONFLICT (user_id) DO NOTHING;