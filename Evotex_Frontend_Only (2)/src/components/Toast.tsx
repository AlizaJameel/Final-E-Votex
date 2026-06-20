import { useEffect, useState } from 'react';
import { CheckCircle, XCircle, AlertTriangle, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning';

interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
}

let toastId = 0;
let addToastFn: ((message: string, type: ToastType) => void) | null = null;

export function showToast(message: string, type: ToastType = 'success') {
  addToastFn?.(message, type);
}

export default function Toast() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    addToastFn = (message: string, type: ToastType) => {
      const id = ++toastId;
      setToasts(prev => [...prev, { id, message, type }]);
      setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
    };
    return () => { addToastFn = null; };
  }, []);

  const remove = (id: number) => setToasts(prev => prev.filter(t => t.id !== id));

  const config = {
    success: { bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-800', icon: <CheckCircle className="w-5 h-5 text-emerald-600" /> },
    error: { bg: 'bg-red-50 border-red-200', text: 'text-red-800', icon: <XCircle className="w-5 h-5 text-red-500" /> },
    warning: { bg: 'bg-yellow-50 border-yellow-200', text: 'text-yellow-800', icon: <AlertTriangle className="w-5 h-5 text-yellow-500" /> },
  };

  return (
    <div className="fixed bottom-6 left-6 z-50 flex flex-col gap-2">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={`flex items-center gap-3 px-4 py-3 rounded-xl border shadow-lg max-w-sm animate-slide-in-left ${config[toast.type].bg}`}
          style={{ animation: 'slideInLeft 0.3s ease-out' }}
        >
          {config[toast.type].icon}
          <span className={`text-sm font-medium flex-1 ${config[toast.type].text}`}>{toast.message}</span>
          <button onClick={() => remove(toast.id)} className="text-gray-400 hover:text-gray-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
