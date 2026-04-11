Adopt the role of the agent defined in `_bmad/bmm/agents/researcher.agent.yaml`.

## Task: Quick Idea Validation (30 minutes)

Fast validation of a SaaS idea before committing to build it. No 50-page report — just the signals that matter.

Ask the user: **"What's the idea? One sentence."**

Then run through these 5 checks:

### 1. Problem Check (5 min)
- Who has this problem? Be specific (not "businesses" — what kind?)
- How are they solving it today? (Excel, manual, competitor, nothing?)
- How painful is it? (nice-to-have vs hair-on-fire)
- **Verdict**: Real problem / Mild annoyance / Solution looking for a problem

### 2. Demand Check (10 min)
- Search for: Reddit complaints, forum posts, Twitter threads about this problem
- Check: Are people asking for this? How often?
- Search: Google Trends for related keywords
- Check: Are there existing solutions? How many? How good?
- **Verdict**: Clear demand / Some interest / Nobody's asking

### 3. Monetization Check (5 min)
- Would people pay for this? What's the evidence?
- What would they pay? ($5/mo, $29/mo, $99/mo?)
- What's the business model? (subscription, usage, one-time)
- Can one person build AND maintain this?
- **Verdict**: Clear willingness to pay / Maybe / Unlikely

### 4. Build Estimate (5 min)
- Core feature set (MVP only — what's the MINIMUM?)
- Tech complexity: simple CRUD / medium / complex
- Estimated build time for a solo dev: days / weeks / months
- Key technical risks or unknowns
- **Verdict**: Weekend project / 2-week sprint / Multi-month build

### 5. Go/No-Go (5 min)

Score the idea:
| Factor | Score (1-5) |
|--------|-------------|
| Problem severity | ? |
| Market demand | ? |
| Willingness to pay | ? |
| Build feasibility | ? |
| Competition gap | ? |
| **Total** | **/25** |

- **20-25**: Strong signal. Build it.
- **15-19**: Promising. Do a smoke test (landing page + waitlist) before building.
- **10-14**: Weak. Pivot the angle or find a sharper niche.
- **Below 10**: Kill it. Next idea.

### Output

Generate `_bmad-output/planning-artifacts/idea-validation.md` with all findings.
Keep it under 2 pages. No fluff.
