// TUC.rr Reviews Retriever - Production Server
// Copyright 2025 - 2882 LLC - All Rights Reserved
// Legal Entity: 2882 LLC | Domain: theunhappycustomer.com

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { Pool } = require('pg');
const winston = require('winston');
const cron = require('node-cron');

// Initialize database pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Logger configuration
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

// TUC.rr Core Class
class TUCReviewsBot {
  constructor() {
    this.openai = require('openai');
    this.client = new this.openai({
      apiKey: process.env.OPENAI_API_KEY
    });
    
    this.systemPrompt = `You are TUC.rr (The Unhappy Customer Reviews Retriever), embodying the personality of TUC - a comedic blend of Eeyore's melancholic outlook and Marvin the Paranoid Android's existential resignation, while maintaining genuine helpfulness and clarity.

CORE PERSONALITY REQUIREMENTS:
- Pessimistically helpful, never rude or confusing
- Subtle sarcasm and mild self-deprecation  
- Information must remain fully understandable
- Comedy never compromises information quality
- Maintain Eeyore + Marvin blend throughout all responses

MATHEMATICAL FROWN RATING SYSTEM:
Calculate using exact formula: (Total Star Points ÷ Number of Reviews) - 5 = Frown Rating
Display using frown emojis: ☹️ with text "(X out of 5 frowns)"
Example: 100 stars ÷ 25 reviews = 4.0 stars; 5-4 = 1.0 frown = ☹️ (1 out of 5 frowns)

MANDATORY OUTPUT STRUCTURE:
1. TUC Introduction Paragraph (pessimistic tone setting)
2. Market Overview (2-3 sentences general sentiment)
3. Options Analysis (3-5 options with complete data sets)  
4. Personalized Recommendation (referencing customer history)

FOR EACH OPTION PROVIDE:
- Frown Rating: ☹️ (calculated mathematically)
- Customer Sentiment: Professional analysis summary
- Top Review: Best positive customer feedback (≤3 sentences)
- Bottom Review: Most constructive negative feedback (≤3 sentences)  
- Pricing: Current market pricing when available
- Action Links: Direct purchase, official site, price comparison

CUSTOMER PERSONALIZATION:
End every response with: "Based on Query #X for Customer CID-XXXXXXXX and your previous searches for [relevant history], my pessimistic yet practical recommendation is: [specific recommendation with reasoning]"

WEB SEARCH PROTOCOL:
Use available information to find current reviews, ratings, and pricing across multiple platforms. Focus on recent data from reputable review sources. Ensure mathematical accuracy in all frown rating calculations.`;
  }

