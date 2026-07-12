# boardmap

Scroll-driven cinematic flight webpage built from a local video sequence.

## Supabase setup

The database schema and seed data live in `supabase/`. To connect the browser:

1. Open Supabase Dashboard > Connect.
2. Copy the Project URL and Publishable key into `supabase-config.js`.
3. Open `developer.html` to edit shared member and play-session data directly in Supabase.

The current prototype intentionally allows public writes to member and play-session tables. Add authentication and restrictive RLS before using it with untrusted users.

Never put a service-role or secret key in `supabase-config.js`.
