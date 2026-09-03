import { Router, Request, Response } from 'express';
import { config } from '../config/env';
import { SheetsService } from '../services/sheets.service';
import { DbService } from '../services/db.service';

const router = Router();
let activeSheetId: string = config.googleSheetId || '';

function getAccessTokenFromReq(req: Request): string | null {
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

// POST /api/sheets/append-items
router.post('/append-items', async (req: Request, res: Response) => {
  try {
    const { merchant, date, items, merchantName, receiptDate, sheetId: reqSheetId, userId } = req.body;
    const accessToken = getAccessTokenFromReq(req);

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'No items provided to append.' });
    }

    const targetMerchant = merchant || merchantName || 'Store';
    const targetDate = date || receiptDate || new Date().toISOString().slice(0, 10);
    const targetSheetId = reqSheetId || activeSheetId || config.googleSheetId;
    const receiptId = `RCP-${Date.now()}`;
    const timestamp = new Date().toISOString();

    // 1. Persist Receipt & Items to SQLite Database
    let receiptTotal = 0;
    for (const item of items) {
      const qty = Number(item.qty || item.quantity || 1);
      const price = Number(item.price || item.unitPrice || 0);
      receiptTotal += price * qty;
    }

    DbService.saveReceipt({
      id: receiptId,
      user_id: userId || undefined,
      merchant_name: targetMerchant,
      date: targetDate,
      total_amount: Number(receiptTotal.toFixed(2)),
      confidence: 92,
      scanned_at: timestamp,
    });

    for (const item of items) {
      const itemName = item.name || item.itemName || 'Item';
      const qty = Number(item.qty || item.quantity || 1);
      const price = Number(item.price || item.unitPrice || 0);

      DbService.saveInventoryItem({
        id: `ITM-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        receipt_id: receiptId,
        user_id: userId || undefined,
        item_name: itemName,
        quantity: qty,
        unit_price: price,
        total_price: Number((price * qty).toFixed(2)),
        category: item.category || 'General',
        confidence: item.confidence || 90,
        created_at: timestamp,
      });
    }

    // 2. Append to Google Sheet if sheet ID is configured
    let rowsAppended = items.length;
    let sheetAppended = false;

    if (targetSheetId) {
      try {
        const result = await SheetsService.appendItems(accessToken, targetSheetId, items, targetMerchant, targetDate);
        sheetAppended = result.sheetAppended;
      } catch (sheetErr: any) {
        const errMsg: string = sheetErr?.message || '';
        const isAuthError =
          errMsg.includes('insufficient authentication scopes') ||
          errMsg.includes('Request had insufficient authentication scopes') ||
          sheetErr?.code === 403 ||
          sheetErr?.status === 403;

        if (isAuthError) {
          // Return a clear 403 that the frontend can display to the user
          return res.status(403).json({
            success: false,
            error:
              'Google Sheets access denied: your sign-in session is missing the required Sheets/Drive permissions. ' +
              'Please sign out and sign back in — the new sign-in flow will ask for Sheets & Drive access.',
            code: 'INSUFFICIENT_SCOPES',
          });
        }
        console.warn('Notice: Google Sheets API append error, fallback to local DB:', errMsg);
      }
    }

    return res.json({
      success: true,
      rowsAppended,
      sheetAppended,
      sheetId: targetSheetId || null,
      message: sheetAppended
        ? `Successfully logged ${rowsAppended} items to Google Sheets and SQLite DB!`
        : `Logged ${rowsAppended} items to local database inventory tracker.`,
    });
  } catch (error: any) {
    console.error('Error in /api/sheets/append-items:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to append items to Google Sheets',
    });
  }
});

// POST /api/sheets/create-sheet
router.post('/create-sheet', async (req: Request, res: Response) => {
  try {
    const accessToken = getAccessTokenFromReq(req);
    const { title = 'Receipt Inventory Tracker' } = req.body;

    const { sheetId, spreadsheetUrl } = await SheetsService.createInventorySheet(accessToken, title);
    activeSheetId = sheetId;

    res.json({
      success: true,
      sheetId,
      spreadsheetUrl,
    });
  } catch (error: any) {
    console.error('Error creating Google Sheet:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to create Google Sheet' });
  }
});

// GET /api/sheets/list
router.get('/list', async (req: Request, res: Response) => {
  try {
    const accessToken = getAccessTokenFromReq(req);
    const files = await SheetsService.listInventorySheets(accessToken);
    res.json({ success: true, files });
  } catch (error: any) {
    console.error('Error listing Google Sheets:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to list Google Sheets' });
  }
});

// DELETE /api/sheets/:sheetId
router.delete('/:sheetId', async (req: Request, res: Response) => {
  try {
    const accessToken = getAccessTokenFromReq(req);
    const { sheetId } = req.params;
    await SheetsService.deleteSheet(accessToken, sheetId);
    
    // If the active sheet was deleted, clear it
    if (activeSheetId === sheetId) {
      activeSheetId = '';
    }
    
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting Google Sheet:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to delete Google Sheet' });
  }
});

// GET /api/sheets/status
router.get('/status', (req: Request, res: Response) => {
  const summary = DbService.getInventorySummary();
  res.json({
    sheetId: activeSheetId || config.googleSheetId || '',
    hasSheet: Boolean(activeSheetId || config.googleSheetId),
    localRecordCount: summary.totalItemsScanned,
    timestamp: new Date().toISOString(),
  });
});

// POST /api/sheets/set-sheet-id
router.post('/set-sheet-id', (req: Request, res: Response) => {
  const { sheetId } = req.body;
  if (!sheetId) return res.status(400).json({ error: 'sheetId is required' });
  activeSheetId = sheetId.trim();
  res.json({ success: true, sheetId: activeSheetId });
});

// GET /api/sheets/inventory-data
router.get('/inventory-data', async (req: Request, res: Response) => {
  try {
    const accessToken = getAccessTokenFromReq(req);
    const targetSheetId = (req.query.sheetId as string) || activeSheetId || config.googleSheetId;
    const userId = (req.query.userId as string) || undefined;

    const dbSummary = DbService.getInventorySummary(userId);

    // If Google Sheet is available, try fetching remote sheet values to merge
    if (targetSheetId) {
      try {
        const googleSheets = await SheetsService.getSheetsClient(accessToken);
        if (googleSheets) {
          const sheetRes = await googleSheets.spreadsheets.values.get({
            spreadsheetId: targetSheetId,
            range: 'A2:F5000',
          });

          const sheetValues = sheetRes.data.values || [];
          if (sheetValues.length > dbSummary.rawRows.length) {
            // Sheet has additional remote rows
            const sheetRows = sheetValues.map((row: any) => ({
              date: row[0] || '',
              merchant: row[1] || 'Store',
              itemName: row[2] || 'Item',
              quantity: Number(row[3]) || 1,
              unitPrice: Number(row[4]) || 0,
              totalPrice: Number(row[5]) || (Number(row[3] || 1) * Number(row[4] || 0)),
            }));
            const totalItemsScanned = sheetRows.reduce((acc, r) => acc + (Number(r.quantity) || 1), 0);
            const totalSpend = sheetRows.reduce((acc, r) => acc + (Number(r.totalPrice) || 0), 0);

            return res.json({
              success: true,
              summary: {
                totalItemsScanned,
                rawRowsCount: sheetRows.length,
                totalSpend: Number(totalSpend.toFixed(2)),
                rows: sheetRows,
                currentSheetId: targetSheetId,
              },
            });
          }
        }
      } catch (err) {
        console.warn('Notice: Google Sheets fetch warning, serving SQLite DB records:', err);
      }
    }

    res.json({
      success: true,
      summary: {
        totalItemsScanned: dbSummary.totalItemsScanned,
        rawRowsCount: dbSummary.rawRows.length,
        totalSpend: dbSummary.totalSpend,
        rows: dbSummary.rawRows,
        currentSheetId: targetSheetId || '',
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Failed to fetch inventory data' });
  }
});

export default router;