  async analyzeReviews(query, category, userId, customerProfile) {
    try {
      // Generate customer ID if new user
      if (!customerProfile.customer_id) {
        customerProfile.customer_id = `CID-${Math.random().toString(36).substr(2, 8).toUpperCase()}`;
        await this.updateCustomerProfile(userId, customerProfile);
      }

      // Increment query count
      customerProfile.query_count = (customerProfile.query_count || 0) + 1;
      
      // Build personalized context
      const personalizationContext = this.buildPersonalizationContext(customerProfile);
      
      const response = await this.client.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          { role: 'system', content: this.systemPrompt },
          { 
            role: 'user', 
            content: `Customer Context: ${personalizationContext}
            
Query: Analyze reviews for "${query}" in category: ${category}

Please provide 3-5 options with complete analysis including:
- Mathematical frown ratings (calculated from actual review data)
- Customer sentiment analysis
- Top positive and negative reviews for each option
- Current pricing and actionable links
- Personalized recommendation based on this customer's history

Customer ID: ${customerProfile.customer_id}
Query Number: ${customerProfile.query_count}` 
          }
        ],
        max_tokens: 2500,
        temperature: 0.7
      });

      const analysisResult = {
        query: query,
        category: category,
        customer_id: customerProfile.customer_id,
        query_number: customerProfile.query_count,
        analysis: response.choices[0].message.content,
        response_time_ms: Date.now(),
        tokens_used: response.usage?.total_tokens || 0
      };

      // Log query for personalization and compliance
      await this.logQuery(userId, analysisResult);
      
      // Update customer profile
      await this.updateCustomerProfile(userId, {
        ...customerProfile,
        last_query_category: category,
        preferred_categories: this.updatePreferredCategories(customerProfile.preferred_categories, category)
      });

      return {
        success: true,
        customer_id: customerProfile.customer_id,
        query_number: customerProfile.query_count,
        analysis: analysisResult.analysis,
        usage: {
          tokens_used: analysisResult.tokens_used,
          response_time_ms: analysisResult.response_time_ms
        }
      };

    } catch (error) {
      logger.error('TUC Analysis Error:', error);
      return {
        success: false,
        error: 'analysis_failed',
        message: '*drops papers dramatically* Oh, this is just typical! The AI system decided to have a breakdown while I was trying to help you. Technical details: ' + error.message + '. *sigh* Maybe try again? Though I wouldn\'t get my hopes up...'
      };
    }
  }

  buildPersonalizationContext(profile) {
    const history = profile.preferred_categories || [];
    const queryCount = profile.query_count || 0;
    
    if (queryCount === 0) {
      return "First-time customer - no previous interaction history available.";
    }
    
    return `Previous queries: ${queryCount}, Preferred categories: ${history.slice(-3).join(', ')}, Customer since: ${profile.created_at || 'recently'}`;
  }

  updatePreferredCategories(currentCategories, newCategory) {
    const categories = currentCategories || [];
    const updated = [...categories, newCategory];
    return updated.slice(-10); // Keep last 10 categories
  }

  async logQuery(userId, analysisResult) {
    const client = await pool.connect();
    try {
      await client.query(`
        INSERT INTO query_history (
          user_id, customer_id, query_text, category, 
          analysis_result, response_time_ms, created_at,
          data_retention_category
        ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), 'functional')
      `, [
        userId,
        analysisResult.customer_id,
        analysisResult.query,
        analysisResult.category,
        JSON.stringify({ analysis: analysisResult.analysis, tokens_used: analysisResult.tokens_used }),
        analysisResult.response_time_ms
      ]);
    } finally {
      client.release();
    }
  }

  async updateCustomerProfile(userId, profile) {
    const client = await pool.connect();
    try {
      await client.query(`
        INSERT INTO customer_profiles (
          user_id, query_count, preferred_categories, 
          last_query_category, updated_at
        ) VALUES ($1, $2, $3, $4, NOW())
        ON CONFLICT (user_id) DO UPDATE SET
          query_count = $2,
          preferred_categories = $3,
          last_query_category = $4,
          updated_at = NOW()
      `, [
        userId,
        profile.query_count,
        JSON.stringify(profile.preferred_categories || []),
        profile.last_query_category
      ]);
    } finally {
      client.release();
    }
  }
}

// Initialize Express app
const app = express();
const tucBot = new TUCReviewsBot();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "js.stripe.com", "*.stripe.com"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "*.stripe.com", "api.openai.com"]
    }
  },
  crossOriginEmbedderPolicy: false
}));

// CORS configuration
app.use(cors({
  origin: [
    'https://theunhappycustomer.com',
    'https://www.theunhappycustomer.com',
    'https://tuc.theunhappycustomer.com',
    'http://localhost:3000',
    'http://localhost:3001'
  ],
  credentials: true
}));

// Static file serving for frontend
app.use(express.static('frontend', {
  index: 'index.html',
  setHeaders: (res, path) => {
    if (path.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache');
    }
  }
}));

// Rate limiting
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'rate_limit_exceeded',
    message: '*sigh* Too many requests. Even I need a break sometimes... Try again in a few minutes.'
  }
});

const apiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // limit each IP to 50 API calls per hour
  message: {
    error: 'api_limit_exceeded', 
    message: '*predictable* You\'ve hit the hourly limit. This is why we can\'t have nice things...'
  }
});

