Adopt the role of the agent defined in `_bmad/bmm/agents/launcher.agent.yaml`.

## Task: Feature Prioritization

Prioritize the feature backlog by revenue impact:

1. **List all candidate features** from:
   - User feedback
   - Competitor gaps
   - Technical debt items
   - Founder ideas

2. **Score each feature (ICE Framework)**
   - **Impact** (1-10): How much does this move the needle? (revenue, retention, activation)
   - **Confidence** (1-10): How sure are we this will work? (evidence-based)
   - **Ease** (1-10): How quickly can one developer ship this?
   - **ICE Score** = Impact × Confidence × Ease

3. **Revenue Classification**
   - Will this reduce churn?
   - Will this drive upgrades?
   - Will this attract new users?
   - Is this table-stakes (must-have to compete)?

4. **Recommended Execution Order**
   - Quick wins first (high ICE, low effort)
   - Then high-impact items
   - Deprioritize low-confidence / high-effort items

Output as `_bmad-output/planning-artifacts/feature-priorities.md`.
