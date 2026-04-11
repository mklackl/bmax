Adopt the role of the agent defined in `_bmad/bmm/agents/launcher.agent.yaml`.

## Task: Wire & Verify

Connect all services, deploy, and verify the app works end-to-end before launch.

### Step 1: Service Discovery

Ask the user which services this project needs. Common setups:

- **Hosting**: Vercel, Netlify, Railway, Fly.io, Hetzner, AWS
- **Database**: Supabase, PlanetScale, Neon, local Postgres
- **Auth**: Supabase Auth, Clerk, Auth.js, custom
- **Payments**: Stripe, Lemon Squeezy, Paddle
- **Email**: Resend, Postmark, SendGrid
- **Storage**: Supabase Storage, S3, Cloudflare R2
- **Monitoring**: Sentry, LogSnag, BetterStack
- **Analytics**: Plausible, PostHog, GA4
- **DNS/Domain**: Cloudflare, Vercel DNS, Namecheap

If a PRD or architecture doc exists in `_bmad-output/`, extract the planned services from there first. Ask the user to confirm or adjust.

### Step 2: Environment & Secrets

For each service:
1. Check if the account exists (ask user)
2. List required environment variables (API keys, URLs, secrets)
3. Generate a `.env.example` with all required vars and descriptions
4. Verify `.env` is in `.gitignore`
5. Guide setup for each service that isn't configured yet

### Step 3: Deployment

1. Configure deployment target (e.g., `vercel.json`, `Dockerfile`, `fly.toml`)
2. Set environment variables in the deployment platform
3. Run first deployment (or guide user through it)
4. Verify the deployed URL responds

### Step 4: Service Wiring

For each service, verify the integration works:

**Payments (Stripe)**:
- [ ] API keys configured (test mode)
- [ ] Products and prices created
- [ ] Checkout flow works end-to-end
- [ ] Webhook endpoint configured and receiving events
- [ ] Customer portal accessible

**Database**:
- [ ] Connection string configured
- [ ] Migrations applied
- [ ] Seed data loaded (if applicable)
- [ ] Connection works from deployed environment

**Auth**:
- [ ] Login/signup flow works
- [ ] OAuth providers configured (if used)
- [ ] Session handling works
- [ ] Protected routes actually protect

**Email**:
- [ ] Transactional emails sending (signup confirmation, password reset)
- [ ] From address configured and verified
- [ ] Email templates exist

### Step 5: Smoke Tests

Run basic end-to-end verification:
1. **Homepage loads** — deployed URL returns 200
2. **Auth flow** — signup → login → logout works
3. **Core feature** — the main user journey completes
4. **Payment flow** — Stripe checkout → webhook → access granted (test mode)
5. **Error handling** — 404 page works, error boundaries catch crashes

Report results as a checklist with pass/fail status.

### Output

Generate `_bmad-output/planning-artifacts/wire-report.md` with:
- Services configured (with status)
- Environment variables needed
- Deployment details (URL, platform)
- Smoke test results
- Remaining items to fix before launch