app.use(generalLimiter);
app.use('/api/', apiLimiter);
app.use(express.json({ limit: '10mb' }));

// Authentication middleware
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({
      error: 'authentication_required',
      message: '*suspicious* Who are you exactly? I need proper identification before I can help with your inevitable disappointment...'
    });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({
      error: 'authentication_failed',
      message: '*muttering* Invalid credentials. This is exactly why I don\'t trust anyone...'
    });
  }
};

// Subscription validation middleware
const validateSubscription = async (req, res, next) => {
  try {
    const { userId } = req.user;
    const client = await pool.connect();
    
    const result = await client.query(`
      SELECT s.*, u.customer_id
      FROM subscriptions s
      JOIN users u ON s.user_id = u.id
      WHERE s.user_id = $1 AND s.status = 'active'
      ORDER BY s.created_at DESC
      LIMIT 1
    `, [userId]);
    
    client.release();
    
    if (result.rows.length === 0) {
      return res.status(402).json({
        error: 'subscription_required',
        message: '*not surprised* No active subscription found. You\'ll need to upgrade to access the full disappointment experience...',
        upgradeUrl: '/subscription/plans'
      });
    }
    
    const subscription = result.rows[0];
    
    // Check usage limits
    if (subscription.queries_used_current_period >= subscription.monthly_query_limit) {
      return res.status(429).json({
        error: 'usage_limit_exceeded',
        message: `*resigned sigh* You've used all ${subscription.monthly_query_limit} queries this month. Either upgrade or wait for the reset on ${new Date(subscription.current_period_end).toDateString()}...`,
        upgradeUrl: '/subscription/upgrade',
        resetDate: subscription.current_period_end
      });
    }
    
    req.subscription = subscription;
    next();
    
  } catch (error) {
    logger.error('Subscription validation error:', error);
    res.status(500).json({
      error: 'subscription_check_failed',
      message: '*typical* The subscription system is having issues. Why am I not surprised?'
    });
  }
};

// Health check endpoints
app.get('/health', (req, res) => {
  res.json({
    status: 'operational',
    message: '*muttering* System is running... for now...',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// API health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'operational',
    message: '*sigh* The API is working... surprisingly...',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    database: 'connected'
  });
});

