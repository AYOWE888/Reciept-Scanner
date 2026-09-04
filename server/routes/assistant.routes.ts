import { Router, Request, Response } from 'express';
import { GoogleGenAI } from '@google/genai';
import { config } from '../config/env';
import { DbService } from '../services/db.service';

const router = Router();

let genAIInstance: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY || config.geminiApiKey || '';
  return new GoogleGenAI({
    apiKey: apiKey || '',
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// POST /api/assistant/chat
router.post('/chat', async (req: Request, res: Response) => {
  try {
    const { message, history = [], userId, scans = [] } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ success: false, error: 'Message text is required' });
    }

    // Retrieve active inventory summary from frontend state directly
    const items = scans.flatMap((scan: any) => scan.items || []);
    const totalItemsScanned = items.reduce((acc: number, i: any) => acc + (Number(i.quantity) || 1), 0);
    const totalSpend = items.reduce((acc: number, i: any) => acc + (Number(i.totalPrice) || 0), 0);

    const itemMap = new Map();
    for (const item of items) {
      const normalized = (item.itemName || '').toLowerCase().trim();
      const existing = itemMap.get(normalized) || {
        itemName: item.itemName,
        normalizedName: normalized,
        totalQuantity: 0,
        totalSpend: 0,
        categories: new Set(),
        lastPurchased: item.date || '',
        purchaseCount: 0,
      };
      existing.totalQuantity += Number(item.quantity) || 1;
      existing.totalSpend += Number(item.totalPrice) || 0;
      if (item.category) existing.categories.add(item.category);
      existing.purchaseCount += 1;
      itemMap.set(normalized, existing);
    }

    const catMap = new Map();
    for (const item of items) {
      const cat = item.category || 'General';
      const existing = catMap.get(cat) || { category: cat, itemCount: 0, totalQuantity: 0, totalSpend: 0 };
      existing.itemCount += 1;
      existing.totalQuantity += Number(item.quantity) || 1;
      existing.totalSpend += Number(item.totalPrice) || 0;
      catMap.set(cat, existing);
    }

    const summary = {
      totalItemsScanned,
      uniqueItemCount: itemMap.size,
      totalSpend: Number(totalSpend.toFixed(2)),
      categoryBreakdown: Array.from(catMap.values()).map((c: any) => ({
        ...c, totalSpend: Number(c.totalSpend.toFixed(2))
      })),
      aggregatedItems: Array.from(itemMap.values()).map((val: any) => ({
        ...val, 
        totalSpend: Number(val.totalSpend.toFixed(2)), 
        categories: Array.from(val.categories)
      })),
      recentReceipts: scans.slice(0, 10).map((r: any) => ({
        receiptId: r.receiptId,
        merchant: r.merchantName,
        date: r.date,
        itemCount: (r.items || []).length,
        totalAmount: Number(r.totalAmount),
      })),
    };
    const ai = getGenAI();

    const systemContext = `
You are STOCKSCAN AI, an expert intelligent inventory and expense tracking assistant.
You have direct access to the user's real-time SQLite database inventory metrics:

=== USER INVENTORY DATA SNAPSHOT ===
Total Items Scanned: ${summary.totalItemsScanned}
Unique Item Count: ${summary.uniqueItemCount}
Total Spend ($): ${summary.totalSpend}
Category Breakdown: ${JSON.stringify(summary.categoryBreakdown)}
Aggregated Items: ${JSON.stringify(summary.aggregatedItems)}
Recent Receipts: ${JSON.stringify(summary.recentReceipts)}
====================================

Instructions:
1. Answer the user's query clearly, concisely, and helpfully based on their receipt inventory data.
2. If asked about spend, categories, top items, low stock, or merchant history, use the exact numbers from the data snapshot.
3. Keep responses nicely formatted using markdown bullet points and bold text where appropriate.
`;

    // Construct message payload for Gemini 3.6 Flash model
    const contentsPayload: any[] = [{ text: systemContext }];

    if (Array.isArray(history)) {
      for (const h of history.slice(-6)) {
        if (h.sender === 'user') {
          contentsPayload.push({ text: `User: ${h.text}` });
        } else if (h.sender === 'ai') {
          contentsPayload.push({ text: `Assistant: ${h.text}` });
        }
      }
    }

    contentsPayload.push({ text: `User Query: ${message}` });

    let response;
    try {
      response = await ai.models.generateContent({
        model: 'gemini-3.6-flash',
        contents: contentsPayload,
      });
    } catch (modelErr: any) {
      console.warn('Notice: gemini-3.6-flash fallback activated:', modelErr.message);
      response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: contentsPayload,
      });
    }

    const replyText = response.text || 'I analyzed your inventory records, but could not generate a detailed response. Please try rephrasing your question.';

    return res.json({
      success: true,
      reply: replyText,
      inventoryMetrics: {
        totalItemsScanned: summary.totalItemsScanned,
        totalSpend: summary.totalSpend,
        uniqueItemCount: summary.uniqueItemCount,
      },
    });
  } catch (error: any) {
    console.error('Error in AI Assistant chat endpoint:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'AI Inventory Assistant request failed',
    });
  }
});

export default router;
