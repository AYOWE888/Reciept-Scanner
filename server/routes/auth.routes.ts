import { Router, Request, Response } from 'express';
import { config } from '../config/env';
import { AuthService } from '../services/auth.service';

const router = Router();

// Helper to extract access token from Authorization header or body
function getAccessToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7).trim();
  }
  if (req.body && req.body.accessToken) {
    return String(req.body.accessToken).trim();
  }
  if (req.query && req.query.accessToken) {
    return String(req.query.accessToken).trim();
  }
  return null;
}

// GET /api/auth/google/config
router.get('/google/config', (req: Request, res: Response) => {
  res.json({
    clientId: config.googleClientId,
    scopes: [
      'openid',
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/spreadsheets',
      'https://www.googleapis.com/auth/drive.file',
    ],
  });
});

// POST /api/auth/google/user-session
router.post('/google/user-session', async (req: Request, res: Response) => {
  try {
    const accessToken = getAccessToken(req);
    if (!accessToken) {
      return res.status(400).json({ success: false, error: 'Access token is required' });
    }

    const userProfile = await AuthService.verifyAndFetchGoogleProfile(accessToken);

    res.json({
      success: true,
      user: userProfile,
      sheetId: config.googleSheetId,
    });
  } catch (error: any) {
    console.error('Error in user session endpoint:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to authenticate user session' });
  }
});

export default router;