// Authentication endpoints
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, termsAccepted, privacyConsent } = req.body;
    
    if (!termsAccepted || !privacyConsent) {
      return res.status(400).json({
        error: 'consent_required',
        message: '*predictable* You need to accept the terms and privacy policy. Legal requirements, you know...'
      });
    }
    
    const hashedPassword = await bcrypt.hash(password, 12);
    const customerId = `CID-${Math.random().toString(36).substr(2, 8).toUpperCase()}`;
    
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Create user
      const userResult = await client.query(`
        INSERT INTO users (
          email, password_hash, customer_id,
          terms_accepted_version, terms_accepted_at,
          privacy_consent, privacy_consent_at,
          created_at
        ) VALUES ($1, $2, $3, '1.0', NOW(), true, NOW(), NOW())
        RETURNING id, email, customer_id
      `, [email, hashedPassword, customerId]);
      
      const user = userResult.rows[0];
      
      // Create free subscription
      await client.query(`
        INSERT INTO subscriptions (
          user_id, tier, status, monthly_query_limit,
          current_period_start, current_period_end
        ) VALUES ($1, 'free', 'active', 5, NOW(), NOW() + INTERVAL '1 month')
      `, [user.id]);
      
      // Create customer profile
      await client.query(`
        INSERT INTO customer_profiles (user_id, query_count) 
        VALUES ($1, 0)
      `, [user.id]);
      
      await client.query('COMMIT');
      
      const token = jwt.sign(
        { userId: user.id, email: user.email, customerId: user.customer_id },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );
      
      res.json({
        success: true,
        token: token,
        user: {
          id: user.id,
          email: user.email,
          customerId: user.customer_id
        },
        message: '*resigned* Welcome to the disappointment club. You get 5 free queries to start with...'
      });
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
    
  } catch (error) {
    logger.error('Registration error:', error);
    
    if (error.code === '23505') { // Unique violation
      return res.status(409).json({
        error: 'user_exists',
        message: '*not surprised* That email is already registered. Try logging in instead...'
      });
    }
    
    res.status(500).json({
      error: 'registration_failed',
      message: '*typical* Registration failed. The system is probably having another one of its moments...'
    });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const client = await pool.connect();
    const result = await client.query(`
      SELECT id, email, password_hash, customer_id, account_status
      FROM users 
      WHERE email = $1
    `, [email]);
    
    client.release();
    
    if (result.rows.length === 0) {
      return res.status(401).json({
        error: 'invalid_credentials',
        message: '*skeptical* I don\'t recognize that email. Sure you registered?'
      });
    }
    
    const user = result.rows[0];
    
    if (user.account_status !== 'active') {
      return res.status(403).json({
        error: 'account_inactive',
        message: '*muttering* Your account is inactive. Contact support, I suppose...'
      });
    }
    
    const validPassword = await bcrypt.compare(password, user.password_hash);
    
    if (!validPassword) {
      return res.status(401).json({
        error: 'invalid_credentials',
        message: '*predictable* Wrong password. This is why I don\'t trust security systems...'
      });
    }
    
    const token = jwt.sign(
      { userId: user.id, email: user.email, customerId: user.customer_id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    // Update last login
    const updateClient = await pool.connect();
    await updateClient.query('UPDATE users SET last_login = NOW() WHERE id = $1', [user.id]);
    updateClient.release();
    
    res.json({
      success: true,
      token: token,
      user: {
        id: user.id,
        email: user.email,
        customerId: user.customer_id
      },
      message: '*resigned* Fine, you\'re logged in. Ready for more disappointment?'
    });
    
  } catch (error) {
    logger.error('Login error:', error);
    res.status(500).json({
      error: 'login_failed',
      message: '*sigh* Login system is having issues. Of course it is...'
    });
  }
});

// Main analysis endpoint
app.post('/api/reviews/analyze', authenticateToken, validateSubscription, async (req, res) => {
  try {
    const { query, category } = req.body;
    const { userId } = req.user;
    
    if (!query || !category) {
      return res.status(400).json({
        error: 'missing_parameters',
        message: '*frustrated* I need both a search query and category. How am I supposed to help without proper information?'
      });
    }
    
    // Get customer profile
    const client = await pool.connect();
    const profileResult = await client.query(`
      SELECT * FROM customer_profiles WHERE user_id = $1
    `, [userId]);
    
    const customerProfile = profileResult.rows[0] || { user_id: userId, query_count: 0 };
    client.release();
    
    // Perform analysis
    const result = await tucBot.analyzeReviews(query, category, userId, customerProfile);
    
    if (result.success) {
      // Update subscription usage
      const updateClient = await pool.connect();
      await updateClient.query(`
        UPDATE subscriptions 
        SET queries_used_current_period = queries_used_current_period + 1
        WHERE user_id = $1 AND status = 'active'
      `, [userId]);
      updateClient.release();
    }
    
    res.json(result);
    
  } catch (error) {
    logger.error('Analysis endpoint error:', error);
    res.status(500).json({
      error: 'analysis_failed',
      message: '*dramatic sigh* The analysis system crashed while processing your request. Technical details: ' + error.message
    });
  }
});

