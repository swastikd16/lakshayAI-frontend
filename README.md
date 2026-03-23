# LakshayAI Frontend

React + TypeScript + Vite frontend for LakshayAI, including:
- Auth flow (sign in/sign up)
- Onboarding + dashboard
- Study planner
- Adaptive practice + review
- Doubt solver
- Revision + analytics
- Video Notes (YouTube transcript -> AI notes + Mermaid preview)

## 1) Tech Stack

- **Framework:** React 18
- **Language:** TypeScript
- **Bundler:** Vite 5
- **Styling:** Tailwind CSS + PostCSS + Autoprefixer
- **Routing:** Hash-based routing (`#/...`) implemented in `src/App.tsx`
- **Auth/session:** Local storage session + backend token validation (`AuthContext`)

## 2) Prerequisites

- Node.js **18+** (Node 20 recommended)
- npm **9+**
- Running LakshayAI backend API (default expected at `http://localhost:4000`)

## 3) Setup

### Install dependencies

```bash
npm install
```

### Environment file

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

Then update:

```env
VITE_API_BASE_URL=http://localhost:4000
```

## 4) Run

### Development

```bash
npm run dev
```

### Production build

```bash
npm run build
```

### Preview production build

```bash
npm run preview
```

## 5) Frontend Environment Variables

Defined in `LakshayAI-frontend/.env` (not committed) and documented in `.env.example`.

- `VITE_API_BASE_URL`
  - Base URL of backend API used by `src/lib/apiClient.ts`
  - Example: `http://localhost:4000`

## 6) Backend Dependencies for Frontend Features

The frontend depends on backend routes/data. For all pages to work:

- Backend must be running.
- Supabase schema must include latest migrations.
- For **Video Notes** feature:
  - backend route `/multimodal/...` must be mounted
  - backend migration `005_multimodal_video_notes.sql` must be applied
  - backend Python dependency `youtube-transcript-api` must be installed (backend-side)

## 7) Route Map (Hash Routing)

Handled by `src/App.tsx`:

- `#/` landing page
- `#/auth/signin`
- `#/auth/signup`
- `#/onboarding`
- `#/onboarding/revisit`
- `#/dashboard`
- `#/planner`
- `#/adaptive-practice`
- `#/adaptive-review`
- `#/video-notes`
- `#/doubt-solver`
- `#/revision`
- `#/analytics`
- `#/profile`

## 8) Project Structure

```txt
LakshayAI-frontend/
  src/
    components/
      StudyShell.tsx
      studyNav.ts
    contexts/
      AuthContext.tsx
    lib/
      apiClient.ts
      apiTypes.ts
    pages/
      DashboardPage.tsx
      StudyPlannerPage.tsx
      AdaptivePracticePage.tsx
      AdaptiveReviewPage.tsx
      VideoNotesPage.tsx
      DoubtSolverPage.tsx
      RevisionPage.tsx
      AnalyticsPage.tsx
      ProfilePage.tsx
      OnboardingPage.tsx
    App.tsx
    main.tsx
    index.css
```

## 9) Key Dependency/Config Files (and Why They Matter)

- `package.json`
  - App metadata, scripts, dependencies.
- `package-lock.json`
  - Exact dependency lockfile for reproducible installs.
- `.env.example`
  - Template for required env variables.
- `.gitignore`
  - Excludes local env files, dist output, node_modules, editor temp files.
- `tsconfig.json`
  - TypeScript compiler settings and path aliases.
- `vite.config.ts`
  - Vite plugin setup and alias `@ -> src`.
- `tailwind.config.ts`
  - Tailwind content globs + design tokens (colors/fonts/shadows).
- `postcss.config.mjs`
  - Tailwind + autoprefixer PostCSS pipeline.
- `index.html`
  - Vite HTML entry file.
- `src/main.tsx`
  - React bootstrap + `AuthProvider` root wiring.
- `src/lib/apiClient.ts`
  - Centralized HTTP helpers (`get`, `post`, `postWithMeta`) + error handling.

## 10) Common Issues / Troubleshooting

### `Missing VITE_API_BASE_URL`
- Add the variable to `.env`.
- Restart dev server after changing env files.

### `Request failed with status 404`
- Usually backend route missing or old backend instance.
- Confirm backend is running expected version and URL.

### Auth keeps resetting
- Check browser local storage key `lakshay-ai.session`.
- Verify backend `/auth/me` works with current token.

### Video Notes fails
- Ensure backend `/multimodal` routes exist.
- Ensure backend migration `multimodal_video_notes` table is applied.
- Ensure backend Python transcript dependency is installed.

## 11) Notes for Contributors

- Keep API calls centralized in `src/lib/apiClient.ts`.
- Add/extend response contracts in `src/lib/apiTypes.ts`.
- Reuse `StudyShell` for authenticated page layout consistency.
- Keep hash-route additions synchronized in:
  - `src/App.tsx` route parser/render switch
  - `src/components/studyNav.ts` nav config
