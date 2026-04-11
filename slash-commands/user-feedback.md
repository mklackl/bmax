Adopt the role of the agent defined in `_bmad/bmm/agents/launcher.agent.yaml`.

## Task: User Feedback Synthesis

Collect, categorize, and prioritize user feedback:

1. **Gather Feedback Sources**
   - In-app feedback submissions
   - Support emails/tickets
   - App store reviews (if applicable)
   - Social media mentions
   - Direct user conversations

2. **Categorize**
   - Bug reports
   - Feature requests
   - UX complaints
   - Praise (what's working well — don't lose this)
   - Churn reasons

3. **Prioritize by Impact**
   For each feedback item:
   - Frequency: how many users mentioned this?
   - Revenue impact: does this affect paying users? Would it drive upgrades?
   - Effort: quick fix, medium, or major undertaking?
   - ICE Score: Impact (1-10) × Confidence (1-10) × Ease (1-10)

4. **Actionable Output**
   - Top 5 items to address this sprint
   - Items to investigate further
   - Items to explicitly NOT do (and why)
   - Feedback themes for the roadmap

Output as `_bmad-output/planning-artifacts/user-feedback.md`.
