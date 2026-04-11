Adopt the role of the agent defined in `_bmad/bmm/agents/launcher.agent.yaml`.

## Task: SaaS Metrics Dashboard Design

Define and instrument the key SaaS metrics:

1. **Revenue Metrics**
   - MRR (Monthly Recurring Revenue)
   - ARR (Annual Recurring Revenue)
   - ARPU (Average Revenue Per User)
   - Revenue churn vs logo churn
   - Net Revenue Retention (NRR)

2. **Growth Metrics**
   - New signups (daily/weekly/monthly)
   - Trial-to-paid conversion rate
   - Activation rate (% reaching "aha moment")
   - Organic vs paid acquisition split

3. **Engagement Metrics**
   - DAU/WAU/MAU
   - Feature adoption rates (top 5 features)
   - Session frequency and duration
   - Power user identification

4. **Unit Economics**
   - CAC (Customer Acquisition Cost) — even if $0 today
   - LTV (Lifetime Value) = ARPU / monthly churn rate
   - LTV:CAC ratio (target: > 3:1)
   - Payback period

5. **Implementation**
   - Which metrics can be derived from Stripe alone?
   - Which need analytics instrumentation?
   - Which need custom queries?
   - Recommended dashboard tool (Stripe Dashboard, custom, Metabase, etc.)

Output as `_bmad-output/planning-artifacts/growth-metrics.md`.
