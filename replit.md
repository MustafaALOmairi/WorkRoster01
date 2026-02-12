# Shift Calendar

## Overview

Shift Calendar is a mobile-first application built with Expo (React Native) that helps shift workers track and manage their rotating work schedules. Users can view a calendar with color-coded shifts (morning, evening, night, rest), search for specific shift types across dates, add notes to individual days, and export/share their schedules. The app supports bilingual UI (Arabic and English), dark/light themes, and customizable shift color palettes. It has an Express backend server, though most functionality currently lives client-side using AsyncStorage for persistence.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend (Expo / React Native)

- **Framework**: Expo SDK 54 with expo-router for file-based routing
- **Navigation**: Side drawer menu accessible from hamburger icon on calendar screen. Drawer contains: Search, Customize, Theme Store, Settings, About. Each opens as a stack screen. Day details shown in a form sheet modal (`day-detail.tsx`). No bottom tabs.
- **State Management**: React Context providers for core state:
  - `ShiftContext` — shift pattern configuration (start date, rotation pattern)
  - `ThemeContext` — theme mode (light/dark), language (ar/en), shift color customization
  - `NotesContext` — per-day notes with reminder toggles
- **Data Persistence**: All user preferences and data stored locally via `@react-native-async-storage/async-storage`. No server-side user data storage is actively used
- **Styling**: StyleSheet-based with a centralized color system (`constants/colors.ts`) that generates theme-aware colors including shift-specific backgrounds
- **Fonts**: Cairo (Arabic-friendly Google Font) in Regular, SemiBold, and Bold weights
- **Animations**: react-native-reanimated for transitions
- **Haptics**: expo-haptics for tactile feedback on interactions
- **Key Libraries**: expo-print and expo-sharing for PDF export of schedules

### Backend (Express)

- **Runtime**: Express 5 running on Node.js with TypeScript (compiled via tsx for dev, esbuild for production)
- **Purpose**: Currently minimal — serves as an API server skeleton and static file server for production builds. Routes are registered in `server/routes.ts` but no application-specific API endpoints exist yet
- **Storage**: `server/storage.ts` implements an in-memory storage (`MemStorage`) with a basic user CRUD interface. This is a placeholder — no actual user authentication flow is wired up
- **CORS**: Configured to allow Replit dev/deployment domains and localhost origins
- **Static serving**: In production, serves the Expo web build from a `dist/` directory

### Shared Layer

- **Schema**: `shared/schema.ts` defines a PostgreSQL `users` table using Drizzle ORM with Zod validation via `drizzle-zod`. This schema exists but isn't actively used by the app yet
- **Database**: Drizzle is configured for PostgreSQL (`drizzle.config.ts`) expecting a `DATABASE_URL` environment variable. The database can be provisioned and migrated with `npm run db:push`

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

- **PostgreSQL**: Configured via Drizzle ORM but not actively used yet. Schema defined in `shared/schema.ts`. Will need `DATABASE_URL` environment variable when database is provisioned
- **AsyncStorage**: Primary data persistence mechanism for all user-facing data (shift config, notes, theme preferences)
- **Expo Services**: Standard Expo managed workflow services (OTA updates, build service compatibility)
- **Google Fonts**: Cairo font family loaded via `@expo-google-fonts/cairo`
- **TanStack React Query**: Set up with a custom query client (`lib/query-client.ts`) that points to the Express API server. Currently unused but ready for server-side data fetching
- **OpenAI (via Replit AI Integrations)**: Used for AI-powered theme generation in the Theme Store. The backend endpoint `POST /api/generate-theme` calls `gpt-4o-mini` to generate cohesive color themes from user descriptions. Uses `AI_INTEGRATIONS_OPENAI_API_KEY` and `AI_INTEGRATIONS_OPENAI_BASE_URL` environment variables (auto-managed by Replit)
- **Theme Store**: Features 3 pre-made themes (Minimalist White, Purple Dream, Bold Classic) plus AI-generated themes. AI themes are saved locally via AsyncStorage (up to 10). Full-app themes control accent color, shift colors, theme mode, surfaces, text colors, and borders. `StoreTheme` interface in `lib/ThemeContext.tsx`