# Personal Meal Planning & Inventory Management App

A personal meal planning system that manages fridge inventory, suggests recipes based on available ingredients, handles ingredient flexibility/alternatives, and generates grocery lists. Built for a 2-user household (shared recipes, separate inventories).

## Overview

This app helps you:
- Track what's in your fridge (per-user inventory)
- Save and share recipes (global, co-editable)
- Discover what you can make right now with current ingredients
- Cook meals and automatically deduct ingredients from inventory
- Generate consolidated grocery lists from selected recipes

**Key Design Decisions:**
- **Per-user data isolation**: Each user has their own fridge inventory and grocery lists
- **Global recipes**: Recipes are shared between both users and can be edited by either
- **Recipe-scoped alternatives**: Ingredient alternatives are defined per recipe ingredient (not globally)
- **No public signup**: Only 2 pre-created users can access the app (security requirement)

## Tech Stack

- **Frontend/Backend**: Next.js 16 (App Router) with TypeScript
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth with email/password
- **Hosting**: Vercel (free tier)
- **Styling**: Tailwind CSS
- **Validation**: Zod
- **Rate Limiting**: rate-limiter-flexible

## Architecture

```
┌─────────────┐
│   Next.js   │
│   App Router│
└──────┬──────┘
       │
       ├─── API Routes (/app/api/*)
       │    └─── All routes require authentication
       │
       ├─── Protected Pages (/app/(protected)/*)
       │    └─── Layout checks auth, redirects to /login
       │
       └─── Supabase Client
            ├─── Server: createServerClient (cookies)
            └─── Client: createBrowserClient
                 │
                 └─── Supabase Auth + PostgreSQL
                      └─── Row Level Security (RLS) enforced
```

## Database Schema

### Core Tables

**`app_users`** (Whitelist)
- `user_id` (uuid, PK, references auth.users)
- `email` (text, unique)
- Purpose: Whitelist of allowed users. Users can insert themselves on first login.

**`ingredients`** (Per-user fridge inventory)
- `id` (uuid, PK)
- `user_id` (uuid, FK → auth.users)
- `name` (text)
- `quantity` (numeric)
- `unit` (text: oz, lb, cup, count, tbsp, tsp, etc.)
- `created_at`, `updated_at` (timestamptz)

**`recipes`** (Global, co-editable)
- `id` (uuid, PK)
- `author_user_id` (uuid, FK → auth.users) - shows who created it
- `name` (text)
- `instructions` (text, optional)
- `servings` (integer, optional)
- `created_at`, `updated_at` (timestamptz)

**`recipe_ingredients`** (Ingredients required for a recipe)
- `id` (uuid, PK)
- `recipe_id` (uuid, FK → recipes)
- `ingredient_name` (text)
- `quantity` (numeric)
- `unit` (text)
- `allows_alternatives` (boolean) - whether this ingredient can use alternatives

**`recipe_ingredient_alternatives`** (Recipe-scoped alternatives)
- `id` (uuid, PK)
- `recipe_ingredient_id` (uuid, FK → recipe_ingredients)
- `alternative_name` (text)
- `conversion_ratio` (numeric) - e.g., 1.0 for raw beef, 0.75 for cooked beef
- `notes` (text, optional)

**`grocery_lists`** (Per-user shopping lists)
- `id` (uuid, PK)
- `user_id` (uuid, FK → auth.users)
- `created_at` (timestamptz)
- `completed` (boolean)
- `week_starting` (date, optional)

**`grocery_list_items`**
- `id` (uuid, PK)
- `grocery_list_id` (uuid, FK → grocery_lists)
- `ingredient_name` (text)
- `quantity` (numeric)
- `unit` (text)
- `purchased` (boolean)

## Row Level Security (RLS)

**Strict isolation enforced:**

- **`ingredients`, `grocery_lists`, `grocery_list_items`**: Users can only access their own data (`auth.uid() = user_id`)
- **`recipes`, `recipe_ingredients`, `recipe_ingredient_alternatives`**: Global access - any whitelisted user can read/write
- **`app_users`**: Users can only read their own row, but can insert themselves (fixes bootstrap race condition)
- **All tables**: Require user to exist in `app_users` whitelist

