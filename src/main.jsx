import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { GoogleOAuthProvider } from '@react-oauth/google';

import { PublicClientApplication } from "@azure/msal-browser";
import { MsalProvider } from "@azure/msal-react";
import { msalConfig } from "./authConfig";

const msalInstance = new PublicClientApplication(msalConfig);

// Google Client ID
const GOOGLE_CLIENT_ID = "184633116224-858c34kf4nsa3gbm53o6dnv3l0sh5cm2.apps.googleusercontent.com";

// Initialize MSAL instance outside of the component tree
msalInstance.initialize().then(() => {
  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
        <MsalProvider instance={msalInstance}>
          <App />
        </MsalProvider>
      </GoogleOAuthProvider>
    </React.StrictMode>,
  )
});