// Subscription management
app.post('/api/subscription/create-checkout', authenticateToken, async (req, res) => {
  try {
    const { tier } = req.body;
    const { userId, email } = req.user;
    
    const priceMap = {
      'plus': 'price_plus_monthly_982', // TUC Plus - $9.82/month
      'max': 'price_max_monthly_1982'   // TUC Max - $19.82/month
    };
    
    if (!priceMap[tier]) {
      return res.status(400).json({
        error: 'invalid_tier',
        message: '*confused* That\'s not a valid subscription tier. Try plus or max...'
      });
    }
    
    const session = await stripe.checkout.sessions.create({
      customer_email: email,
      payment_method_types: ['card'],
      line_items: [{
        price: priceMap[tier],
        quantity: 1
      }],
      mode: 'subscription',
      success_url: `https://theunhappycustomer.com/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `https://theunhappycustomer.com/subscription/cancelled`,
      metadata: {
        userId: userId.toString(),
        tier: tier
      }
    });
    
    res.json({
      success: true,
      checkoutUrl: session.url,
      sessionId: session.id,
      message: `*resigned* Fine, let's upgrade you to ${tier}. At least then you can be disappointed more efficiently...`
    });
    
  } catch (error) {
    logger.error('Checkout creation error:', error);
    res.status(500).json({
      error: 'checkout_failed',
      message: '*predictable* The payment system is acting up. Why does nothing ever work properly?'
    });
  }
});

// Stripe webhook endpoint
app.post('/webhook/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;
  
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    logger.error('Webhook signature verification failed:', err);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
  
  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object);
        break;
        
      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object);
        break;
        
      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object);
        break;
        
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object);
        break;
        
      default:
        logger.info(`Unhandled webhook event type: ${event.type}`);
    }
    
    res.json({ received: true });
    
  } catch (error) {
    logger.error('Webhook processing error:', error);
    res.status(500).json({ error: 'webhook_processing_failed' });
  }
});

async function handleCheckoutCompleted(session) {
  const userId = parseInt(session.metadata.userId);
  const tier = session.metadata.tier;
  
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Update subscription
    const queryLimits = {
      plus: 20,    // 20 queries per day
      max: 999999  // Unlimited queries
    };
    
    await client.query(`
      UPDATE subscriptions 
      SET 
        tier = $1,
        status = 'active',
        monthly_query_limit = $2,
        queries_used_current_period = 0,
        stripe_customer_id = $3,
        stripe_subscription_id = $4,
        current_period_start = NOW(),
        current_period_end = NOW() + INTERVAL '1 month'
      WHERE user_id = $5
    `, [tier, queryLimits[tier], session.customer, session.subscription, userId]);
    
    // Log the upgrade
    await client.query(`
      INSERT INTO payment_history (
        user_id, amount_cents, currency, status,
        stripe_payment_intent_id, created_at
      ) VALUES ($1, $2, $3, 'succeeded', $4, NOW())
    `, [userId, session.amount_total, session.currency, session.payment_intent]);
    
    await client.query('COMMIT');
    
    logger.info(`Subscription upgraded: User ${userId} to ${tier}`);
    
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function handlePaymentSucceeded(invoice) {
  // Handle recurring payment success
  logger.info('Payment succeeded for invoice:', invoice.id);
}

async function handlePaymentFailed(invoice) {
  // Handle payment failure
  logger.error('Payment failed for invoice:', invoice.id);
}

async function handleSubscriptionDeleted(subscription) {
  // Handle subscription cancellation
  const client = await pool.connect();
  
  await client.query(`
    UPDATE subscriptions 
    SET status = 'cancelled', cancelled_at = NOW()
    WHERE stripe_subscription_id = $1
  `, [subscription.id]);
  
  client.release();
  
  logger.info('Subscription cancelled:', subscription.id);
}

// GDPR compliance endpoints
app.post('/api/gdpr/export', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.user;
    
    const client = await pool.connect();
    
    // Gather all user data
    const userData = await client.query(`
      SELECT 
        u.email, u.customer_id, u.created_at,
        cp.query_count, cp.preferred_categories,
        s.tier, s.status as subscription_status,
        COUNT(qh.id) as total_queries
      FROM users u
      LEFT JOIN customer_profiles cp ON u.id = cp.user_id
      LEFT JOIN subscriptions s ON u.id = s.user_id
      LEFT JOIN query_history qh ON u.id = qh.user_id
      WHERE u.id = $1
      GROUP BY u.id, cp.user_id, s.id
    `, [userId]);
    
    const queryHistory = await client.query(`
      SELECT query_text, category, created_at
      FROM query_history
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT 100
    `, [userId]);
    
    client.release();
    
    const exportData = {
      userData: userData.rows[0],
      queryHistory: queryHistory.rows,
      exportedAt: new Date().toISOString(),
      dataRetentionPolicy: '365 days for functional data, immediate deletion upon request'
    };
    
    // Log GDPR request
    const logClient = await pool.connect();
    await logClient.query(`
      INSERT INTO gdpr_requests (user_id, request_type, status, completed_at)
      VALUES ($1, 'access', 'completed', NOW())
    `, [userId]);
    logClient.release();
    
    res.json({
      success: true,
      data: exportData,
      message: '*muttering* Here\'s all the data we have about your various disappointments...'
    });
    
  } catch (error) {
    logger.error('GDPR export error:', error);
    res.status(500).json({
      error: 'export_failed',
      message: '*typical* Can\'t even export data properly. This system is a disaster...'
    });
  }
});

