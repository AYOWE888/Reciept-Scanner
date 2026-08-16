# Receipt-Scanner (STOCKSCAN) 🧾

An AI-powered receipt processing and inventory management app. Extract itemized data from physical receipt images using Gemini OCR and sync the details directly to local CSV files or a live Google Sheet.

---

## ✨ Key Features

* **AI-Powered OCR Parsing:** Uses Gemini's vision capabilities to read receipts, itemize purchases, and capture dates, prices, and totals.
* **Google Live Sheet Sync:** Automatically appends parsed receipt items to a designated Google Sheet in real time.
* **CSV Export:** Option to download or save parsed inventory lists locally as `.csv` files.
* **Inventory Tracking:** Helps small businesses or personal users seamlessly transition purchase records into structured inventory records.

---

## 🛠️ Tech Stack

* **Frontend:** React, TypeScript, Vite
* **Backend / Server:** Node.js, Express / TypeScript (`server.ts`)
* **AI Core:** Google AI Studio (Gemini API)
* **Storage / Sync:** Firebase Configuration, Google Sheets API, Local CSV parser

---

## 🚀 Getting Started

### Prerequisites
* Node.js (v18 or higher recommended)
* Bun or npm
* A Gemini API Key from [Google AI Studio](https://aistudio.google.com/)

### Installation & Setup

1. **Clone the repository:**
   ```bash
   git clone [https://github.com/AYOWE888/Reciept-Scanner.git](https://github.com/AYOWE888/Reciept-Scanner.git)
   cd Reciept-Scanner