## Core Features

### 1. Fridge Inventory Management
- **Route**: `/inventory`
- **API**: `GET/POST /api/inventory`, `PATCH/DELETE /api/inventory/[id]`
- **Behavior**: Per-user CRUD operations on ingredients
- **RLS**: Users only see/edit their own inventory

### 2. Recipe Management
- **Route**: `/recipes`
- **API**: 
  - `GET/POST /api/recipes`
  - `GET/PUT/DELETE /api/recipes/[id]`
  - `GET/POST /api/recipes/[id]/ingredients`
  - `GET/POST /api/recipes/[id]/ingredients/[ingredientId]/alternatives`
- **Behavior**: 
  - Global recipes (both users see/edit all)
  - When creating, `author_user_id` is set to current user
  - Ingredients can be marked with `allows_alternatives: true`
  - Alternatives are defined per recipe ingredient (not globally)

### 3. Recipe Discovery
- **Route**: `/discover`
- **API**: `GET /api/discover`
- **Algorithm**:
  1. Fetch all recipes
  2. For each recipe, check if all ingredients are satisfied:
     - Check exact match in user's inventory
     - If no match and `allows_alternatives: true`, check all alternatives
     - Apply `conversion_ratio` when comparing quantities
  3. Classify recipes:
     - **makeable**: All ingredients satisfied
     - **missing_1**: Missing exactly 1 ingredient
     - **missing_2+**: Missing 2+ ingredients
- **Returns**: Sorted lists (makeable first, then by missing count, then name)

### 4. Cook a Meal
- **Route**: `/cook`
- **API**: `POST /api/cook`
- **Body**: `{ recipeId: string, confirm: boolean }`
- **Behavior**:
  - If `confirm: false`: Returns preview of what will be deducted
  - If `confirm: true`: 
    - Validates all ingredients are available (with alternatives)
    - Deducts quantities from inventory
    - Handles partial quantities (if recipe needs 1 cup but you have 2, leaves 1 remaining)
    - Returns error if insufficient ingredients

### 5. Grocery List Generator
- **Route**: `/grocery`
- **API**: 
  - `GET/POST /api/grocery-lists`
  - `GET/PATCH/DELETE /api/grocery-lists/[id]`
- **Generation Logic** (`POST /api/grocery-lists`):
  1. User selects recipes they want to make (`selectedRecipeIds`)
  2. Aggregate all required ingredients across selected recipes
  3. For each required ingredient:
     - Check user's current inventory (including alternatives)
     - If sufficient → skip
     - If insufficient → add difference to list
     - If none → add full amount
  4. Consolidate duplicate ingredients (sum quantities, keep same unit)
  5. Create `grocery_list` and `grocery_list_items`
- **Marking**: Users can mark items as `purchased` and mark entire list as `completed`

## Authentication Flow

1. **User Creation**: Users must be manually created in Supabase Dashboard (Auth → Users)
2. **Login**: `/login` page uses Supabase `signInWithPassword`
3. **Bootstrap**: On successful login, `/api/ensure-allowed` is called to insert user into `app_users` (idempotent)
4. **Session**: Supabase session cookies are set automatically
5. **Protection**: 
   - All API routes call `requireUser()` which verifies session
   - Protected pages use layout that checks auth and redirects to `/login`

## Setup Instructions

### Prerequisites
- Node.js 18+
- pnpm (or npm/yarn)
- Supabase account and project

### Local Development

1. **Clone and install**:
```bash
cd grocery
pnpm install
```

2. **Set up Supabase**:
```bash
# Install Supabase CLI (if not already)
brew install supabase/tap/supabase

# Login and link project
supabase login
supabase link --project-ref <YOUR_PROJECT_REF>

# Apply migrations
supabase db push
```

3. **Environment variables** (`.env.local`):
```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=your_publishable_key
```

4. **Create users**:
   - Go to Supabase Dashboard → Authentication → Users
   - Create 2 users (email + password, auto-confirm ON)
   - Copy their UUIDs

5. **Whitelist users** (SQL Editor in Supabase):
```sql
insert into public.app_users(user_id, email) values
  ('<uuid_1>', 'user1@example.com'),
  ('<uuid_2>', 'user2@example.com');
```

