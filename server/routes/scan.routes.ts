import { Router, Request, Response } from 'express';
import { GeminiService } from '../services/gemini.service';
import { DbService } from '../services/db.service';

const router = Router();

// POST /api/scan-receipt
router.post('/scan-receipt', async (req: Request, res: Response) => {
  try {
    const { imageBase64, mimeType = 'image/jpeg', userId } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: 'imageBase64 field is required' });
    }

    const scanResult = await GeminiService.scanReceiptImage(imageBase64, mimeType);
    const receiptId = `RCP-${Date.now()}`;
    const scannedAt = new Date().toISOString();

    // Persist Receipt to Database
    DbService.saveReceipt({
      id: receiptId,
      user_id: userId || undefined,
      merchant_name: scanResult.merchant,
      date: scanResult.date,
      total_amount: scanResult.total,
      confidence: scanResult.confidence,
      scanned_at: scannedAt,
    });

    // Persist Line Items to Database
    for (const item of scanResult.items) {
      DbService.saveInventoryItem({
        id: `ITM-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        receipt_id: receiptId,
        user_id: userId || undefined,
        item_name: item.name,
        quantity: item.qty,
        unit_price: item.price,
        total_price: Number((item.price * item.qty).toFixed(2)),
        category: 'General',
        confidence: item.confidence,
        created_at: scannedAt,
      });
    }

    return res.json({
      success: true,
      receiptId,
      merchant: scanResult.merchant,
      date: scanResult.date,
      total: scanResult.total,
      confidence: scanResult.confidence,
      items: scanResult.items,
      merchantName: scanResult.merchant,
      totalAmount: scanResult.total,
    });
  } catch (error: any) {
    console.error('Error processing OCR in /api/scan-receipt:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to parse receipt image',
    });
  }
});

export default router;
