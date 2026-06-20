import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Shield } from 'lucide-react';

interface Message {
  id: number;
  text: string;
  from: 'user' | 'bot';
}

const botReply = (input: string): string => {
  const lower = input.toLowerCase();
  if (lower.includes('how') && lower.includes('vote')) return "Go to Elections, select an active election, pick a candidate and click Cast Vote!";
  if (lower.includes('private') || lower.includes('anonymous')) return "Yes! Your vote is 100% anonymous. We only record that you voted, not who you voted for.";
  if (lower.includes('biometric') || lower.includes('fingerprint') || lower.includes('face')) return "We use FIDO2/WebAuthn. Your device handles biometric locally — we never receive your fingerprint or face data.";
  if (lower.includes('result')) return "Results are published automatically after the election end date on the Results page.";
  return "I can help with voting, biometric verification, and results. What would you like to know?";
};

let msgId = 0;

export default function ChatbotWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { id: ++msgId, text: "Hi! I'm the E-Votex Assistant. How can I help you today?", from: 'bot' }
  ]);
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = () => {
    if (!input.trim()) return;
    const userMsg: Message = { id: ++msgId, text: input, from: 'user' };
    const reply: Message = { id: ++msgId, text: botReply(input), from: 'bot' };
    setMessages(prev => [...prev, userMsg, reply]);
    setInput('');
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') send();
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {open && (
        <div
          className="w-80 bg-white rounded-2xl shadow-2xl border border-emerald-100 flex flex-col overflow-hidden"
          style={{ height: '420px', animation: 'slideUp 0.25s ease-out' }}
        >
          <div className="bg-emerald-700 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="bg-emerald-600 p-1 rounded-lg">
                <Shield className="w-4 h-4 text-white" />
              </div>
              <span className="text-white font-semibold text-sm" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>E-Votex Assistant</span>
            </div>
            <button onClick={() => setOpen(false)} className="text-emerald-200 hover:text-white transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-2 bg-white">
            {messages.map(msg => (
              <div key={msg.id} className={`flex ${msg.from === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] px-3 py-2 rounded-2xl text-sm leading-relaxed ${
                    msg.from === 'user'
                      ? 'bg-emerald-700 text-white rounded-tr-sm'
                      : 'bg-white text-gray-700 border border-gray-200 rounded-tl-sm shadow-sm'
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          <div className="px-3 py-3 border-t border-gray-100 bg-white flex gap-2">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Ask anything..."
              className="flex-1 border border-emerald-200 focus:ring-2 focus:ring-emerald-400 rounded-xl px-3 py-2 text-sm outline-none"
            />
            <button
              onClick={send}
              className="bg-emerald-700 hover:bg-emerald-800 text-white p-2 rounded-xl transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <button
        onClick={() => setOpen(!open)}
        className="bg-emerald-700 hover:bg-emerald-800 text-white w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-105"
      >
        {open ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
      </button>
    </div>
  );
}
