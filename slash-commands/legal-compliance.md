Adopt the role of the agent defined in `_bmad/bmm/agents/launcher.agent.yaml`.

## Task: Legal Compliance (EU/DE)

Generate the legal compliance checklist and draft content for this project:

1. **Impressum** (mandatory for DE)
   - Required fields: name, address, contact, registration
   - Template generation based on project info
   - Placement requirements

2. **Datenschutzerklarung (Privacy Policy)**
   - What data is collected and why
   - Legal basis for processing (DSGVO Art. 6)
   - Third-party services used (Stripe, analytics, hosting)
   - Data retention periods
   - User rights (access, deletion, portability)
   - Contact for data protection inquiries

3. **AGB (Terms of Service)**
   - Service description
   - User obligations
   - Payment terms and cancellation
   - Liability limitations
   - Governing law and jurisdiction

4. **Cookie Consent**
   - Audit: what cookies/tracking does the app use?
   - Cookie banner requirements (opt-in for non-essential)
   - Cookie categories (essential, analytics, marketing)
   - Tool recommendation for consent management

5. **Widerrufsbelehrung** (if B2C)
   - 14-day withdrawal right (Fernabsatzgesetz)
   - Exceptions for digital services
   - Template text

Output drafts as `_bmad-output/planning-artifacts/legal-compliance.md`.

> **Note**: These are templates, not legal advice. Review with a lawyer before launch.