6. **Run dev server**:
```bash
pnpm dev
```

7. **Access**: http://localhost:3000/login

### Vercel Deployment

1. **Push to GitHub**
2. **Import in Vercel**: Connect your GitHub repo
3. **Set environment variables** in Vercel project settings:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY`
4. **Deploy**: Vercel will auto-deploy on push

## File Structure

```
grocery/
├── src/
│   ├── app/
│   │   ├── (protected)/          # Protected routes (require auth)
│   │   │   ├── inventory/        # Fridge inventory page
│   │   │   ├── recipes/          # Recipe management page
│   │   │   ├── discover/         # Recipe discovery page
│   │   │   ├── cook/             # Cook a meal page
│   │   │   ├── grocery/          # Grocery lists page
│   │   │   ├── settings/         # Settings page
│   │   │   └── layout.tsx        # Auth check + redirect
│   │   ├── api/                  # API route handlers
│   │   │   ├── inventory/        # Inventory CRUD
│   │   │   ├── recipes/          # Recipe CRUD + ingredients + alternatives
│   │   │   ├── discover/         # Recipe matching logic
│   │   │   ├── cook/             # Meal cooking + deduction
│   │   │   ├── grocery-lists/    # Grocery list CRUD + generation
│   │   │   └── ensure-allowed/   # Whitelist bootstrap
│   │   ├── login/                # Login page
│   │   └── page.tsx              # Root redirect
│   └── lib/
│       ├── supabase/
│       │   ├── client.ts         # Browser Supabase client
│       │   └── server.ts        # Server Supabase client + requireUser()
│       └── rateLimit.ts          # Rate limiting utility
├── supabase/
│   └── migrations/               # SQL migrations
├── middleware.ts                 # API route protection
└── package.json
```

## Key Business Logic

### Ingredient Matching Algorithm

Located in `/api/discover/route.ts`:

1. For each recipe ingredient:
   - Check exact name match in user's inventory
   - If match found: verify quantity is sufficient
   - If no match and `allows_alternatives: true`:
     - Fetch all alternatives for this recipe ingredient
     - Check each alternative name in inventory
     - Apply `conversion_ratio` when comparing quantities
     - Example: Recipe needs 1 lb ground beef, you have 1.5 lb taco meat with ratio 1.0 → ✅ makeable

2. Recipe classification:
   - **makeable**: All ingredients satisfied
   - **missing_1**: Exactly 1 ingredient missing
   - **missing_2+**: 2+ ingredients missing

### Grocery List Generation

Located in `/api/grocery-lists/route.ts`:

1. Aggregate ingredients from selected recipes
2. For each unique ingredient:
   - Sum quantities across recipes (must have same unit)
   - Check user's inventory (including alternatives)
   - Calculate needed amount (required - available)
   - If needed > 0, add to grocery list
3. Consolidate duplicates (same ingredient name + unit)

### Inventory Deduction (Cook Meal)

Located in `/api/cook/route.ts`:

1. Validate all ingredients available (with alternatives)
2. For each ingredient:
   - Find matching inventory item (exact or alternative)
   - Calculate new quantity (current - required)
   - If new quantity < 0, abort with error
   - Update inventory (or delete if quantity becomes 0)

## Security Notes

- **No public signup**: Users must be pre-created in Supabase Dashboard
- **RLS on all tables**: Database-level security enforced
- **API route protection**: All routes require authentication via `requireUser()`
- **Rate limiting**: Basic IP-based rate limiting on API routes
- **HTTPS**: Enforced in production (Vercel)
- **Whitelist**: Only users in `app_users` can access anything

## Development Notes

- **TypeScript**: Strict mode enabled
- **Error handling**: API routes return appropriate HTTP status codes
- **Validation**: Request bodies validated with Zod schemas
- **Async/await**: All database operations are async
- **Next.js 15**: Uses async `cookies()` API (must be awaited)

## Future Enhancements (Not Implemented)

- Meal history tracking
- Nutritional information
- Recipe favorites/bookmarks
- Shopping list templates
- Ingredient expiration dates
- Recipe scaling (adjust servings)
