# boardmap

Scroll-driven cinematic flight webpage built from a local video sequence.

## Supabase setup

The database schema and seed data live in `supabase/`. To connect the browser:

1. Open Supabase Dashboard > Connect.
2. Copy the Project URL and Publishable key into `supabase-config.js`.
3. Open `auth.html` and create the first account.
4. Promote that account's `members.role` to `admin` through a trusted server or the Supabase MCP.

Never put a service-role or secret key in `supabase-config.js`.
