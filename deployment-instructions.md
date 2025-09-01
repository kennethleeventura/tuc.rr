# TUC.rr Reviews Retriever - Complete Deployment Instructions
**Copyright 2025 - 2882 LLC**

## 🚀 IMMEDIATE DEPLOYMENT STEPS

### PHASE 1: Environment Setup (5 minutes)

1. **Create .env file** from template:
```bash
cp .env.example .env
```

2. **Fill in your actual values** in `.env`:
```env
# Database URL from Render PostgreSQL service
DATABASE_URL=postgresql://username:password@hostname:port/database

# OpenAI API Key
OPENAI_API_KEY=sk-your-actual-openai-key

# Stripe Keys (from 2882 LLC Stripe account)
STRIPE_SECRET_KEY=sk_live_your-actual-stripe-secret
STRIPE_PUBLISHABLE_KEY=pk_live_your-actual-stripe-publishable
STRIPE_WEBHOOK_SECRET=whsec_your-webhook-secret

# Generate a secure JWT secret (256-bit)
JWT_SECRET=your-super-secure-jwt-secret-here
```

### PHASE 2: Render Backend Deployment (10 minutes)

1. **Push to GitHub repository**:
```bash
git init
git add .
git commit -m "Initial TUC.rr deployment"
git branch -M main
git remote add origin https://github.com/yourusername/tuc-rr-production.git
git push -u origin main
```

2. **Create Render Services**:

   **A. Database Service**:
   - Go to Render Dashboard
   - Create New → PostgreSQL
   - Name: `tuc-rr-database`
   - Plan: Starter ($7/month)
   - Region: Oregon
   - Database Name: `tuc_reviews`
   - Username: `tuc_user`
   - Copy the connection string for later

   **B. Web Service**:
   - Create New → Web Service
   - Connect your GitHub repository
   - Name: `tuc-rr-api`
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Add environment variables from your `.env` file
   - Set custom domain: `api.theunhappycustomer.com`

3. **Configure Environment Variables in Render**:
   - DATABASE_URL: (use internal connection string from database service)
   - OPENAI_API_KEY: (your OpenAI key)
   - STRIPE_SECRET_KEY: (your Stripe secret key)
   - STRIPE_WEBHOOK_SECRET: (your Stripe webhook secret)
   - JWT_SECRET: (generate a secure random string)

### PHASE 3: Frontend Deployment (5 minutes)

**Option A: Deploy to Render Static Site**
1. Create New → Static Site in Render
2. Connect repository, folder: `frontend`
3. Build Command: (leave empty)
4. Publish Directory: `.`
5. Custom Domain: `theunhappycustomer.com`

**Option B: Deploy to Webflow**
1. Copy contents of `frontend/` folder
2. Upload to Webflow custom code sections
3. Update API endpoint in `app.js` to point to your Render API

### PHASE 4: Domain Configuration (10 minutes)

1. **DNS Settings** (in your domain registrar):
```
A     theunhappycustomer.com    → [Render IP]
CNAME www.theunhappycustomer.com → theunhappycustomer.com
A     api.theunhappycustomer.com → [Render API IP]
```

2. **SSL Certificates**:
   - Render automatically provisions SSL certificates
   - Verify HTTPS works for both domains

### PHASE 5: Stripe Configuration (10 minutes)

1. **Create Products in Stripe Dashboard**:
   
   **Professional Plan**:
   - Name: "TUC.rr Professional"
   - Price: $9.99/month
   - Billing: Recurring monthly
   - Copy the Price ID to `.env` as `STRIPE_PRICE_PROFESSIONAL`

   **Enterprise Plan**:
   - Name: "TUC.rr Enterprise" 
   - Price: $49.99/month
   - Billing: Recurring monthly
   - Copy the Price ID to `.env` as `STRIPE_PRICE_ENTERPRISE`

2. **Configure Webhook**:
   - Go to Developers → Webhooks in Stripe
   - Add endpoint: `https://api.theunhappycustomer.com/webhook/stripe`
   - Select events:
     - checkout.session.completed
     - invoice.payment_succeeded
     - invoice.payment_failed
     - customer.subscription.deleted
   - Copy signing secret to `.env` as `STRIPE_WEBHOOK_SECRET`

### PHASE 6: Database Migration (5 minutes)

1. **Run migration script**:
```bash
# Locally first (optional)
npm run migrate

# Or directly on Render
# The migration runs automatically on deployment via render.yaml
```

