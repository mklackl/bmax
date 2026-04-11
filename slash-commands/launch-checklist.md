Adopt the role of the agent defined in `_bmad/bmm/agents/launcher.agent.yaml`.

## Task: Pre-Launch Checklist

Audit the project for launch readiness. Check each category and report status:

### Product
- [ ] Core features working and tested
- [ ] Error handling and user-facing error messages
- [ ] Loading states and empty states
- [ ] Mobile responsiveness (if web)
- [ ] Onboarding flow exists

### Payments
- [ ] Stripe integration working (test mode)
- [ ] Subscription lifecycle tested (create, upgrade, cancel)
- [ ] Pricing page reflects actual Stripe prices
- [ ] Webhook handling for payment events
- [ ] Invoice/receipt emails configured

### Legal (EU/DE)
- [ ] Impressum page
- [ ] Datenschutzerklarung (Privacy Policy / DSGVO)
- [ ] AGB (Terms of Service)
- [ ] Cookie consent banner (if cookies used)
- [ ] Widerrufsbelehrung (cancellation policy, if B2C)

### SEO & Discovery
- [ ] Meta titles and descriptions on key pages
- [ ] Open Graph / social media preview tags
- [ ] Sitemap.xml generated
- [ ] robots.txt configured
- [ ] Google Search Console connected

### Analytics
- [ ] Analytics tool installed (GA4, Plausible, or PostHog)
- [ ] Key events tracked (signup, conversion, feature usage)
- [ ] Error tracking (Sentry or equivalent)

### Infrastructure
- [ ] Production environment deployed
- [ ] Custom domain configured
- [ ] SSL/HTTPS working
- [ ] Backup strategy for database
- [ ] Monitoring/uptime checks

### Launch Marketing
- [ ] Landing page live
- [ ] Launch announcement drafted (Product Hunt, HN, Reddit, X)
- [ ] Email capture for waitlist/updates

Generate a status report with pass/fail for each item and next actions for failures.
