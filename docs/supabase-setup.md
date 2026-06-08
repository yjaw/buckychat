# Supabase setup

## Auth

1. Create a Supabase project.
2. Enable email/password auth.
3. Enable email confirmation.
4. Configure custom SMTP in Authentication > SMTP Settings before testing real `@wisc.edu` users. Supabase's built-in email service is only for limited project testing and may not deliver to users outside your Supabase organization.
5. Run `supabase/migrations/001_madfriends.sql` in the SQL editor or through the Supabase CLI.
6. In Authentication > Hooks, enable the Before User Created hook and point it at:
   `public.madfriends_before_user_created`.
7. In Authentication > URL Configuration, set Site URL to your frontend origin and add the auth URLs to Redirect URLs. If Vite starts on a different port, use that actual port everywhere:
   - Local: `http://localhost:5173`, `http://localhost:5173/auth/callback`, `http://localhost:5173/confirm-signup`, and `http://localhost:5173/reset-password`
   - Production: `https://buckychat.com`, `https://buckychat.com/auth/callback`, `https://buckychat.com/confirm-signup`, and `https://buckychat.com/reset-password`
8. Optional: set `VITE_AUTH_REDIRECT_URL` to the same callback URL. If it is not set, the app uses the current browser origin plus `/auth/callback`.
9. In Authentication > Email Templates > Confirm signup, use the template in `docs/supabase-confirm-signup-template.html`:

```html
<h2>Confirm your account</h2>
<p>Verify your wisc.edu email.</p>
<p>
  <a
    href="{{ .SiteURL }}/confirm-signup?token_hash={{ .TokenHash }}&type=email"
    style="display:inline-block;padding:14px 20px;border-radius:8px;background:#c5050c;color:#ffffff;font-weight:800;text-decoration:none;"
  >
    Confirm account
  </a>
</p>
```

The hook rejects every email domain except exact `wisc.edu`. For example, `student@wisc.edu` is allowed and `student@sub.wisc.edu` is rejected.

Use `{{ .TokenHash }}` instead of direct `{{ .ConfirmationURL }}` links. The `/confirm-signup` page verifies the token as soon as the user opens the email link, then shows the verified `wisc.edu` account email.

Password recovery uses Supabase's reset email with the app-provided `/reset-password` redirect URL. That route reads the recovery session from the link, lets the user set a new password, and then signs out the local recovery session so they can sign in normally.

If signups succeed in the UI but no email arrives, check Authentication > Logs in Supabase. Also confirm the Email provider is enabled, email confirmation is enabled, and SMTP/rate limits are not blocking delivery.

## JWT verification

Prefer Supabase asymmetric signing keys and JWKS verification. Set:

- `SUPABASE_URL`
- `SUPABASE_JWKS_URL`

For older HS256 projects, set `SUPABASE_JWT_SECRET`. Do not expose that value to the frontend.

## Database

The Go backend needs a Postgres connection string in `DATABASE_URL`. For Supabase, use a server-side database connection string only in backend environments.

Local backend startup needs:

```txt
DATABASE_URL=postgresql://...
SUPABASE_URL=https://uhrzyswempgushhpcjfc.supabase.co
SUPABASE_JWKS_URL=https://uhrzyswempgushhpcjfc.supabase.co/auth/v1/.well-known/jwks.json
CLIENT_ORIGIN=http://127.0.0.1:5174,http://localhost:5173
```
