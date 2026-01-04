# Humane Meeting Coordinator - Setup Instructions

## 1. Azure App Registration
To allow users to sign in and access the Graph API, you must register the app in Azure.

1. Go to the [Azure Portal > App Registrations](https://portal.azure.com/#view/Microsoft_AAD_IAM/ActiveDirectoryMenuBlade/~/RegisteredApps).
2. Click **New registration**.
3. **Name**: `Humane Meeting Coordinator`.
4. **Supported account types**: 
   - Select **"Accounts in any organizational directory (Any Microsoft Entra ID tenant - Multitenant) and personal Microsoft accounts (e.g. Skype, Xbox)"**.
   - *Note: This allows both business and personal accounts to sign in.*
5. **Redirect URI**:
   - Platform: **Single-page application (SPA)**
   - URI: `http://localhost:5173` (for local development)
6. Click **Register**.

## 2. Configure Code
1. Copy the **Application (client) ID** from the Overview page.
2. Open `src/authConfig.js` in this project.
3. Replace `"ENTER_YOUR_CLIENT_ID_HERE"` with your copied Client ID.

## 3. Deploy to Vercel
1. Push this code to a GitHub repository.
2. Import the project in Vercel.
3. Once deployed, Vercel will give you a production URL (e.g., `https://humane-meeting.vercel.app`).
4. **Go back to Azure Portal**:
   - Select your App Registration.
   - Go to **Authentication**.
   - Under **Single-page application**, add the unexpected Vercel URL as a **new Redirect URI**.
   - *Example*: `https://humane-meeting.vercel.app` (no trailing slash).

## 4. Run Locally
```bash
npm install
npm run dev
```
