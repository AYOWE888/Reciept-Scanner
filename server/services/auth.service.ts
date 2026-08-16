import { google } from 'googleapis';
import { DbService } from './db.service';

export interface GoogleUserProfile {
  email: string;
  name: string;
  picture: string;
  sub?: string;
}

export class AuthService {
  /**
   * Fetch Google User Info using OAuth2 access token
   */
  public static async verifyAndFetchGoogleProfile(accessToken: string): Promise<GoogleUserProfile> {
    try {
      const oauth2Client = new google.auth.OAuth2();
      oauth2Client.setCredentials({ access_token: accessToken });
      const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
      const userInfo = await oauth2.userinfo.get();

      const profile: GoogleUserProfile = {
        email: userInfo.data.email || '',
        name: userInfo.data.name || userInfo.data.email?.split('@')[0] || 'Google User',
        picture: userInfo.data.picture || '',
        sub: userInfo.data.id || '',
      };

      // Persist / Upsert user profile to database
      if (profile.sub || profile.email) {
        DbService.upsertUser({
          googleId: profile.sub || profile.email,
          email: profile.email,
          name: profile.name,
          picture: profile.picture,
        });
      }

      return profile;
    } catch (err: any) {
      console.warn('AuthService: Failed to fetch user profile via access token:', err.message);
      return {
        email: '',
        name: 'Google User',
        picture: '',
      };
    }
  }
}