2. **Verify database setup**:
   - Check Render logs to ensure migration completed
   - Tables should be created automatically

### PHASE 7: Testing & Verification (15 minutes)

1. **Health Check**:
```bash
curl https://api.theunhappycustomer.com/health
# Should return: {"status":"operational","message":"*muttering* System is running..."}
```

2. **Frontend Test**:
   - Visit https://theunhappycustomer.com
   - Sign up for new account
   - Try free analysis
   - Test subscription flow

3. **Payment Test**:
   - Use Stripe test card: 4242 4242 4242 4242
   - Complete subscription purchase
   - Verify webhook processing in Stripe dashboard

## 🔧 CONFIGURATION DETAILS

### Required API Keys & Credentials

1. **OpenAI API Key**:
   - Go to https://platform.openai.com/api-keys
   - Create new secret key
   - Add billing method for usage

2. **Stripe Keys** (from 2882 LLC account):
   - Secret Key: sk_live_... (for backend)
   - Publishable Key: pk_live_... (for frontend)
   - Webhook Secret: whsec_... (for webhook verification)

3. **Database URL**:
   - Automatically provided by Render PostgreSQL service
   - Format: postgresql://user:pass@host:port/dbname

### Security Checklist

- [ ] All environment variables set correctly
- [ ] HTTPS enabled on all domains
- [ ] Stripe webhook signed and verified
- [ ] JWT secret is cryptographically secure (256-bit)
- [ ] Database has SSL enabled
- [ ] CORS configured for your domains only
- [ ] Rate limiting enabled

### Legal Compliance Checklist

- [ ] Privacy Policy accessible at /privacy
- [ ] Terms of Service accessible at /terms
- [ ] GDPR endpoints functional (/api/gdpr/export, /api/gdpr/delete)
- [ ] User consent properly collected
- [ ] Data retention policies implemented
- [ ] Audit logging enabled

## 📱 MOBILE APP SETUP (Optional - Phase 2)

### React Native App Structure
```
mobile/
├── android/
├── ios/
├── src/
│   ├── components/
│   ├── screens/
│   ├── services/
│   └── utils/
├── package.json
└── app.json
```

### Deployment Commands
```bash
# iOS
cd ios && pod install
npx react-native run-ios

# Android  
npx react-native run-android

# Production builds
npx react-native run-ios --configuration Release
npx react-native run-android --variant=release
```

## 🔍 MONITORING & MAINTENANCE

### Render Monitoring
- Check service logs regularly
- Monitor database performance
- Set up uptime monitoring

### Stripe Monitoring
- Monitor successful payments
- Check for failed payments
- Review subscription churn

### Legal Compliance Monitoring
- Weekly GDPR request processing
- Monthly data retention cleanup
- Quarterly security audits

### Performance Optimization
- Monitor API response times
- Optimize database queries
- Review OpenAI token usage

## 🆘 TROUBLESHOOTING GUIDE

### Common Issues

**Database Connection Failed**:
```bash
# Check database URL format
# Verify SSL setting in connection string
# Confirm database service is running in Render
```

**Authentication Not Working**:
```bash
# Verify JWT_SECRET is set correctly
# Check token expiration settings
# Confirm user creation in database
```

**Stripe Webhooks Failing**:
```bash
# Verify webhook URL is accessible
# Check webhook secret matches
# Confirm proper event selection
```

**OpenAI API Errors**:
```bash
# Verify API key is valid and has credits
# Check rate limits
# Monitor token usage
```

### Support Contacts

- **Technical Issues**: support@theunhappycustomer.com
- **Legal/GDPR**: legal@theunhappycustomer.com  
- **Billing**: billing@theunhappycustomer.com

## 🎯 SUCCESS METRICS

### KPIs to Monitor
- User registration rate
- Subscription conversion rate
- Query analysis accuracy
- Customer satisfaction (via feedback)
- Monthly recurring revenue (MRR)
- Churn rate

### Business Goals
- Month 1: 100+ registered users
- Month 2: 20+ paid subscriptions  
- Month 3: $500+ MRR
- Month 6: 1000+ registered users, $2000+ MRR

---

**TUC's Final Note**: *"Well, there you have it. A complete deployment guide that actually seems competent. Don't say I never did anything useful for you. Now go forth and disappoint customers... professionally."*

**Legal Notice**: This deployment guide is provided by 2882 LLC for the TUC.rr Reviews Retriever application. Ensure compliance with all applicable laws and regulations in your jurisdiction.