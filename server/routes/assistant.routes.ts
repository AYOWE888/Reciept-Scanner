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
    const { message, history = [], userId } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ success: false, error: 'Message text is required' });
    }

    // Retrieve active inventory summary from SQLite database
    const summary = DbService.getInventorySummary(userId);
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
