# 🚀 QUICK START GUIDE
## AuditFlow Migration: Clerk + Supabase + SaaS Boilerplate

Deze guide helpt je stap-voor-stap om het nieuwe project op te zetten.

---

## ⚡ SNELSTART (TL;DR)

```bash
# 1. Clone SaaS Boilerplate
git clone https://github.com/ixartz/SaaS-Boilerplate.git auditflow-new
cd auditflow-new

# 2. Install dependencies
npm install
npm install @clerk/nextjs @supabase/supabase-js drizzle-orm drizzle-kit
npm install recharts jspdf html2canvas react-dropzone date-fns uuid

# 3. Setup environment variables
cp .env.example .env.local
# Vul alle variabelen in (zie hieronder)

# 4. Setup Clerk
# - Maak account op clerk.com
# - Enable Organizations
# - Copy keys naar .env.local

# 5. Setup Supabase
# - Maak project op supabase.com
# - Run database scripts (in volgorde):
#   - database-schema-clerk/01-initial-schema.sql
#   - database-schema-clerk/02-clerk-sync.sql
#   - database-schema-clerk/03-rls-policies.sql
#   - database-schema-clerk/04-webhook-handler.sql

# 6. Start development
npm run dev
```

---

## 📋 GEDETAILLEERDE STAPPEN

### STAP 1: Project Setup

```bash
# Clone repository
git clone https://github.com/ixartz/SaaS-Boilerplate.git auditflow-new
cd auditflow-new

# Install base dependencies
npm install

# Install additional packages voor AuditFlow
npm install @clerk/nextjs @supabase/supabase-js drizzle-orm drizzle-kit
npm install recharts jspdf html2canvas react-dropzone
npm install date-fns uuid zod @hookform/resolvers
```

### STAP 2: Environment Variables

Maak `.env.local` bestand:

```env
# Clerk Configuration
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/onboarding

# Clerk Webhooks
CLERK_WEBHOOK_SECRET=whsec_...

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...

# Database (voor Drizzle)
DATABASE_URL=postgresql://postgres:password@localhost:54322/postgres

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### STAP 3: Clerk Setup

1. **Maak Clerk Account**
   - Ga naar https://clerk.com
   - Maak account en login
   - Klik "Create Application"
   - Kies "Next.js" als framework

2. **Enable Organizations**
   - Ga naar "Organizations" in sidebar
   - Klik "Settings"
   - Enable "Organizations"
   - Configureer max members (optioneel)

3. **Get API Keys**
   - Ga naar "API Keys" in sidebar
   - Copy `Publishable Key` → `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
   - Copy `Secret Key` → `CLERK_SECRET_KEY`

4. **Setup Webhooks** (later, na deployment)
   - Ga naar "Webhooks" in sidebar
   - Klik "Add Endpoint"
   - URL: `https://your-domain.com/api/webhooks/clerk`
   - Subscribe to events:
     - `user.created`
     - `user.updated`
     - `user.deleted`
     - `organization.created`
     - `organization.updated`
     - `organization.deleted`
     - `organizationMembership.created`
     - `organizationMembership.updated`
     - `organizationMembership.deleted`
   - Copy `Signing Secret` → `CLERK_WEBHOOK_SECRET`

### STAP 4: Supabase Setup

1. **Maak Supabase Project**
   - Ga naar https://supabase.com
   - Maak account en login
   - Klik "New Project"
   - Vul project details in
   - Wacht tot project klaar is

2. **Get API Keys**
   - Ga naar "Settings" → "API"
   - Copy `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - Copy `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Copy `service_role` key → `SUPABASE_SERVICE_ROLE_KEY`

3. **Run Database Scripts**
   - Ga naar "SQL Editor" in Supabase dashboard
   - Run scripts in deze volgorde:
     1. `database-schema-clerk/01-initial-schema.sql`
     2. `database-schema-clerk/02-clerk-sync.sql`
     3. `database-schema-clerk/03-rls-policies.sql`
     4. `database-schema-clerk/04-webhook-handler.sql`

4. **Setup Storage**
   - Ga naar "Storage" in sidebar
   - Klik "New bucket"
   - Naam: `audit-photos`
   - Public: Yes
   - Herhaal voor `action-photos`

### STAP 5: Project Structure

Maak de volgende mappen aan:

```
src/
├── app/
│   ├── (auth)/
│   │   ├── sign-in/
│   │   ├── sign-up/
│   │   └── organization-login/
│   ├── (dashboard)/
│   │   ├── dashboard/
│   │   ├── audits/
│   │   ├── acties/
│   │   ├── rapporten/
│   │   └── instellingen/
│   ├── onboarding/
│   ├── landing/
│   └── api/
│       └── webhooks/
│           └── clerk/
├── components/
│   ├── dashboard/
│   ├── audits/
│   ├── audit/
│   ├── acties/
│   ├── rapporten/
│   ├── instellingen/
│   └── ui/
├── lib/
│   ├── clerk.ts
│   ├── supabase/
│   └── utils/
└── types/
```

### STAP 6: Clerk Middleware

Maak `middleware.ts` in root:

```typescript
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

const isPublicRoute = createRouteMatcher([
  '/',
  '/landing',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/organization-login',
  '/onboarding',
  '/api/webhooks(.*)',
])

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth.protect()
  }
})

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}
```

