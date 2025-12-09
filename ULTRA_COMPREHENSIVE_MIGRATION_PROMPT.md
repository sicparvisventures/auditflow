# 🚀 ULTRA COMPREHENSIVE MIGRATION PROMPT
## AuditFlow → Clerk + Supabase + SaaS Boilerplate Integration

**Doel**: Transformeer het huidige AuditFlow project naar een moderne SaaS applicatie met Clerk authentication, Supabase database, en de SaaS Boilerplate structuur. Alles moet lokaal draaien en volledig functioneel zijn.

---

## 📋 INHOUDSOPGAVE

1. [Project Analyse](#project-analyse)
2. [Huidige Architectuur](#huidige-architectuur)
3. [Nieuwe Architectuur](#nieuwe-architectuur)
4. [Stap-voor-Stap Migratie](#stap-voor-stap-migratie)
5. [Database Schema](#database-schema)
6. [Clerk Configuratie](#clerk-configuratie)
7. [Supabase Setup](#supabase-setup)
8. [Component Mapping](#component-mapping)
9. [Routing Structure](#routing-structure)
10. [Styling & Branding](#styling--branding)
11. [SQL Scripts](#sql-scripts)
12. [Environment Variables](#environment-variables)
13. [Testing Checklist](#testing-checklist)

---

## 🔍 PROJECT ANALYSE

### Huidige Stack
- **Frontend**: Next.js 14 (App Router), React 18, TypeScript
- **Styling**: Tailwind CSS met custom kleurenschema
- **Database**: Supabase (PostgreSQL)
- **Auth**: Custom AuthProvider met localStorage
- **State**: React Context API
- **Forms**: React Hook Form + Zod
- **Charts**: Recharts
- **PDF**: jsPDF + html2canvas

### Belangrijkste Features
1. **Multi-tenant SaaS Platform** voor interne audits
2. **Landing Page** met pricing tiers
3. **Onboarding Wizard** voor nieuwe organizations
4. **Dashboard** met KPI's en audit overzicht
5. **Audit Management** (create, view, edit, delete)
6. **Action Items** (verbeterpunten tracking)
7. **Reports** (PDF generatie)
8. **Settings** (organization configuratie)
9. **Mobile Navigation** (bottom bar)
10. **Multi-language** support (NL/EN)

### Routes Overzicht

#### Public Routes
```
/                    → Redirect naar /landing
/landing             → SaaS landing page
/organization-login  → Organization selectie
/onboarding          → Onboarding wizard
/info/demo           → Demo pagina
/info/features       → Features pagina
/info/pricing        → Pricing pagina
```

#### Organization Routes
```
/{slug}/login        → Organization-specific login
/{slug}/dashboard    → Organization dashboard
/{slug}/audits       → Audit overzicht
/{slug}/audits/new   → Nieuwe audit
/{slug}/audits/[id]  → Audit detail
/{slug}/acties       → Action items
/{slug}/rapporten    → Reports
/{slug}/instellingen → Settings
```

#### PP Specific Routes (Legacy)
```
/pp-login            → Poule & Poulette login
/pp-dashboard        → PP dashboard
/audits              → Audits (legacy)
/acties              → Actions (legacy)
/rapporten           → Reports (legacy)
/instellingen        → Settings (legacy)
```

---

## 🏗️ HUIDIGE ARCHITECTUUR

### Database Schema (Huidig)

```sql
-- Organizations
organizations (
  id, name, slug, tier, status,
  primary_color, secondary_color, accent_color,
  background_color, text_color,
  primary_font, accent_font,
  logo_url, favicon_url,
  max_users, max_filialen, max_audits_per_month,
  created_at, updated_at
)

-- Users (gebruikers)
gebruikers (
  id, email, naam, rol, telefoon,
  actief, organization_id,
  created_at, updated_at
)

-- Locations (filialen)
filialen (
  id, naam, locatie, adres, telefoon, email,
  status, organization_id, district_manager_id,
  created_at, updated_at
)

-- Audits
audits (
  id, filiaal_id, district_manager_id,
  audit_datum, status, totale_score, pass_percentage,
  opmerkingen, created_at, updated_at
)

-- Audit Checklist Items
audit_checklist_items (
  id, categorie, titel, beschrijving,
  gewicht, volgorde, actief, created_at
)

-- Audit Results
audit_resultaten (
  id, audit_id, checklist_item_id,
  resultaat, score, opmerkingen,
  foto_urls, verbeterpunt, created_at
)

-- Actions (acties)
acties (
  id, audit_id, filiaal_id,
  titel, beschrijving, status,
  urgency, deadline, verantwoordelijke_id,
  foto_urls, created_at, updated_at
)

-- Reports
rapporten (
  id, audit_id, email_adres,
  status, sent_at, created_at
)
```

### Component Structuur

```
components/
├── dashboard/
│   ├── Dashboard.tsx
│   ├── DashboardHeader.tsx
│   ├── KPICards.tsx
│   ├── AuditList.tsx
│   ├── FiliaalSelector.tsx
│   ├── DashboardFilters.tsx
│   └── MobileNavigation.tsx
├── audits/
│   └── Audits.tsx
├── audit/
│   ├── NewAuditForm.tsx
│   ├── AuditDetail.tsx
│   ├── ViewAuditForm.tsx
│   └── PhotoUpload.tsx
├── acties/
│   ├── Acties.tsx
│   ├── ActionList.tsx
│   ├── ActionDetail.tsx
│   ├── ActionCompletionForm.tsx
│   └── ActionVerificationForm.tsx
├── rapporten/
│   ├── Rapporten.tsx
│   └── RapportList.tsx
├── instellingen/
│   └── Instellingen.tsx
├── ui/
│   ├── Button.tsx
│   ├── Card.tsx
│   ├── Input.tsx
│   ├── LoadingSpinner.tsx
│   ├── Alert.tsx
│   ├── LanguageSelector.tsx
│   └── BackgroundDecoration.tsx
└── providers/
    └── AuthProvider.tsx
```

### Kleurenschema

```css
/* Poule & Poulette Theme */
--olive: #1C3834        /* Primary */
--ppwhite: #FBFBF1      /* Background */
--christmas: #93231F    /* Secondary/Accent */
--lollypop: #F495BD     /* Pink Accent */
--ppblack: #060709      /* Text */
--creme: #FDF8C1        /* Soft Background */

/* Primary Scale */
primary-50: #f0f4f3
primary-800: #1C3834    /* Main olive */
primary-900: #0f1c1a

/* Accent Scale */
accent-800: #93231F     /* Main christmas */
```

### Fonts

```css
/* Primary Font */
font-family: 'Lino Stamp', 'BentonSans', 'Inter', system-ui, sans-serif

/* Accent Font */
font-family: 'Bacon Kingdom', 'comic sans ms', cursive
```

---

## 🎯 NIEUWE ARCHITECTUUR

### Tech Stack (Nieuw)
- **Frontend**: Next.js 16 (App Router), React 19, TypeScript
- **Styling**: Tailwind CSS 4, Shadcn UI
- **Database**: Supabase (PostgreSQL)
- **Auth**: Clerk (organizations + users)
- **ORM**: Drizzle ORM
- **State**: React Context + Server Components
- **Forms**: React Hook Form + Zod
- **Charts**: Recharts
- **PDF**: jsPDF + html2canvas

### Clerk + Supabase Integratie

**Flow**:
1. User sign up/sign in via Clerk
2. Clerk webhook syncs user → Supabase `users` table
3. User creates/joins organization in Clerk
4. Clerk webhook syncs organization → Supabase `organizations` table
5. User selects organization → Context updates
6. All queries filtered by `organization_id`

**Database Sync**:
- `clerk_user_id` → Supabase `users.clerk_user_id`
- `clerk_org_id` → Supabase `organizations.clerk_org_id`
- Real-time sync via Clerk webhooks

---

## 📝 STAP-VOOR-STAP MIGRATIE

### STAP 1: Nieuwe Project Setup

```bash
# 1. Clone SaaS Boilerplate
git clone https://github.com/ixartz/SaaS-Boilerplate.git auditflow-new
cd auditflow-new

# 2. Install dependencies
npm install

# 3. Install additional packages
npm install @clerk/nextjs @supabase/supabase-js drizzle-orm drizzle-kit
npm install recharts jspdf html2canvas react-dropzone
npm install date-fns uuid zod @hookform/resolvers

# 4. Initialize git (if needed)
git init
```

### STAP 2: Environment Variables Setup

Maak `.env.local`:

```env
# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...

# Database (for Drizzle)
DATABASE_URL=postgresql://postgres:password@localhost:54322/postgres

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### STAP 3: Clerk Setup

1. **Create Clerk Account**
   - Ga naar https://clerk.com
   - Maak nieuwe application
   - Copy `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` en `CLERK_SECRET_KEY`

2. **Enable Organizations**
   - Clerk Dashboard → Organizations → Settings
   - Enable "Organizations"
   - Set max members per organization (based on tier)

3. **Configure Webhooks**
   - Clerk Dashboard → Webhooks
   - Add endpoint: `https://your-domain.com/api/webhooks/clerk`
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

4. **Configure OAuth** (optioneel)
   - Google, GitHub, etc.

### STAP 4: Supabase Setup

1. **Create Supabase Project**
   - Ga naar https://supabase.com
   - Maak nieuw project
   - Copy `NEXT_PUBLIC_SUPABASE_URL` en `NEXT_PUBLIC_SUPABASE_ANON_KEY`

2. **Run Database Schema**
   - Zie [SQL Scripts](#sql-scripts) sectie
   - Run `01-initial-schema.sql`
   - Run `02-clerk-sync.sql`
   - Run `03-functions.sql`

3. **Enable Row Level Security (RLS)**
   - Alle tabellen hebben RLS policies
   - Users kunnen alleen data van hun organization zien

4. **Setup Storage**
   - Create bucket: `audit-photos`
   - Create bucket: `action-photos`
   - Set public access policies

### STAP 5: Project Structure Setup

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
│   ├── dashboard/        (from current project)
│   ├── audits/           (from current project)
│   ├── audit/            (from current project)
│   ├── acties/           (from current project)
│   ├── rapporten/        (from current project)
│   ├── instellingen/     (from current project)
│   └── ui/               (Shadcn UI + custom)
├── lib/
│   ├── clerk.ts          (Clerk client)
│   ├── supabase/
│   │   ├── client.ts     (Supabase client)
│   │   ├── server.ts     (Server client)
│   │   └── db.ts         (Database service)
│   ├── drizzle/
│   │   ├── schema.ts     (Drizzle schema)
│   │   └── db.ts         (Drizzle client)
│   └── utils/
├── types/
│   ├── database.ts
│   └── clerk.ts
└── middleware.ts         (Clerk middleware)
```

### STAP 6: Clerk Middleware Setup

`middleware.ts`:

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

### STAP 7: Database Schema Migration

Zie [SQL Scripts](#sql-scripts) sectie voor complete schema.

**Belangrijkste wijzigingen**:
1. Add `clerk_user_id` to `users` table
2. Add `clerk_org_id` to `organizations` table
3. Add `clerk_membership_id` to `organization_members` table
4. Create sync functions
5. Create webhook handler functions

### STAP 8: Component Migration

**AuthProvider → Clerk Integration**:

```typescript
// src/components/providers/OrganizationProvider.tsx
'use client'

import { useOrganization, useOrganizationList } from '@clerk/nextjs'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export function OrganizationProvider({ children }) {
  const { organization, isLoaded } = useOrganization()
  const { setActive } = useOrganizationList()
  const router = useRouter()

  // Sync organization to Supabase
  useEffect(() => {
    if (isLoaded && organization) {
      // Sync via API route
      fetch('/api/sync/organization', {
        method: 'POST',
        body: JSON.stringify({
          clerkOrgId: organization.id,
          name: organization.name,
          slug: organization.slug,
        }),
      })
    }
  }, [organization, isLoaded])

  return <>{children}</>
}
```

**Update alle components**:
- Replace `useAuth()` → `useUser()` from Clerk
- Replace `user.rol` → `user.publicMetadata.role`
- Add organization context where needed

### STAP 9: Routing Migration

**Update routes**:
- `/sign-in` → Clerk sign-in
- `/sign-up` → Clerk sign-up
- `/{slug}/dashboard` → Organization dashboard
- Keep all audit/action/report routes

**Organization routing**:
```typescript
// src/app/(dashboard)/dashboard/page.tsx
'use client'

import { useOrganization } from '@clerk/nextjs'
import { redirect } from 'next/navigation'

export default function DashboardPage() {
  const { organization, isLoaded } = useOrganization()

  if (!isLoaded) return <LoadingSpinner />
  if (!organization) redirect('/organization-login')

  return <Dashboard organizationId={organization.id} />
}
```

### STAP 10: Database Queries Update

**Update all Supabase queries**:
```typescript
// Before
const { data } = await supabase
  .from('audits')
  .select('*')

// After
const { data } = await supabase
  .from('audits')
  .select('*')
  .eq('organization_id', organizationId) // Always filter by org
```

---

## 🗄️ DATABASE SCHEMA

### Complete Schema (Clerk + Supabase)

Zie `database-schema-clerk.sql` voor complete schema.

**Key Tables**:

1. **organizations** - Synced from Clerk
2. **users** - Synced from Clerk
3. **organization_members** - Synced from Clerk memberships
4. **locations** (filialen) - Per organization
5. **audits** - Per organization
6. **audit_checklist_items** - Global or per organization
7. **audit_resultaten** - Per audit
8. **acties** - Per organization
9. **rapporten** - Per audit

**RLS Policies**:
- Users can only see data from their organization
- Admins can manage all data in their organization
- Regular users have read-only access

---

## ⚙️ CLERK CONFIGURATIE

### Required Settings

1. **Organizations Enabled**
   - Max members: Based on tier (5/25/unlimited)
   - Allow creation: Yes
   - Allow deletion: Yes (admin only)

2. **User Metadata**
   - `role`: 'admin' | 'inspector' | 'storemanager' | 'user'
   - `organization_id`: UUID (for quick lookup)

3. **Organization Metadata**
   - `tier`: 'starter' | 'professional' | 'enterprise'
   - `slug`: URL slug
   - `primary_color`: Hex color
   - `secondary_color`: Hex color
   - `accent_color`: Hex color
   - `background_color`: Hex color
   - `text_color`: Hex color
   - `primary_font`: Font name
   - `accent_font`: Font name

4. **Webhooks**
   - Endpoint: `/api/webhooks/clerk`
   - Events: All user/org events
   - Signing secret: Store in env

---

## 🗃️ SUPABASE SETUP

### Storage Buckets

```sql
-- Create buckets
INSERT INTO storage.buckets (id, name, public)
VALUES
  ('audit-photos', 'audit-photos', true),
  ('action-photos', 'action-photos', true);

-- Set policies
CREATE POLICY "Users can upload audit photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'audit-photos' AND
  (storage.foldername(name))[1] = auth.jwt() ->> 'organization_id'
);
```

### RLS Policies Example

```sql
-- Audits: Users can only see audits from their organization
CREATE POLICY "Users can view audits from their organization"
ON audits FOR SELECT
TO authenticated
USING (
  organization_id IN (
    SELECT organization_id
    FROM organization_members
    WHERE user_id = auth.uid()
  )
);
```

---

## 🎨 STYLING & BRANDING

### Tailwind Config Update

```javascript
// tailwind.config.ts
module.exports = {
  theme: {
    extend: {
      colors: {
        // Organization colors (dynamic)
        org: {
          primary: 'var(--org-primary)',
          secondary: 'var(--org-secondary)',
          accent: 'var(--org-accent)',
          background: 'var(--org-background)',
          text: 'var(--org-text)',
        },
        // Keep existing colors as fallback
        olive: '#1C3834',
        ppwhite: '#FBFBF1',
        christmas: '#93231F',
        lollypop: '#F495BD',
        ppblack: '#060709',
        creme: '#FDF8C1',
      },
      fontFamily: {
        org: {
          primary: 'var(--org-primary-font)',
          accent: 'var(--org-accent-font)',
        },
      },
    },
  },
}
```

### Dynamic CSS Variables

```typescript
// src/lib/utils/org-theme.ts
export function applyOrganizationTheme(org: Organization) {
  if (typeof document === 'undefined') return

  document.documentElement.style.setProperty('--org-primary', org.primary_color)
  document.documentElement.style.setProperty('--org-secondary', org.secondary_color)
  document.documentElement.style.setProperty('--org-accent', org.accent_color)
  document.documentElement.style.setProperty('--org-background', org.background_color)
  document.documentElement.style.setProperty('--org-text', org.text_color)
  document.documentElement.style.setProperty('--org-primary-font', org.primary_font)
  document.documentElement.style.setProperty('--org-accent-font', org.accent_font)
}
```

---

## 📄 SQL SCRIPTS

### 01-initial-schema.sql

```sql
-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create enums
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('admin', 'inspector', 'storemanager', 'user');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE audit_status AS ENUM ('in_progress', 'completed', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE action_status AS ENUM ('pending', 'in_progress', 'completed', 'verified');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE urgency_level AS ENUM ('low', 'medium', 'high', 'critical');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Organizations table (synced from Clerk)
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_org_id TEXT UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  tier VARCHAR(50) NOT NULL DEFAULT 'starter',
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  
  -- Branding
  primary_color VARCHAR(7) DEFAULT '#1C3834',
  secondary_color VARCHAR(7) DEFAULT '#93231F',
  accent_color VARCHAR(7) DEFAULT '#F495BD',
  background_color VARCHAR(7) DEFAULT '#FBFBF1',
  text_color VARCHAR(7) DEFAULT '#060709',
  primary_font VARCHAR(100) DEFAULT 'Lino Stamp',
  accent_font VARCHAR(100) DEFAULT 'Bacon Kingdom',
  
  -- Limits
  max_users INTEGER DEFAULT 5,
  max_locations INTEGER DEFAULT 3,
  max_audits_per_month INTEGER DEFAULT 10,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Users table (synced from Clerk)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id TEXT UNIQUE NOT NULL,
  email CITEXT NOT NULL,
  name VARCHAR(255) NOT NULL,
  role user_role NOT NULL DEFAULT 'user',
  phone VARCHAR(20),
  active BOOLEAN DEFAULT true,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Organization members (synced from Clerk)
CREATE TABLE IF NOT EXISTS organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_membership_id TEXT UNIQUE NOT NULL,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL DEFAULT 'member',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, user_id)
);

-- Locations (filialen)
CREATE TABLE IF NOT EXISTS locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  location VARCHAR(255) NOT NULL,
  address TEXT NOT NULL,
  phone VARCHAR(20),
  email CITEXT,
  district_manager_id UUID REFERENCES users(id) ON DELETE SET NULL,
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit checklist items (global or per org)
CREATE TABLE IF NOT EXISTS audit_checklist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  category VARCHAR(100) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  weight DECIMAL(3,2) DEFAULT 1.00,
  order_index INTEGER NOT NULL,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audits
CREATE TABLE IF NOT EXISTS audits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  location_id UUID REFERENCES locations(id) ON DELETE CASCADE,
  district_manager_id UUID REFERENCES users(id) ON DELETE SET NULL,
  audit_date DATE NOT NULL,
  status audit_status DEFAULT 'in_progress',
  total_score DECIMAL(3,2) DEFAULT 0.00,
  pass_percentage DECIMAL(5,2) DEFAULT 0.00,
  comments TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit results
CREATE TABLE IF NOT EXISTS audit_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id UUID REFERENCES audits(id) ON DELETE CASCADE,
  checklist_item_id UUID REFERENCES audit_checklist_items(id) ON DELETE CASCADE,
  result VARCHAR(20) NOT NULL CHECK (result IN ('ok', 'niet_ok')),
  score INTEGER NOT NULL CHECK (score >= 0 AND score <= 5),
  comments TEXT,
  photo_urls TEXT[] DEFAULT '{}',
  improvement_point TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Actions (acties)
CREATE TABLE IF NOT EXISTS actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  audit_id UUID REFERENCES audits(id) ON DELETE SET NULL,
  location_id UUID REFERENCES locations(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  status action_status DEFAULT 'pending',
  urgency urgency_level DEFAULT 'medium',
  deadline DATE,
  responsible_id UUID REFERENCES users(id) ON DELETE SET NULL,
  photo_urls TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Reports
CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id UUID REFERENCES audits(id) ON DELETE CASCADE,
  email_address CITEXT NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_users_clerk_user_id ON users(clerk_user_id);
CREATE INDEX IF NOT EXISTS idx_users_organization_id ON users(organization_id);
CREATE INDEX IF NOT EXISTS idx_organizations_clerk_org_id ON organizations(clerk_org_id);
CREATE INDEX IF NOT EXISTS idx_organizations_slug ON organizations(slug);
CREATE INDEX IF NOT EXISTS idx_locations_organization_id ON locations(organization_id);
CREATE INDEX IF NOT EXISTS idx_audits_organization_id ON audits(organization_id);
CREATE INDEX IF NOT EXISTS idx_audits_location_id ON audits(location_id);
CREATE INDEX IF NOT EXISTS idx_actions_organization_id ON actions(organization_id);
```

### 02-clerk-sync.sql

```sql
-- Function to sync user from Clerk
CREATE OR REPLACE FUNCTION sync_user_from_clerk(
  p_clerk_user_id TEXT,
  p_email CITEXT,
  p_name VARCHAR(255),
  p_phone VARCHAR(20) DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_user_id UUID;
BEGIN
  INSERT INTO users (clerk_user_id, email, name, phone)
  VALUES (p_clerk_user_id, p_email, p_name, p_phone)
  ON CONFLICT (clerk_user_id) DO UPDATE
  SET
    email = EXCLUDED.email,
    name = EXCLUDED.name,
    phone = EXCLUDED.phone,
    updated_at = NOW()
  RETURNING id INTO v_user_id;
  
  RETURN v_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to sync organization from Clerk
CREATE OR REPLACE FUNCTION sync_organization_from_clerk(
  p_clerk_org_id TEXT,
  p_name VARCHAR(255),
  p_slug VARCHAR(100),
  p_tier VARCHAR(50) DEFAULT 'starter'
) RETURNS UUID AS $$
DECLARE
  v_org_id UUID;
BEGIN
  INSERT INTO organizations (clerk_org_id, name, slug, tier)
  VALUES (p_clerk_org_id, p_name, p_slug, p_tier)
  ON CONFLICT (clerk_org_id) DO UPDATE
  SET
    name = EXCLUDED.name,
    slug = EXCLUDED.slug,
    tier = EXCLUDED.tier,
    updated_at = NOW()
  RETURNING id INTO v_org_id;
  
  RETURN v_org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to sync organization membership
CREATE OR REPLACE FUNCTION sync_organization_membership(
  p_clerk_membership_id TEXT,
  p_clerk_org_id TEXT,
  p_clerk_user_id TEXT,
  p_role VARCHAR(50) DEFAULT 'member'
) RETURNS UUID AS $$
DECLARE
  v_org_id UUID;
  v_user_id UUID;
  v_membership_id UUID;
BEGIN
  -- Get organization and user IDs
  SELECT id INTO v_org_id FROM organizations WHERE clerk_org_id = p_clerk_org_id;
  SELECT id INTO v_user_id FROM users WHERE clerk_user_id = p_clerk_user_id;
  
  IF v_org_id IS NULL OR v_user_id IS NULL THEN
    RAISE EXCEPTION 'Organization or user not found';
  END IF;
  
  INSERT INTO organization_members (clerk_membership_id, organization_id, user_id, role)
  VALUES (p_clerk_membership_id, v_org_id, v_user_id, p_role)
  ON CONFLICT (clerk_membership_id) DO UPDATE
  SET
    role = EXCLUDED.role,
    updated_at = NOW()
  RETURNING id INTO v_membership_id;
  
  -- Update user's organization_id if this is their primary org
  UPDATE users
  SET organization_id = v_org_id
  WHERE id = v_user_id AND organization_id IS NULL;
  
  RETURN v_membership_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 03-rls-policies.sql

```sql
-- Enable RLS on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- Organizations: Users can view their organizations
CREATE POLICY "Users can view their organizations"
ON organizations FOR SELECT
TO authenticated
USING (
  id IN (
    SELECT organization_id
    FROM organization_members
    WHERE user_id = auth.uid()
  )
);

-- Users: Users can view users in their organizations
CREATE POLICY "Users can view users in their organizations"
ON users FOR SELECT
TO authenticated
USING (
  organization_id IN (
    SELECT organization_id
    FROM organization_members
    WHERE user_id = auth.uid()
  )
);

-- Locations: Users can view locations in their organizations
CREATE POLICY "Users can view locations in their organizations"
ON locations FOR SELECT
TO authenticated
USING (
  organization_id IN (
    SELECT organization_id
    FROM organization_members
    WHERE user_id = auth.uid()
  )
);

-- Locations: Admins can manage locations
CREATE POLICY "Admins can manage locations"
ON locations FOR ALL
TO authenticated
USING (
  organization_id IN (
    SELECT organization_id
    FROM organization_members
    WHERE user_id = auth.uid()
    AND role = 'admin'
  )
);

-- Audits: Users can view audits in their organizations
CREATE POLICY "Users can view audits in their organizations"
ON audits FOR SELECT
TO authenticated
USING (
  organization_id IN (
    SELECT organization_id
    FROM organization_members
    WHERE user_id = auth.uid()
  )
);

-- Audits: Inspectors and admins can create audits
CREATE POLICY "Inspectors can create audits"
ON audits FOR INSERT
TO authenticated
WITH CHECK (
  organization_id IN (
    SELECT organization_id
    FROM organization_members
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'inspector')
  )
);

-- Similar policies for other tables...
```

---

## 🔐 ENVIRONMENT VARIABLES

### Complete .env.local

```env
# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/onboarding

# Clerk Webhooks
CLERK_WEBHOOK_SECRET=whsec_...

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...

# Database (for Drizzle)
DATABASE_URL=postgresql://postgres:password@localhost:54322/postgres

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Optional: Sentry, etc.
```

---

## 🧪 TESTING CHECKLIST

### Authentication
- [ ] User can sign up
- [ ] User can sign in
- [ ] User can sign out
- [ ] User can create organization
- [ ] User can join organization
- [ ] User can switch organizations
- [ ] Clerk webhooks sync to Supabase

### Organization Management
- [ ] Organization created in Clerk → synced to Supabase
- [ ] Organization updated in Clerk → synced to Supabase
- [ ] Organization member added → synced to Supabase
- [ ] Organization member removed → synced to Supabase

### Dashboard
- [ ] Dashboard loads with organization data
- [ ] KPI cards show correct data
- [ ] Audit list filters by organization
- [ ] Location selector shows only org locations

### Audits
- [ ] Create new audit
- [ ] View audit detail
- [ ] Edit audit
- [ ] Delete audit (admin only)
- [ ] Upload photos
- [ ] Complete audit checklist

### Actions
- [ ] Create action from audit
- [ ] View action list
- [ ] Update action status
- [ ] Complete action
- [ ] Verify action (admin)

### Reports
- [ ] Generate PDF report
- [ ] Send report via email
- [ ] View report history

### Settings
- [ ] Update organization branding
- [ ] Manage locations
- [ ] Manage users
- [ ] Update subscription tier

### Mobile
- [ ] Bottom navigation works
- [ ] All pages responsive
- [ ] Touch interactions work
- [ ] Photos upload on mobile

---

## 🚀 DEPLOYMENT

### Local Development

```bash
# Start Supabase locally
npx supabase start

# Start Next.js dev server
npm run dev

# Run migrations
npm run db:migrate
```

### Production Deployment

1. **Deploy to Vercel**
   - Connect GitHub repo
   - Add environment variables
   - Deploy

2. **Update Clerk Webhooks**
   - Update webhook URL to production
   - Test webhook delivery

3. **Supabase Production**
   - Run migrations on production
   - Setup RLS policies
   - Configure storage buckets

---

## 📚 ADDITIONAL RESOURCES

### Clerk Documentation
- https://clerk.com/docs
- https://clerk.com/docs/organizations/overview
- https://clerk.com/docs/webhooks/overview

### Supabase Documentation
- https://supabase.com/docs
- https://supabase.com/docs/guides/auth
- https://supabase.com/docs/guides/database

### SaaS Boilerplate
- https://github.com/ixartz/SaaS-Boilerplate
- https://react-saas.com

---

## ✅ NEXT STEPS

1. ✅ Setup new project
2. ✅ Configure Clerk
3. ✅ Setup Supabase
4. ✅ Run database migrations
5. ✅ Migrate components
6. ✅ Update routing
7. ✅ Test authentication flow
8. ✅ Test organization sync
9. ✅ Test all features
10. ✅ Deploy to production

---

**Laatste update**: 2025-01-XX
**Versie**: 1.0.0
