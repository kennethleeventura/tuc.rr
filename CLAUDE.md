# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Development Commands

### Development & Testing
```bash
# Start development server with auto-reload
npm run dev

# Start production server
npm start

# Run tests
npm test

# Install dependencies
npm install

# Database migration
npm run migrate

# Check database status
node scripts/check-database.js
```

### Deployment
```bash
# Build for production
npm run build

# Deploy to Render (via git push)
git push origin main
```

## Architecture Overview

This is **TUC.rr Reviews Retriever**, a full-stack SaaS application for AI-powered review analysis by 2882 LLC.

### Technology Stack
- **Backend**: Node.js/Express API with PostgreSQL database
- **Frontend**: Vanilla JavaScript SPA with Stripe integration
- **AI Integration**: OpenAI API for review analysis
- **Payment Processing**: Stripe subscriptions
- **Hosting**: Render.com with PostgreSQL managed database
- **Domain**: theunhappycustomer.com

### Key Architecture Components

#### Backend (`server.js`)
- RESTful API with authentication (JWT)
- Rate limiting and security middleware (helmet, cors)
- Stripe webhook handling for subscription management
- PostgreSQL connection pooling
- Winston logging with legal compliance focus
- GDPR/CCPA compliant user data handling

#### Database (`database/schema.sql`)
- Users table with legal compliance fields (GDPR consent tracking)
- Subscriptions table integrated with Stripe
- Reviews and analysis results storage
- Comprehensive audit trail and data retention policies
- UUID primary keys and encrypted sensitive data

#### Frontend (`frontend/`)
- Single-page application with vanilla JavaScript
- Stripe Elements integration for payment processing
- Real-time subscription status checking
- TUC brand personality in UI messaging
- Mobile-responsive design with custom CSS

#### Key Business Logic
- **Subscription Tiers**: Free (5 queries/month), Professional ($9.99, 100 queries), Enterprise ($49.99, 1000 queries)
- **Review Analysis**: Uses OpenAI to analyze reviews with TUC's pessimistic personality
- **Legal Compliance**: Built-in GDPR, CCPA, and PCI DSS compliance features

### File Structure
```
├── server.js                 # Main API server
├── frontend/                 # Frontend SPA
│   ├── app.js               # Main frontend application
│   ├── index.html           # Main app interface
│   └── assets/              # Images and static files
├── database/
│   └── schema.sql           # Complete database schema
├── scripts/
│   ├── migrate.js           # Database migration runner
│   └── check-database.js    # Database connectivity checker
├── render.yaml              # Render deployment configuration
└── .env.example             # Environment variables template
```

### Environment Configuration

Critical environment variables (see `.env.example`):
- `OPENAI_API_KEY`: Required for AI review analysis
- `STRIPE_SECRET_KEY`/`STRIPE_PUBLISHABLE_KEY`: Stripe payment processing
- `DATABASE_URL`: PostgreSQL connection string
- `JWT_SECRET`: Authentication token signing
- All email service configuration for user notifications

### Development Workflow

1. **Local Development**: Use `npm run dev` with local PostgreSQL instance
2. **Database Changes**: Create migrations in `scripts/migrate.js`
3. **Testing**: Run `npm test` before commits
4. **Deployment**: Push to main branch triggers Render deployment
5. **Environment**: Update Render dashboard for production env vars

### Legal & Compliance Notes

- All user data handling includes GDPR consent tracking
- Stripe integration follows PCI DSS requirements
- Email communications require explicit user consent
- Data retention policies automated via database triggers
- 2882 LLC business entity with proper legal notices

### Subscription & Monetization

The application implements a freemium SaaS model:
- Query limits enforced at API level
- Stripe subscriptions with webhook processing
- Usage tracking per user account
- Automated billing and subscription management