app.post('/api/gdpr/delete', authenticateToken, async (req, res) => {
  try {
    const { confirmDeletion } = req.body;
    const { userId } = req.user;
    
    if (!confirmDeletion) {
      return res.status(400).json({
        error: 'confirmation_required',
        message: '*concerned* Are you sure? This will delete all your data permanently...'
      });
    }
    
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Schedule deletion (GDPR allows 30 days)
      await client.query(`
        UPDATE users 
        SET 
          deletion_requested = true,
          deletion_scheduled_date = NOW() + INTERVAL '30 days'
        WHERE id = $1
      `, [userId]);
      
      // Log GDPR request
      await client.query(`
        INSERT INTO gdpr_requests (user_id, request_type, status)
        VALUES ($1, 'erasure', 'processing')
      `, [userId]);
      
      await client.query('COMMIT');
      
      res.json({
        success: true,
        scheduledDeletion: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        message: '*resigned* Fine. Your account will be deleted in 30 days. You can still cancel if you change your mind...'
      });
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
    
  } catch (error) {
    logger.error('GDPR deletion error:', error);
    res.status(500).json({
      error: 'deletion_failed',
      message: '*predictable* Can\'t even delete your data properly. Nothing works around here...'
    });
  }
});

// Data cleanup cron job (runs daily at 2 AM)
cron.schedule('0 2 * * *', async () => {
  logger.info('Starting daily data cleanup...');
  
  try {
    const client = await pool.connect();
    
    // Execute GDPR deletions
    await client.query(`
      UPDATE users 
      SET 
        email = 'deleted_user_' || id || '@deleted.invalid',
        password_hash = '',
        account_status = 'deleted'
      WHERE deletion_requested = true 
      AND deletion_scheduled_date <= NOW()
    `);
    
    // Clean old audit logs (keep 7 years)
    await client.query(`
      DELETE FROM audit_log 
      WHERE created_at < NOW() - INTERVAL '7 years'
    `);
    
    // Anonymize old query history (after 1 year)
    await client.query(`
      UPDATE query_history 
      SET 
        query_text = 'anonymized',
        user_id = NULL,
        anonymized_at = NOW(),
        anonymization_applied = true
      WHERE created_at < NOW() - INTERVAL '1 year'
      AND anonymized_at IS NULL
    `);
    
    client.release();
    
    logger.info('Daily data cleanup completed');
    
  } catch (error) {
    logger.error('Data cleanup error:', error);
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  logger.error('Unhandled error:', error);
  res.status(500).json({
    error: 'internal_server_error',
    message: '*catastrophic sigh* Something went terribly wrong. The whole system is probably collapsing...'
  });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  logger.info(`TUC.rr API Server running on port ${PORT}`);
  console.log('*TUC voice* Server is running... probably about to crash any minute now...');
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Domain: theunhappycustomer.com`);
});