

// Utility to handle Google OAuth 2.0 / Google Identity Services (GIS) Sign-In

declare global {
  interface Window {
    google?: any;
  }
}

export interface GoogleUserData {
  email: string;
  name: string;
  picture: string;
  sub?: string;
  accessToken?: string;
  idToken?: string;
}

export async function fetchGoogleClientId(): Promise<string> {
  try {
    const res = await fetch('/api/auth/google/config');
    const data = await res.json();
    return data.clientId || (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID || '745576921142-63e6nrfnb9ams9g35d3n0oa364tcprnk.apps.googleusercontent.com';
  } catch (err) {
    console.warn('Error fetching Google client ID:', err);
    return (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID || '745576921142-63e6nrfnb9ams9g35d3n0oa364tcprnk.apps.googleusercontent.com';
  }
}

// Helper to decode base64 encoded JWT token from Google Identity Services ID token
export function parseJwt(token: string): any {
  try {
    const base64Url = token.split('.')[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    console.error('Error parsing JWT:', e);
    return null;
  }
}

// Load Google Identity Services SDK script dynamically if not present
export function loadGoogleGsiScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.id && window.google?.accounts?.oauth2) {
      resolve();
      return;
    }

    const existingScript = document.getElementById('google-gsi-script');
    if (existingScript) {
      if (window.google?.accounts) {
        resolve();
      } else {
        existingScript.addEventListener('load', () => resolve());
        existingScript.addEventListener('error', (e) => reject(e));
      }
      return;
    }

    const script = document.createElement('script');
    script.id = 'google-gsi-script';
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = (err) => reject(err);
    document.head.appendChild(script);
  });
}

// Initialize official Google Identity Services client (google.accounts.id / oauth2) and trigger Popup flow
export async function initializeAndTriggerGoogleGsi(
  clientId: string,
  onUserReceived: (user: GoogleUserData) => void,
  onError: (errMessage: string) => void
) {
  try {
    await loadGoogleGsiScript();

    if (!window.google?.accounts) {
      throw new Error('Google Identity Services SDK failed to load');
    }

    const effectiveClientId = clientId || (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID || '745576921142-63e6nrfnb9ams9g35d3n0oa364tcprnk.apps.googleusercontent.com';

    // 1. Initialize google.accounts.id with callback for JWT ID token response
    const handleCredentialResponse = (response: any) => {
      if (response && response.credential) {
        const decoded = parseJwt(response.credential);
        if (decoded) {
          const user: GoogleUserData = {
            email: decoded.email || 'user@gmail.com',
            name: decoded.name || decoded.email?.split('@')[0] || 'Google User',
            picture: decoded.picture || '',
            sub: decoded.sub || '',
            idToken: response.credential,
          };
          onUserReceived(user);
          return;
        }
      }
      onError('No credential token received from Google Identity Services');
    };

    window.google.accounts.id.initialize({
      client_id: effectiveClientId,
      callback: handleCredentialResponse,
      auto_select: false,
      use_fedcm_for_prompt: false,
      ux_mode: 'popup',
      cancel_on_tap_outside: true,
    });

    // Safe helper to trigger GIS prompt without unhandled FedCM errors
    const triggerSafeIdPrompt = () => {
      try {
        window.google.accounts.id.prompt((notification: any) => {
          if (notification?.isNotDisplayed?.()) {
            console.log('Google Identity prompt not displayed:', notification.getNotDisplayedReason?.());
          } else if (notification?.isSkippedMoment?.()) {
            console.log('Google Identity prompt skipped:', notification.getSkippedReason?.());
          } else if (notification?.isDismissedMoment?.()) {
            console.log('Google Identity prompt dismissed:', notification.getDismissedReason?.());
          }
        });
      } catch (promptErr) {
        console.warn('Google Identity prompt notice:', promptErr);
      }
    };

    // 2. Setup OAuth 2.0 Token Client with prompt: 'consent' + access_type: 'offline'
    // This ensures Google Sheets/Drive scopes are always explicitly granted, even for returning users.
    if (window.google.accounts.oauth2) {
      const tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: effectiveClientId,
        scope: [
          'openid',
          'https://www.googleapis.com/auth/userinfo.profile',
          'https://www.googleapis.com/auth/userinfo.email',
          'https://www.googleapis.com/auth/spreadsheets',
          'https://www.googleapis.com/auth/drive.file',
        ].join(' '),
        // 'consent' forces the full permissions screen on every sign-in,
        // ensuring Sheets/Drive scopes are never silently downgraded.
        prompt: 'consent',
        // include_granted_scopes ensures previously granted scopes are
        // always included in the new access token.
        include_granted_scopes: true,
        callback: async (tokenResponse: any) => {
          if (tokenResponse && tokenResponse.access_token) {
            try {
              // Fetch profile info using the freshly issued access token
              const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
              });
              if (userInfoRes.ok) {
                const info = await userInfoRes.json();
                onUserReceived({
                  email: info.email || '',
                  name: info.name || info.email?.split('@')[0] || 'Google User',
                  picture: info.picture || '',
                  sub: info.sub || '',
                  accessToken: tokenResponse.access_token,
                });
                return;
              }
            } catch (e) {
              console.warn('Failed to fetch Google userinfo directly:', e);
            }
          }
          if (tokenResponse.error) {
            console.error('Google OAuth token error:', tokenResponse.error);
            // Fallback to GIS ID prompt if the OAuth popup failed
            triggerSafeIdPrompt();
          }
        },
        error_callback: (err: any) => {
          console.warn('OAuth token client error, attempting GIS prompt:', err);
          triggerSafeIdPrompt();
        },
      });

      // Request token with consent prompt + offline access_type so the full
      // Sheets & Drive scopes are explicitly requested each sign-in.
      tokenClient.requestAccessToken({ prompt: 'consent', access_type: 'offline' });
    } else {
      // Trigger GIS OneTap or Prompt safely
      triggerSafeIdPrompt();
    }
  } catch (err: any) {
    console.error('Error in initializeAndTriggerGoogleGsi:', err);
    onError(err.message || 'Failed to initiate Google OAuth Sign-In');
  }
}

// Backward compatible alias
export const triggerGoogleOAuth = initializeAndTriggerGoogleGsi;

