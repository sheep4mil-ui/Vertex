# Vertex

Vertex is a role-based custom 3D-printing order website. It includes a public quote form and a staff/admin workspace prototype.

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. The staff demo is at `/staff`.

## Production services

The interface runs without credentials in demo mode. Before accepting real orders, configure:

- **Supabase** for authentication, roles, orders, private file uploads, and database policies.
- **Google Gmail API** for transactional order emails from the parent-managed Vertex Google account.
- **Twilio** for optional SMS updates and opt-out handling.
- **Vercel** for the Next.js server and automatic deployment from GitHub.

Copy `.env.example` to `.env.local` and provide secrets only there. Never commit `.env.local`.

## GitHub and custom domain

1. Install GitHub CLI and authenticate with `gh auth login`.
2. Create a GitHub repository owned by the adult supervising the business.
3. Push this project and import it into Vercel.
4. Add the purchased domain in Vercel, then copy Vercel's DNS records to the domain registrar.

GitHub Pages hosts the frontend. Secure order storage and admin access use Supabase as the web backend; Pages alone never stores private data or secret codes.

## Safety checklist before launch

- Replace the staff demo with Supabase Auth and server-enforced `customer`, `employee`, and `admin` roles.
- Require admin approval before an employee account is activated.
- Keep the 2–3 administrator email addresses in a server-only allowlist. Staff may be promoted from Handout to Order Taker to Printer to Social Management, but never to Administrator.
- Store only a strong hash of the private administrator code; never place the real code in browser code or GitHub.
- Employees sign in with emailed one-time codes and receive the configured discount only after their employee record is verified.
- Give every employee one approved Gmail address. Use it for one-time sign-in codes, assignments, and team announcements; never store employee Gmail passwords.
- Send company-wide mail from the parent-managed Vertex account through the Gmail API, with recipients hidden from one another (or use a parent-managed Google Group later).
- Keep uploaded models in a private storage bucket with signed download links.
- Add Terms, Privacy, Refund, Shipping, and SMS consent/opt-out policies.
- Have a parent or guardian own service accounts, approve the Texas sales-tax setup, and supervise payment collection.
- Do not collect payment until a parent-managed business payment method is connected.
