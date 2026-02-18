# LatchLog

Lock status management app for households, offices, and shared spaces. Track who locked or unlocked doors in real-time via NFC, QR code, or manual input.

## Tech Stack

- **Mobile**: React Native (Expo SDK 54) + Expo Router
- **Backend**: Supabase (PostgreSQL, Auth, Realtime, Edge Functions)
- **Styling**: NativeWind (Tailwind CSS for React Native)
- **State**: Zustand
- **Language**: TypeScript
- **i18n**: Hebrew (RTL) first, i18next

## Getting Started

### Prerequisites

- Node.js 18+
- Expo CLI (`npm install -g expo-cli`)
- Supabase account and project

### Setup

1. Clone the repository and install dependencies:

```bash
npm install
```

2. Copy the environment file and fill in your Supabase credentials:

```bash
cp .env.example .env
```

3. Run the Supabase migration against your project:

```bash
# Via Supabase CLI
supabase db push
# Or manually run supabase/migrations/20260218_initial_schema.sql in the SQL editor
```

4. Deploy Edge Functions:

```bash
supabase functions deploy record-event
supabase functions deploy join-group
supabase functions deploy send-push
```

5. Start the development server:

```bash
npx expo start
```

### Running on Device

```bash
npx expo run:ios      # iOS simulator/device
npx expo run:android  # Android emulator/device
```

### App Clip

The App Clip is built from the same codebase using `react-native-app-clip`. To test:

```bash
npx expo run:ios --scheme LatchLogClip
```

## Project Structure

```
app/                    Expo Router screens
  (auth)/               Login/register flows
  (tabs)/               Bottom tab navigation (home, history, settings)
  lock/                 Lock detail and creation
  group/                Group management, join, invite
  scan.tsx              QR scanner
  clip.tsx              App Clip entry point
src/
  components/           Reusable UI components
  hooks/                Data fetching and business logic hooks
  lib/                  Supabase client, NFC, i18n, notifications
  stores/               Zustand state stores
  types/                TypeScript type definitions
  locales/              i18n translation files
supabase/
  migrations/           Database schema and RLS policies
  functions/            Edge Functions (record-event, join-group, send-push)
```

## Features

- Lock/unlock recording via NFC, QR code, or manual input
- Real-time status updates across all group members
- Event history with filtering
- Group management with role-based permissions (Admin/Member/Guest)
- Push notifications on lock/unlock events
- iOS App Clip for quick NFC-triggered actions
- Dark mode UI with Hebrew RTL support
- Freemium model (2 locks, 3 members free)
