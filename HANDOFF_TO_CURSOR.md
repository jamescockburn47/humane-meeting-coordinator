# Humane Meeting Coordinator - Migration Handoff

**Current Status**: Live (v1.0) at [https://humanecalendar.com](https://humanecalendar.com)
**Immediate Action Required**: You must run `git push` to deploy the final redirect URI fix.

## 1. Project Overview
A privacy-first scheduling tool designed to find the intersection of availability across different organizations (Microsoft 365 & Google Workspace) without sharing event details.

*   **Core Logic**: "Availability Sync". We fetch Free/Busy API data (not events) and cache anonymous time slots in Supabase to perform SQL-based intersection queries.
*   **Privacy**: We strictly requested `start` and `end` times only. No `subject`, `location`, or `attendees` are verified or stored.

## 2. Tech Stack
*   **Frontend**: React + Vite (SPA).
*   **Styling**: Plain CSS (Solicitor Navy Theme variables in `src/index.css`).
*   **Auth**: 
    *   Microsoft: `@azure/msal-react` (Outlook/Teams).
    *   Google: `@react-oauth/google` (Gmail).
*   **Database**: Supabase (PostgreSQL).
    *   `profiles`: Users + "Humane Windows" (JSONB).
    *   `groups`: Meeting groups + Owner tracking.
    *   `group_members`: Link tables + Admin status.
    *   `availability_cache`: Temporary storage of busy slots for intersection calculation.
*   **hosting**: Vercel (Frontend), Supabase (Backend).

## 3. Environment Variables (.env)
You need these in your local `.env` and Vercel Project Settings.

```bash
# Frontend (prefix with VITE_ for client access)
VITE_SUPABASE_URL=https://ldlngbfchxnfycwygmqx.supabase.co
VITE_SUPABASE_ANON_KEY=[Your_Supabase_Key]
VITE_ORGANISER_CODE=humane2026

# Backend (Vercel Serverless Functions - no VITE_ prefix)
GEMINI_API_KEY=[Your_Gemini_API_Key]
```

To get a Gemini API key:
1. Go to https://aistudio.google.com/apikey
2. Create a new API key
3. Add it to Vercel: Project Settings → Environment Variables → Add `GEMINI_API_KEY`

## 4. Key Features Implemented (v1)
1.  **Multi-Window Availability**: Users define "Humane Hours" (e.g. 9-12, 2-5). Supports Regional Weekends (Sun-Thu).
2.  **Date Range Search**: `scheduler.js` scans multiple days to find overlaps.
3.  **Group Administration**:
    *   Creator is tracked in `groups.created_by`.
    *   Creator can **Kick Members** and **Promote Admins**.
    *   **Creator Priority**: The scheduler defaults to finding times that work for the Admin FIRST.
4.  **Guest Mode**: Users can join with a code and view times without logging in (Auth is stripped from read-only views).

## 5. Deployment & Domain
*   **Domain**: `humanecalendar.com` (Managed via Namecheap, pointing to Vercel).
*   **Redirect URIs**: 
    *   The app uses `window.location.origin` to support both Localhost and Production dynamically.
    *   **You must whitelist** `https://humanecalendar.com` in:
        1.  Supabase (Auth -> URL Config).
        2.  Azure Portal (App Registration -> Authentication).
        3.  Google Cloud Console (Credentials).

## 6. Known Issues / Next Steps
*   **Pending Push**: The change to `src/authConfig.js` to support dynamic redirects is **Staged** but not Pushed.
    *   **Fix in Cursor**: Open terminal -> `git commit -m "Fix prod redirect" && git push`.
*   **Google Auth**: Google sometimes throws 400 errors if the "Redirect URI" hasn't propagated. Wait 10-15 mins after configuring Google Cloud.

## 7. Key Files
*   `src/App.jsx`: Main routing and UI state manager.
*   `src/components/GroupView.jsx`: The core UI for the meeting group (Member list + Search).
*   `src/components/SchedulingAssistant.jsx`: AI chat assistant (Gemini-powered).
*   `src/services/scheduler.js`: The "Brain". Contains `findCommonHumaneSlots` algorithm.
*   `src/services/supabase.js`: Database interaction layer.
*   `src/authConfig.js`: MSAL configuration (verify `redirectUri` here!).
*   `api/chat.js`: Vercel serverless function for AI assistant API.