import { google } from 'googleapis';
import { config } from '../config/env';

export interface SheetAppendItem {
  name?: string;
  itemName?: string;
  qty?: number;
  quantity?: number;
  price?: number;
  unitPrice?: number;
  totalPrice?: number;
  category?: string;
  confidence?: number;
}

export class SheetsService {
  /**
   * Helper to get Google Auth client for service account / ADC fallbacks
   */
  private static async getGoogleAuthClient() {
    try {
      if (process.env.GOOGLE_SHEETS_CREDENTIALS) {
        const credentials = typeof process.env.GOOGLE_SHEETS_CREDENTIALS === 'string'
          ? JSON.parse(process.env.GOOGLE_SHEETS_CREDENTIALS)
          : process.env.GOOGLE_SHEETS_CREDENTIALS;

        return new google.auth.GoogleAuth({
          credentials,
          scopes: [
            'https://www.googleapis.com/auth/spreadsheets',
            'https://www.googleapis.com/auth/drive.file',
          ],
        });
      }

      if (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_PRIVATE_KEY) {
        const privateKey = process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n');
        return new google.auth.JWT({
          email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
          key: privateKey,
          scopes: [
            'https://www.googleapis.com/auth/spreadsheets',
            'https://www.googleapis.com/auth/drive.file',
          ],
        });
      }

      return new google.auth.GoogleAuth({
        scopes: [
          'https://www.googleapis.com/auth/spreadsheets',
          'https://www.googleapis.com/auth/drive.file',
        ],
      });
    } catch (err) {
      console.warn('SheetsService Auth Client Notice:', err);
      return null;
    }
  }

  /**
   * Helper to instantiate Google Sheets API Client
   */
  public static async getSheetsClient(accessToken?: string | null) {
    if (accessToken) {
      const oauth2Client = new google.auth.OAuth2();
      oauth2Client.setCredentials({ access_token: accessToken });
      return google.sheets({ version: 'v4', auth: oauth2Client });
    }

    const defaultAuth = await this.getGoogleAuthClient();
    if (defaultAuth) {
      return google.sheets({ version: 'v4', auth: defaultAuth as any });
    }
    return null;
  }

  /**
   * Helper to instantiate Google Drive Client
   */
  public static async getDriveClient(accessToken?: string | null) {
    if (accessToken) {
      const oauth2Client = new google.auth.OAuth2();
      oauth2Client.setCredentials({ access_token: accessToken });
      return google.drive({ version: 'v3', auth: oauth2Client });
    }

    const defaultAuth = await this.getGoogleAuthClient();
    if (defaultAuth) {
      return google.drive({ version: 'v3', auth: defaultAuth as any });
    }
    return null;
  }

  /**
   * Append items directly to Google Sheet
   */
  public static async appendItems(
    accessToken: string | null,
    sheetId: string,
    items: SheetAppendItem[],
    merchant: string,
    date: string
  ): Promise<{ success: boolean; rowsAppended: number; sheetAppended: boolean; error?: string }> {
    const googleSheets = await this.getSheetsClient(accessToken);
    if (!googleSheets) {
      return { success: false, rowsAppended: 0, sheetAppended: false, error: 'No Sheets client available' };
    }

    const rowsToAppend = items.map((item) => {
      const itemName = item.name || item.itemName || 'Item';
      const qty = Number(item.qty || item.quantity || 1);
      const price = Number(item.price || item.unitPrice || 0);
      const itemTotal = Number(item.price ? (item.price * qty) : (item.totalPrice || price * qty)).toFixed(2);

      return [
        date,
        merchant,
        itemName,
        qty,
        Number(price.toFixed(2)),
        Number(itemTotal),
      ];
    });

    let sheetAppended = false;
    try {
      // Ensure header row exists if sheet is new/empty
      try {
        const checkRes = await googleSheets.spreadsheets.values.get({
          spreadsheetId: sheetId,
          range: 'A1:F1',
        });
        if (!checkRes.data.values || checkRes.data.values.length === 0) {
          await googleSheets.spreadsheets.values.update({
            spreadsheetId: sheetId,
            range: 'A1:F1',
            valueInputOption: 'USER_ENTERED',
            requestBody: {
              values: [['Date', 'Merchant', 'Item Name', 'Quantity', 'Unit Price', 'Total Price']],
            },
          });
        }
      } catch (headerErr) {
        console.warn('Notice checking sheet headers:', headerErr);
      }

      await googleSheets.spreadsheets.values.append({
        spreadsheetId: sheetId,
        range: 'Inventory!A:F',
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: rowsToAppend,
        },
      });
      sheetAppended = true;
    } catch (rangeErr) {
      // Fallback to default tab range A:F
      await googleSheets.spreadsheets.values.append({
        spreadsheetId: sheetId,
        range: 'A:F',
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: rowsToAppend,
        },
      });
      sheetAppended = true;
    }

    return {
      success: true,
      rowsAppended: items.length,
      sheetAppended,
    };
  }

  /**
   * Create a new Inventory Google Sheet with formatted headers
   */
  public static async createInventorySheet(
    accessToken: string | null,
    title: string = 'Receipt Inventory Tracker'
  ): Promise<{ sheetId: string; spreadsheetUrl: string }> {
    const googleSheets = await this.getSheetsClient(accessToken);
    if (!googleSheets) {
      throw new Error('Google Sheets credentials missing or unauthenticated.');
    }

    const spreadsheet = await googleSheets.spreadsheets.create({
      requestBody: {
        properties: {
          title,
        },
        sheets: [
          {
            properties: {
              title: 'Inventory',
            },
            data: [
              {
                startRow: 0,
                startColumn: 0,
                rowData: [
                  {
                    values: [
                      { userEnteredValue: { stringValue: 'Date' } },
                      { userEnteredValue: { stringValue: 'Merchant' } },
                      { userEnteredValue: { stringValue: 'Item Name' } },
                      { userEnteredValue: { stringValue: 'Quantity' } },
                      { userEnteredValue: { stringValue: 'Unit Price' } },
                      { userEnteredValue: { stringValue: 'Total Price' } },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    });

    const sheetId = spreadsheet.data.spreadsheetId || '';
    const spreadsheetUrl = spreadsheet.data.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${sheetId}`;

    return { sheetId, spreadsheetUrl };
  }

  /**
   * List recent Google Sheets created by the user or accessible to the app.
   */
  public static async listInventorySheets(accessToken: string | null) {
    const driveClient = await this.getDriveClient(accessToken);
    if (!driveClient) {
      throw new Error('Google Drive credentials missing or unauthenticated.');
    }
    
    const response = await driveClient.files.list({
      q: "mimeType='application/vnd.google-apps.spreadsheet' and trashed=false",
      orderBy: "modifiedTime desc",
      pageSize: 50,
      fields: "files(id, name, modifiedTime, webViewLink)",
    });

    return response.data.files || [];
  }

  /**
   * Delete a spreadsheet (moves it to the trash).
   */
  public static async deleteSheet(accessToken: string | null, fileId: string) {
    const driveClient = await this.getDriveClient(accessToken);
    if (!driveClient) {
      throw new Error('Google Drive credentials missing or unauthenticated.');
    }

    await driveClient.files.update({
      fileId,
      requestBody: {
        trashed: true,
      },
    });
    
    return true;
  }
}
