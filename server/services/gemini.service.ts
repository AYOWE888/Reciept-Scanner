import { GoogleGenAI, Type } from '@google/genai';
import { config } from '../config/env';

export interface ScannedReceiptItem {
  name: string;
  qty: number;
  price: number;
  confidence: number;
}

export interface ScannedReceiptResult {
  merchant: string;
  date: string;
  total: number;
  confidence: number;
  items: ScannedReceiptItem[];
  merchantName?: string;
  totalAmount?: number;
}

let genAIInstance: GoogleGenAI | null = null;

function getGenAI(): GoogleGenAI {
  if (!genAIInstance) {
    const apiKey = config.geminiApiKey;
    if (!apiKey) {
      console.warn('GEMINI_API_KEY environment variable is missing.');
    }
    genAIInstance = new GoogleGenAI({
      apiKey: apiKey || '',
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return genAIInstance;
}

export class GeminiService {
  public static async scanReceiptImage(
    imageBase64: string,
    mimeType?: string
  ): Promise<ScannedReceiptResult> {
    const dataUriMatch = imageBase64.match(/^data:([^;]+);base64,/);
    const detectedMimeType = dataUriMatch ? dataUriMatch[1] : (mimeType || 'image/jpeg');
    const cleanBase64 = imageBase64.replace(/^data:[^;]+;base64,/, '').trim();
    const ai = getGenAI();

    const promptText = `
You are a high-precision OCR and receipt parsing engine for inventory tracking.
Analyze the provided receipt or invoice image carefully.
Extract the merchant store name, purchase date (YYYY-MM-DD), total receipt amount, overall extraction confidence percentage (0 to 100), and every purchased item line item.
For each item, extract item name, quantity, individual unit price, and item confidence percentage.
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: [
        {
          inlineData: {
            mimeType: detectedMimeType,
            data: cleanBase64,
          },
        },
        {
          text: promptText,
        },
      ],
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            merchant: { type: Type.STRING, description: 'Store or vendor name' },
            date: { type: Type.STRING, description: 'Receipt date in YYYY-MM-DD format' },
            total: { type: Type.NUMBER, description: 'Final receipt total amount' },
            confidence: { type: Type.NUMBER, description: 'Overall text recognition confidence percentage from 0 to 100' },
            items: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING, description: 'Item description or line item name' },
                  qty: { type: Type.INTEGER, description: 'Quantity purchased' },
                  price: { type: Type.NUMBER, description: 'Individual item price' },
                  confidence: { type: Type.NUMBER, description: 'Confidence score for individual line item, 0-100' },
                },
                required: ['name', 'qty', 'price'],
              },
            },
          },
          required: ['merchant', 'date', 'total', 'confidence', 'items'],
        },
      },
    });

    const responseText = response.text || '{}';
    let parsedData: any = {};
    try {
      parsedData = JSON.parse(responseText);
    } catch {
      const cleaned = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
      parsedData = JSON.parse(cleaned);
    }

    const merchant = parsedData.merchant || parsedData.merchantName || 'Unknown Merchant';
    const date = parsedData.date || new Date().toISOString().slice(0, 10);
    const total = Number(parsedData.total || parsedData.totalAmount || 0);
    const confidence = Number(parsedData.confidence || 92);
    const rawItems = Array.isArray(parsedData.items) ? parsedData.items : [];

    const normalizedItems: ScannedReceiptItem[] = rawItems.map((item: any) => ({
      name: item.name || item.itemName || 'Item',
      qty: Number(item.qty || item.quantity || 1),
      price: Number(item.price || item.unitPrice || 0),
      confidence: Number(item.confidence || confidence || 90),
    }));

    return {
      merchant,
      date,
      total,
      confidence,
      items: normalizedItems,
      merchantName: merchant,
      totalAmount: total,
    };
  }
}
