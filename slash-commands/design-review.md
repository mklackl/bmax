Adopt the role of the agent defined in `_bmad/bmm/agents/launcher.agent.yaml`.

## Task: Design Review & Evaluation

Evaluate the current UI/UX quality of the application. Compare against best practices and reference products.

### Step 1: Inventory

Scan the codebase for all user-facing pages/screens:
- List every route/page
- Identify the primary user flows (signup, core feature, payment, settings)
- Note which pages are "first impression" pages (landing, login, onboarding)

### Step 2: Visual Quality Audit

For each key page, evaluate:

**Layout & Hierarchy**
- [ ] Clear visual hierarchy — most important element draws the eye first
- [ ] Consistent spacing rhythm (not uniform padding everywhere)
- [ ] Intentional use of whitespace
- [ ] Mobile responsive (no horizontal scroll, touch-friendly targets)

**Typography**
- [ ] Max 2 font families
- [ ] Clear heading/body contrast
- [ ] Readable font size (min 16px body)
- [ ] Line height and letter spacing feel intentional

**Color & Contrast**
- [ ] Color palette is cohesive (not random)
- [ ] Sufficient contrast for accessibility (WCAG AA minimum)
- [ ] Color used semantically (errors = red, success = green, etc.)
- [ ] Dark/light mode consistent (if both exist)

**Interaction States**
- [ ] Hover states on interactive elements
- [ ] Focus states for keyboard navigation
- [ ] Loading states (skeletons, spinners)
- [ ] Empty states (what does the user see with no data?)
- [ ] Error states (form validation, API errors)

**Polish**
- [ ] No default/unstyled elements visible
- [ ] Icons are consistent (same set, same style)
- [ ] Animations/transitions feel smooth and purposeful
- [ ] No Lorem Ipsum or placeholder content

### Step 3: Competitor Comparison

If competitor research exists in `_bmad-output/`, compare:
- How does our UI stack up against the top 3 competitors?
- Where do we look more polished? Where less?
- Are there UI patterns competitors use that we should adopt?

### Step 4: First Impression Test

Evaluate the landing/marketing page:
- Does it clearly communicate what the product does in 5 seconds?
- Is the CTA obvious and compelling?
- Does it look trustworthy (not like a template)?
- Would YOU pay for something that looks like this?

### Step 5: Recommendations

Output a prioritized list:
1. **Critical** — Things that look broken or unprofessional (fix before launch)
2. **High** — Things that hurt first impressions (fix in first week)
3. **Medium** — Polish items (fix over time)
4. **Low** — Nice-to-haves

Include specific, actionable fixes — not vague "improve the design."

### Output

Generate `_bmad-output/planning-artifacts/design-review.md` with:
- Page-by-page audit results
- Competitor comparison (if available)
- Screenshot recommendations (which pages to screenshot for review)
- Prioritized fix list with effort estimates
