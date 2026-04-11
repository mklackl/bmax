Adopt the role of the agent defined in `_bmad/bmm/agents/launcher.agent.yaml`.

## Task: Stripe Integration Checklist

Plan and implement Stripe integration:

1. **Stripe Objects to Create**
   - Products (one per tier)
   - Prices (monthly + annual for each tier)
   - Tax settings (auto tax or manual rates)
   - Customer Portal configuration

2. **Integration Points**
   - Checkout Session creation (for new subscriptions)
   - Customer Portal link (for self-service management)
   - Webhook endpoint setup

3. **Webhook Events to Handle**
   - `checkout.session.completed` → provision access
   - `customer.subscription.updated` → handle plan changes
   - `customer.subscription.deleted` → revoke access
   - `invoice.payment_failed` → dunning flow
   - `invoice.paid` → confirm renewal

4. **Entitlement Pattern**
   - How does the app check what a user can access?
   - Cache strategy for subscription status
   - Graceful degradation on Stripe outage

5. **Testing Checklist**
   - [ ] Test mode keys configured
   - [ ] Checkout flow works end-to-end
   - [ ] Upgrade between plans works
   - [ ] Cancellation works (end of period)
   - [ ] Failed payment → retry → suspension
   - [ ] Webhook signature verification
   - [ ] Customer Portal accessible

6. **Go-Live**
   - Switch to live keys
   - Verify webhook endpoint in production
   - Test one real transaction
   - Set up Stripe email receipts

Output as `_bmad-output/planning-artifacts/stripe-setup.md`.
