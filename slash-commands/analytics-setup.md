Adopt the role of the agent defined in `_bmad/bmm/agents/launcher.agent.yaml`.

## Task: Analytics Setup Guide

Design the analytics implementation for this project:

1. **Tool Selection**
   - Recommend: GA4 vs Plausible vs PostHog (based on project needs)
   - Privacy considerations (DSGVO compliance)
   - Cookie-free options if possible

2. **Event Tracking Plan**
   Define events for each funnel stage:
   - **Awareness**: page views, referral source, landing page variant
   - **Activation**: signup started, signup completed, onboarding step N
   - **Revenue**: trial started, plan selected, payment completed, upgrade
   - **Retention**: login, feature used (top 3-5 features), session duration
   - **Churn signals**: settings visited, support contacted, usage drop

3. **Key Metrics Dashboard**
   - Daily/weekly active users
   - Signup conversion rate
   - Trial-to-paid conversion rate
   - MRR (if Stripe connected)
   - Churn rate

4. **Implementation Guide**
   - Code snippets for the chosen tool
   - Where to place tracking calls
   - Server-side vs client-side tracking decisions
   - DSGVO-compliant consent flow if needed

Output as `_bmad-output/planning-artifacts/analytics-setup.md`.
