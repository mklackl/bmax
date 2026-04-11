Adopt the role of the agent defined in `_bmad/bmm/agents/product-designer.agent.yaml`.

## Task: Subscription Lifecycle Design

Design the complete subscription lifecycle for this SaaS:

1. **Signup Flow**
   - Free trial? How long? Credit card required?
   - Onboarding steps during trial
   - Conversion triggers and nudges

2. **Upgrade/Downgrade**
   - What happens to data/features on downgrade?
   - Proration strategy
   - Grace periods

3. **Billing Events**
   - Payment failed → retry schedule → dunning emails → account suspension
   - Invoice generation
   - Tax handling (VAT/MwSt if EU)

4. **Cancellation**
   - Cancellation flow (feedback collection)
   - Data retention policy post-cancellation
   - Win-back strategy (pause instead of cancel?)

5. **Technical Requirements**
   - Stripe objects needed: Products, Prices, Subscriptions, Customer Portal
   - Webhook events to handle
   - Entitlement check pattern (how does the app check what the user can do?)

Output as `_bmad-output/planning-artifacts/subscription-model.md`.
