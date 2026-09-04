import React, { useState, useRef, useEffect } from 'react';
import { UserProfile } from '../types';

interface Message {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
}

interface AiAssistantProps {
  currentUser?: UserProfile | null;
  scans?: any[];
}

export const AiAssistant: React.FC<AiAssistantProps> = ({ currentUser, scans = [] }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome-1',
      sender: 'ai',
      text: 'Hello! I am your **STOCKSCAN AI Assistant**. Ask me anything about your scanned receipts, total spending, top items, vendor breakdown, or low stock items.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [inputQuery, setInputQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  const samplePrompts = [
    'What are my highest expense items?',
    'Summarize spending by category',
    'Which merchant had the highest total spend?',
    'List all items scanned in SQLite database',
  ];

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || inputQuery).trim();
    if (!query || isLoading) return;

    const userMsg: Message = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputQuery('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/assistant/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: query,
          history: messages.map((m) => ({ sender: m.sender, text: m.text })),
          userId: currentUser?.email || undefined,
          scans,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to get AI response');
      }

      const aiMsg: Message = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: data.reply || 'Analysis complete.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (err: any) {
      console.error('Error in AI assistant request:', err);
      const errorMsg: Message = {
        id: `err-${Date.now()}`,
        sender: 'ai',
        text: `⚠️ **Notice**: ${err.message || 'Unable to connect to AI Assistant. Please try again.'}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  // Basic markdown formatter helper for bold, linebreaks, bullets
  const renderMarkdown = (content: string) => {
    const lines = content.split('\n');
    return lines.map((line, idx) => {
      let formatted = line.replace(/\*\*(.*?)\*\*/g, '<strong class="text-white font-bold">$1</strong>');
      formatted = formatted.replace(/\*(.*?)\*/g, '<em class="text-[#10FF4F]">$1</em>');

      if (line.trim().startsWith('- ') || line.trim().startsWith('• ')) {
        return (
          <div key={idx} className="flex items-start gap-2 my-1 pl-2">
            <span className="text-[#10FF4F]">•</span>
            <span dangerouslySetInnerHTML={{ __html: formatted.replace(/^[-•]\s*/, '') }} />
          </div>
        );
      }
      return (
        <div key={idx} className="my-1 leading-relaxed" dangerouslySetInnerHTML={{ __html: formatted }} />
      );
    });
  };

  return (
    <div className="bg-[#12131A] border-2 border-black hard-shadow p-6 space-y-4 flex flex-col h-[620px] max-w-full relative">
      {/* Title Bar */}
      <div className="flex items-center justify-between border-b border-[#2C2D38] pb-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#10FF4F]/10 border border-[#10FF4F]/30 flex items-center justify-center text-[#10FF4F]">
            <i className="ph ph-sparkle text-xl"></i>
          </div>
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
              STOCKSCAN AI Assistant
            </h2>
            <p className="text-[10px] text-[#8A8B99] font-mono">
              Powered by Gemini 3.6 Flash & SQLite Inventory Engine
            </p>
          </div>
        </div>
        <span className="text-[10px] font-mono text-[#10FF4F] bg-[#10FF4F]/10 border border-[#10FF4F]/30 px-2 py-0.5 rounded font-bold uppercase">
          Live Analytics
        </span>
      </div>

      {/* Chat Messages Body */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1 scrollbar-thin">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div className="flex items-center gap-2 mb-1 text-[10px] font-mono text-[#8A8B99]">
              <span>{msg.sender === 'user' ? (currentUser?.name || 'You') : 'STOCKSCAN AI'}</span>
              <span>•</span>
              <span>{msg.timestamp}</span>
            </div>
            <div
              className={`p-4 text-xs font-mono max-w-[85%] rounded-lg ${
                msg.sender === 'user'
                  ? 'bg-[#10FF4F] text-black font-bold hard-shadow'
                  : 'bg-[#090A0F] text-[#E1E2E8] border border-[#2C2D38]'
              }`}
            >
              {msg.sender === 'user' ? msg.text : renderMarkdown(msg.text)}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex flex-col items-start">
            <div className="text-[10px] font-mono text-[#8A8B99] mb-1">STOCKSCAN AI • Analyzing inventory...</div>
            <div className="bg-[#090A0F] border border-[#2C2D38] p-3 text-xs font-mono text-[#10FF4F] flex items-center gap-2 rounded-lg">
              <i className="ph ph-spinner animate-spin text-base"></i>
              <span>Analyzing receipts and running SQLite queries...</span>
            </div>
          </div>
        )}
        <div ref={chatBottomRef} />
      </div>

      {/* Quick Prompt Chips */}
      <div className="pt-2 border-t border-[#2C2D38] shrink-0 space-y-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {samplePrompts.map((prompt, i) => (
            <button
              key={i}
              onClick={() => handleSendMessage(prompt)}
              disabled={isLoading}
              className="text-[10px] font-mono bg-[#090A0F] text-[#8A8B99] hover:text-[#10FF4F] hover:border-[#10FF4F] border border-[#2C2D38] px-2.5 py-1.5 whitespace-nowrap transition-colors cursor-pointer disabled:opacity-50"
            >
              💡 {prompt}
            </button>
          ))}
        </div>

        {/* Query Input Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            placeholder="Ask about spending, store totals, or inventory items..."
            disabled={isLoading}
            className="flex-1 bg-[#090A0F] border border-[#2C2D38] p-3 text-xs text-white font-mono placeholder-[#8A8B99] focus:border-[#10FF4F] focus:outline-none"
          />
          <button
            type="submit"
            disabled={!inputQuery.trim() || isLoading}
            className="brutalist-btn bg-[#10FF4F] text-black font-bold text-xs px-5 py-3 uppercase tracking-wider hard-shadow hover:bg-[#00E53D] cursor-pointer disabled:opacity-40"
          >
            Send <i className="ph ph-paper-plane-right font-bold ml-1"></i>
          </button>
        </form>
      </div>
    </div>
  );
};
