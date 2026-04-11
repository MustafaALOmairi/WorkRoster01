# Shift Calendar

## Overview

Shift Calendar is a mobile-first application built with Expo (React Native) that helps shift workers track and manage their rotating work schedules. Users can view a calendar with color-coded shifts (morning, evening, night, rest), search for specific shift types across dates, add notes to individual days, and export/share their schedules. The app supports bilingual UI (Arabic and English), dark/light themes, and customizable shift color palettes. It has an Express backend server with optional user accounts and automatic cloud data sync.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend (Expo / React Native)

- **Framework**: Expo SDK 54 with expo-router for file-based routing
- **Navigation**: Side drawer menu accessible from hamburger icon on calendar screen (slides from left). Drawer contains: Search, Customize, Theme Store, Settings, Account, About. Each opens as a stack screen. Day details shown in a form sheet modal (`day-detail.tsx`). No bottom tabs. Language toggle button in the main header (top-right).
- **State Management**: React Context providers for core state:
  - `AuthContext` — optional user authentication (login/register/logout), session management
  - `ShiftContext` — shift pattern configuration (start date, rotation pattern)
  - `ThemeContext` — theme mode (light/dark), language (ar/en), shift color customization
  - `NotesContext` — per-day notes with reminder toggles
  - `DataSyncProvider` — auto-syncs all local data to server when user is logged in
- **Data Persistence**: All user preferences and data stored locally via `@react-native-async-storage/async-storage`. When logged in, data is automatically synced to PostgreSQL via the Express backend
- **Styling**: StyleSheet-based with a centralized color system (`constants/colors.ts`) that generates theme-aware colors including shift-specific backgrounds
- **Fonts**: Cairo (Arabic-friendly Google Font) in Regular, SemiBold, and Bold weights
- **Animations**: react-native-reanimated for transitions
- **Haptics**: expo-haptics for tactile feedback on interactions
- **Key Libraries**: expo-print and expo-sharing for PDF export of schedules
- **Circular Calendar**: Alternative radial calendar layout (`components/CircularCalendar.tsx`). Activated when a theme has `calendarLayout: "circular"` (e.g., "Cosmic Ring" theme). Days arranged in a ring with color-coded segments, selected day displayed in center, spring animation on month change.
- **Android Widget**: Home screen widget support via `react-native-home-widget`. Shows today's shift type (Arabic label), time range, and date. Updates automatically when app opens. Widget color matches shift type. Activated via Expo config plugin (`plugins/withAndroidWidget.js`) during `expo prebuild`. Widget files in `plugins/android-widget/`. Widget update logic in `lib/widgetService.ts`, called from `ShiftContext` on config changes.

### Backend (Express)

- **Runtime**: Express 5 running on Node.js with TypeScript (compiled via tsx for dev, esbuild for production)
- **Purpose**: API server for authentication, data sync, AI theme generation, holiday sharing, and static file serving for production builds
- **Authentication**: Username/password auth with bcryptjs password hashing and express-session with PostgreSQL session store (connect-pg-simple). Sessions last 30 days. Requires `SESSION_SECRET` env var
- **Data Sync**: When authenticated, users can save/load all app data (shift config, notes, theme prefs, AI themes) via `/api/user-data/save` and `/api/user-data/load` endpoints
- **CORS**: Configured to allow Replit dev/deployment domains and localhost origins
- **Static serving**: In production, serves the Expo web build from a `dist/` directory

### Shared Layer

- **Schema**: `shared/schema.ts` defines PostgreSQL tables using Drizzle ORM with Zod validation:
  - `users` — id, username (unique), email (optional), password (bcrypt hashed)
  - `user_data` — user_id (FK), shift_config (jsonb), notes (jsonb), theme_prefs (jsonb), ai_themes (jsonb), updated_at
  - `shared_holidays` — id (6-char code), holidays (jsonb), created_at
  - `session` — auto-created by connect-pg-simple for session storage
- **Database**: Drizzle configured for PostgreSQL. Migrate with `npm run db:push`
- **IMPORTANT**: Never use `--force` flag with db:push as it can drop tables with data. For adding columns, use safe ALTER TABLE via SQL if needed. Always verify schema changes won't cause data loss before applying.

### Authentication Flow

- App works fully without an account using local AsyncStorage
- Users can optionally create an account (username + password + optional email, min 3/6 chars)
- Login supports both username and email (auto-detected by `@` in input)
- On login, server data is loaded into local storage if available, then `triggerReload()` forces all contexts to re-read from AsyncStorage
- When logged in, any data changes are auto-synced to the server (debounced 3s)
- Auth screen (`app/auth.tsx`) shows login/register form when logged out, account profile when logged in
- Account accessible from drawer menu "Account" item
- Session cookies: `secure: true`, `sameSite: "none"`, `trust proxy: 1` for proper cookie persistence behind Replit's HTTPS proxy
- `DataSyncProvider` wraps all other providers (ThemeProvider, ShiftProvider, NotesProvider) and provides `reloadTrigger` context for cross-device data sync

### Shift Logic

- Core shift calculation logic lives in `lib/shift-utils.ts`
- Defines four shift types: morning, evening, night, rest
- Supports preset rotation patterns that users can select
- Calculates which shift applies to any given date based on a configurable start date and pattern cycle

### Build & Deployment

- **Dev**: Two processes run in parallel — Expo dev server (`expo:dev`) and Express server (`server:dev`)
- **Production**: Expo web is built via a custom build script (`scripts/build.js`) that bundles the web app, then the Express server is built with esbuild and serves the static output
- **Routing**: `app/+native-intent.tsx` redirects all deep links to root on native

## External Dependencies

- **PostgreSQL**: Used for user accounts, data sync, holiday sharing, and session storage. Schema defined in `shared/schema.ts`
- **AsyncStorage**: Primary data persistence mechanism for all user-facing data (shift config, notes, theme preferences)
- **bcryptjs**: Password hashing for user authentication
- **express-session + connect-pg-simple**: Session management with PostgreSQL backing store
- **Expo Services**: Standard Expo managed workflow services (OTA updates, build service compatibility)
- **Google Fonts**: Cairo font family loaded via `@expo-google-fonts/cairo`
- **TanStack React Query**: Set up with a custom query client (`lib/query-client.ts`) that points to the Express API server
- **OpenAI (via Replit AI Integrations)**: Used for AI-powered theme generation in the Theme Store. The backend endpoint `POST /api/generate-theme` calls `gpt-4o-mini` to generate cohesive color themes from user descriptions
- **Theme Store**: Features 3 pre-made themes (Minimalist White, Purple Dream, Bold Classic) plus AI-generated themes. AI themes are saved locally via AsyncStorage (up to 10)