### STAP 7: Clerk Webhook Handler

Maak `src/app/api/webhooks/clerk/route.ts`:

```typescript
import { Webhook } from 'svix'
import { headers } from 'next/headers'
import { WebhookEvent } from '@clerk/nextjs/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET

  if (!WEBHOOK_SECRET) {
    throw new Error('Please add CLERK_WEBHOOK_SECRET to .env.local')
  }

  // Get headers
  const headerPayload = await headers()
  const svix_id = headerPayload.get('svix-id')
  const svix_timestamp = headerPayload.get('svix-timestamp')
  const svix_signature = headerPayload.get('svix-signature')

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response('Error occured -- no svix headers', {
      status: 400,
    })
  }

  // Get body
  const payload = await req.json()
  const body = JSON.stringify(payload)

  // Verify webhook
  const wh = new Webhook(WEBHOOK_SECRET)

  let evt: WebhookEvent

  try {
    evt = wh.verify(body, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    }) as WebhookEvent
  } catch (err) {
    console.error('Error verifying webhook:', err)
    return new Response('Error occured', {
      status: 400,
    })
  }

  // Handle event
  const eventType = evt.type

  try {
    switch (eventType) {
      case 'user.created':
        await supabase.rpc('handle_clerk_user_created', {
          p_clerk_user_id: evt.data.id,
          p_email: evt.data.email_addresses[0]?.email_address,
          p_first_name: evt.data.first_name,
          p_last_name: evt.data.last_name,
          p_image_url: evt.data.image_url,
        })
        break

      case 'user.updated':
        await supabase.rpc('handle_clerk_user_updated', {
          p_clerk_user_id: evt.data.id,
          p_email: evt.data.email_addresses[0]?.email_address,
          p_first_name: evt.data.first_name,
          p_last_name: evt.data.last_name,
          p_image_url: evt.data.image_url,
        })
        break

      case 'user.deleted':
        await supabase.rpc('handle_clerk_user_deleted', {
          p_clerk_user_id: evt.data.id!,
        })
        break

      case 'organization.created':
        await supabase.rpc('handle_clerk_organization_created', {
          p_clerk_org_id: evt.data.id,
          p_name: evt.data.name,
          p_slug: evt.data.slug,
          p_created_by_clerk_user_id: evt.data.created_by,
        })
        break

      case 'organization.updated':
        await supabase.rpc('handle_clerk_organization_updated', {
          p_clerk_org_id: evt.data.id,
          p_name: evt.data.name,
          p_slug: evt.data.slug,
        })
        break

      case 'organization.deleted':
        await supabase.rpc('handle_clerk_organization_deleted', {
          p_clerk_org_id: evt.data.id!,
        })
        break

      case 'organizationMembership.created':
        await supabase.rpc('handle_clerk_organization_membership_created', {
          p_clerk_membership_id: evt.data.id,
          p_clerk_org_id: evt.data.organization.id,
          p_clerk_user_id: evt.data.public_user_data.user_id,
          p_role: evt.data.role,
        })
        break

      case 'organizationMembership.updated':
        await supabase.rpc('handle_clerk_organization_membership_updated', {
          p_clerk_membership_id: evt.data.id,
          p_role: evt.data.role,
        })
        break

      case 'organizationMembership.deleted':
        await supabase.rpc('handle_clerk_organization_membership_deleted', {
          p_clerk_membership_id: evt.data.id!,
        })
        break
    }

    return new Response('Webhook processed', { status: 200 })
  } catch (error) {
    console.error('Error processing webhook:', error)
    return new Response('Error processing webhook', { status: 500 })
  }
}
```

### STAP 8: Test Setup

```bash
# Start development server
npm run dev

# Test in browser
# 1. Ga naar http://localhost:3000
# 2. Klik "Sign Up"
# 3. Maak account
# 4. Maak organization
# 5. Check Supabase database of data gesynced is
```

---

## ✅ CHECKLIST

- [ ] Project cloned en dependencies geïnstalleerd
- [ ] Environment variables ingevuld
- [ ] Clerk account aangemaakt en geconfigureerd
- [ ] Supabase project aangemaakt
- [ ] Database scripts gerund
- [ ] Storage buckets aangemaakt
- [ ] Middleware geconfigureerd
- [ ] Webhook handler aangemaakt
- [ ] Development server draait
- [ ] Test sign up werkt
- [ ] Test organization creation werkt
- [ ] Data sync naar Supabase werkt

---

## 🐛 TROUBLESHOOTING

### Clerk webhook werkt niet
- Check of `CLERK_WEBHOOK_SECRET` correct is
- Check of webhook URL correct is in Clerk dashboard
- Check server logs voor errors

### Supabase queries werken niet
- Check of RLS policies correct zijn
- Check of user authenticated is
- Check of user in organization zit

### Organization sync werkt niet
- Check of webhook events correct zijn
- Check database functions
- Check Supabase logs

---

## 📚 VOLGENDE STAPPEN

1. Migreer components van oude project
2. Update routing structure
3. Test alle features
4. Deploy naar production
5. Setup production webhooks

Zie `ULTRA_COMPREHENSIVE_MIGRATION_PROMPT.md` voor complete details.
