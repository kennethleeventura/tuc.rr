# Contributing to TUC.rr Reviews Retriever

*TUC voice: "Oh, so you want to contribute to this mess? Well, I suppose someone has to help fix the inevitable problems..."*

## 🤝 Welcome Contributors

Thank you for your interest in contributing to TUC.rr! This project is maintained by 2882 LLC and we welcome contributions that help improve the pessimistically helpful review analysis experience.

## 📋 Before You Start

### 🏢 Commercial Project Notice
TUC.rr is a commercial application owned by 2882 LLC. By contributing, you agree that:
- Your contributions will be licensed under our MIT License
- 2882 LLC retains commercial rights to the TUC character and business logic
- Contributions may be used in the commercial service

### 🔒 Security & Privacy
- This is a **PRIVATE REPOSITORY** with production credentials
- **Never** commit API keys, passwords, or sensitive data
- Review the SECURITY.md file before contributing
- Report security issues privately to security@theunhappycustomer.com

## 🛠️ Development Setup

### Prerequisites
- Node.js 18+ and npm
- PostgreSQL (local or cloud)
- OpenAI API account
- Stripe account (for payment testing)

### Local Development
```bash
# Clone the repository
git clone https://github.com/kennethleeventura/tuc.rr.git
cd tuc.rr

# Install dependencies
npm install

# Copy environment template
cp .env.example .env.local

# Configure your local .env.local with development keys
# (Never use production keys locally!)

# Run database migrations
npm run migrate

# Start development server
npm run dev
```

## 🎭 TUC Character Guidelines

### Personality Requirements
TUC (The Unhappy Customer) must maintain consistent personality:
- **Pessimistic but helpful**: Always expects disappointment but provides useful information
- **Eeyore + Marvin**: Blend of melancholic and existentially resigned
- **Never rude**: Sarcastic and self-deprecating, but never offensive or mean
- **Professionally unhappy**: Maintains business professionalism while expressing disappointment

### Voice Examples
✅ **Good**: *"sigh* Well, I suppose I can analyze those reviews... prepare for disappointment..."*  
✅ **Good**: *"predictable* The system is having issues. Why am I not surprised?"*  
❌ **Bad**: "This is stupid and doesn't work"  
❌ **Bad**: "You're an idiot for trying this"  

## 📝 Contribution Types

### 🐛 Bug Reports
- Use GitHub Issues with detailed reproduction steps
- Include system information and error messages
- Check existing issues before creating new ones

### ✨ Feature Requests
- Describe the use case and expected behavior
- Consider how it fits with TUC's personality
- Include mockups or examples if applicable

### 🔧 Code Contributions
- Fork the repository and create a feature branch
- Follow existing code style and patterns
- Include tests for new functionality
- Update documentation as needed

### 📚 Documentation
- Improve setup instructions
- Add code comments and examples
- Update API documentation
- Fix typos and clarify instructions

## 🔄 Pull Request Process

### 1. Branch Naming
```
feature/description-of-feature
bugfix/issue-number-description
docs/documentation-update
security/security-fix-description
```

### 2. Code Standards
- **JavaScript**: Use ES6+ features, async/await
- **Database**: Follow PostgreSQL best practices
- **API**: RESTful endpoints with proper HTTP status codes
- **Frontend**: Vanilla JS with progressive enhancement
- **Comments**: Include TUC personality in user-facing messages

### 3. Testing Requirements
- All endpoints must have health checks
- Database operations must be tested
- Payment flows must be validated
- TUC personality responses must be consistent

### 4. Pull Request Template
```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix (non-breaking change)
- [ ] New feature (non-breaking change)
- [ ] Breaking change (fix or feature that would cause existing functionality to change)
- [ ] Documentation update

## TUC Personality Check
- [ ] Maintains pessimistic but helpful tone
- [ ] No rude or offensive content
- [ ] Professional disappointment maintained

## Testing
- [ ] Local testing completed
- [ ] Database migrations tested
- [ ] API endpoints validated
- [ ] Frontend functionality verified

## Checklist
- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No sensitive data committed
```

## 🚀 Development Workflow

### Environment Management
- **Development**: Use `.env.local` with test keys
- **Staging**: Use `.env.staging` for pre-production testing  
- **Production**: Use `.env` with live keys (managed by 2882 LLC)

### Database Changes
- Always create migration scripts
- Test migrations on sample data
- Document schema changes
- Consider backwards compatibility

### API Changes
- Maintain backwards compatibility when possible
- Update API documentation
- Version endpoints if breaking changes needed
- Test with frontend integration

## 🏗️ Architecture Guidelines

### Backend (Node.js/Express)
- RESTful API design
- Middleware for authentication and validation
- Proper error handling with TUC personality
- Database connection pooling
- Rate limiting and security headers

### Database (PostgreSQL)
- Normalized schema design
- Proper indexing for performance
- Row-level security for data isolation
- GDPR compliance with audit trails
- Automated cleanup functions

### Frontend (Vanilla JavaScript)
- Progressive enhancement approach
- Responsive design for all devices
- Accessibility compliance (WCAG 2.1)
- TUC personality in all user interactions
- Stripe integration for payments

## 🎯 Priority Areas for Contribution

### High Priority
- [ ] Performance optimizations
- [ ] Additional review source integrations
- [ ] Mobile app development (React Native)
- [ ] Advanced analytics and reporting
- [ ] Multi-language support

### Medium Priority
- [ ] Automated testing suite
- [ ] Enhanced security features
- [ ] Bulk analysis tools
- [ ] API rate limiting improvements
- [ ] Customer dashboard enhancements

### Low Priority
- [ ] UI/UX improvements
- [ ] Documentation enhancements
- [ ] Developer tools and scripts
- [ ] Monitoring and alerting
- [ ] Performance metrics

## ❓ Questions and Support

### Getting Help
- **Technical Questions**: Create a GitHub Discussion
- **Bug Reports**: Use GitHub Issues
- **Security Concerns**: Email security@theunhappycustomer.com
- **Business Questions**: Contact Kenneth Ventura (2882 LLC)

### Community Guidelines
- Be respectful and professional
- Provide constructive feedback
- Help others when possible
- Maintain TUC's character consistently
- Follow our Code of Conduct

## 📄 Legal Information

### Contributor License Agreement
By contributing to this project, you agree to license your contributions under the same terms as the project (MIT License with commercial restrictions).

### Intellectual Property
- TUC character and personality: © 2882 LLC
- Code contributions: Licensed under project terms
- Business logic: Proprietary to 2882 LLC

---

*TUC's final note: "Well, if you've read this far, you might actually be serious about helping. Don't say I didn't warn you about the inevitable frustrations ahead. But hey, maybe together we can make this disappointment machine slightly less disappointing..."*

**Contact**: Kenneth Lee Ventura (2882 LLC)  
**Email**: contribute@theunhappycustomer.com  
**Repository**: https://github.com/kennethleeventura/tuc.rr