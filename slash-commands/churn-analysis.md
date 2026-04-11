Adopt the role of the agent defined in `_bmad/bmm/agents/launcher.agent.yaml`.

## Task: Churn Analysis

Analyze churn patterns and design retention strategies:

1. **Identify Churn Signals**
   - Usage frequency drop (define thresholds)
   - Feature adoption stalls
   - Support ticket patterns before cancellation
   - Payment failures (involuntary churn)
   - Direct cancellation reasons (exit survey data)

2. **Churn Cohort Analysis**
   - When do users churn? (Day 7, Day 30, Day 90)
   - Which plan tier churns most?
   - What's the usage pattern of churned vs retained users?

3. **Retention Strategies**
   - Onboarding improvements (reduce time-to-value)
   - Re-engagement campaigns (email sequences)
   - Usage nudges (in-app prompts for underused features)
   - Cancellation flow improvements (pause option, discount offer)
   - Dunning optimization (for involuntary churn)

4. **Metrics to Track**
   - Monthly churn rate (target: < 5% for SMB SaaS)
   - Net revenue retention
   - Activation rate (what % of signups reach "aha moment"?)
   - Time to value

Output as `_bmad-output/planning-artifacts/churn-analysis.md`.
