import { useState, useEffect } from 'react';
import { Bell, Check, Trash2, UserPlus, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import api from '../../api';
import AdminLayout from '../../components/AdminSidebar';

interface Notification {
  id: number;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

const typeConfig: Record<string, { icon: typeof Info; bg: string; iconColor: string }> = {
  info: { icon: Info, bg: 'bg-blue-50', iconColor: 'text-blue-600' },
  warning: { icon: AlertTriangle, bg: 'bg-amber-50', iconColor: 'text-amber-600' },
  success: { icon: CheckCircle, bg: 'bg-green-50', iconColor: 'text-green-600' },
  election: { icon: Info, bg: 'bg-blue-50', iconColor: 'text-blue-600' },
  reminder: { icon: AlertTriangle, bg: 'bg-amber-50', iconColor: 'text-amber-600' },
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days > 1 ? 's' : ''} ago`;
}

export default function AdminNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
  }, []);

  async function fetchNotifications() {
    try {
      const response = await api.get('/admin/notifications');
      setNotifications(response.data || []);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoading(false);
    }
  }

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAllRead = () => setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  const markRead = (id: number) => setNotifications(prev => prev.map(n => (n.id === id ? { ...n, read: true } : n)));
  const remove = (id: number) => setNotifications(prev => prev.filter(n => n.id !== id));

  return (
    <AdminLayout title="Notifications">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold text-gray-900 font-display">Notifications</h2>
          {unreadCount > 0 && (
            <span className="min-w-[1.5rem] h-6 px-2 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
              {unreadCount}
            </span>
          )}
        </div>
        <button type="button" onClick={markAllRead} className="text-sm font-semibold text-evotex-primary hover:underline">
          Mark all as read
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-evotex-primary" />
        </div>
      ) : notifications.length === 0 ? (
        <div className="evotex-card p-12 text-center">
          <Bell className="w-12 h-12 mx-auto text-gray-200 mb-3" />
          <p className="text-evotex-muted font-medium">No notifications</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map(n => {
            const cfg = typeConfig[n.type] || typeConfig.info;
            const Icon = cfg.icon;
            return (
              <div key={n.id} className="evotex-card p-4 sm:p-5 flex gap-4 items-start">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${cfg.bg}`}>
                  <Icon className={`w-5 h-5 ${cfg.iconColor}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start gap-2">
                    <h3 className="font-bold text-gray-900 text-sm sm:text-base">{n.title}</h3>
                    {!n.read && <span className="w-2 h-2 rounded-full bg-evotex-primary shrink-0 mt-2" />}
                  </div>
                  <p className="text-sm text-evotex-muted mt-1">{n.message}</p>
                  <p className="text-xs text-gray-400 mt-2">{timeAgo(n.createdAt)}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {!n.read && (
                    <button type="button" onClick={() => markRead(n.id)} className="p-2 text-gray-400 hover:text-evotex-primary rounded-lg hover:bg-gray-50" aria-label="Mark read">
                      <Check className="w-4 h-4" />
                    </button>
                  )}
                  <button type="button" onClick={() => remove(n.id)} className="p-2 text-gray-400 hover:text-red-500 rounded-lg hover:bg-gray-50" aria-label="Delete">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </AdminLayout>
  );
}
