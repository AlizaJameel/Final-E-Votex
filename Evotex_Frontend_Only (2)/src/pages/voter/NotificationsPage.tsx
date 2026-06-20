import { useState, useEffect } from 'react';
import { Bell, Mail, Vote, TrendingUp, Clock, Trash2 } from 'lucide-react';
import api from '../../api';
import VoterLayout from '../../components/VoterLayout';

interface Notification {
  id: number;
  type: 'election' | 'vote' | 'result' | 'reminder' | 'system';
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchNotifications() {
      try {
        const response = await api.get('/notifications');
        setNotifications(response.data || []);
      } catch (error) {
        console.error('Failed to fetch notifications:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchNotifications();
  }, []);

  const filtered = notifications.filter(n => {
    if (filter === 'unread') return !n.read;
    if (filter === 'read') return n.read;
    return true;
  });

  const notificationTypeColor: Record<string, string> = {
    election: 'bg-blue-50 border-blue-200 text-blue-700',
    vote: 'bg-green-50 border-green-200 text-green-700',
    result: 'bg-purple-50 border-purple-200 text-purple-700',
    reminder: 'bg-amber-50 border-amber-200 text-amber-700',
    system: 'bg-gray-50 border-gray-200 text-gray-700',
  };

  const notificationTypeIcon: Record<string, any> = {
    election: Vote,
    vote: Vote,
    result: TrendingUp,
    reminder: Clock,
    system: Bell,
  };

  const handleDelete = async (notificationId: number) => {
    try {
      setNotifications(notifications.filter(n => n.id !== notificationId));
      // Note: Backend may not have delete endpoint, but frontend can still remove locally
      // Uncomment when backend supports delete:
      // await api.delete(`/notifications/${notificationId}`);
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  };

  return (
    <VoterLayout title="Notifications">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Notifications</h1>
        <p className="text-[#6b7280] text-sm mt-0.5">Stay updated with election news and voting reminders</p>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        {(['all', 'unread', 'read'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold capitalize transition-colors ${
              filter === f ? 'bg-[#16a34a] text-white' : 'text-[#6b7280] hover:bg-[#f0fdf4]'
            }`}
          >
            {f} {f !== 'all' && `(${notifications.filter(n => f === 'unread' ? !n.read : n.read).length})`}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#16a34a]"></div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-3xl border border-[#bbf7d0] shadow-sm p-12 text-center">
          <Bell className="w-12 h-12 mx-auto text-gray-200 mb-4" />
          <p className="text-[#6b7280] font-medium">No notifications</p>
          <p className="text-sm text-[#6b7280] mt-1">You're all caught up! Check back later for updates.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(n => {
            const Icon = notificationTypeIcon[n.type] || Bell;
            const colors = notificationTypeColor[n.type] || notificationTypeColor.system;

            return (
              <div key={n.id} className={`rounded-2xl border p-4 transition-all ${colors} ${!n.read ? 'shadow-md' : ''}`}>
                <div className="flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${!n.read ? 'bg-white/50' : 'bg-white/30'}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-bold text-sm">{n.title}</h3>
                        <p className="text-xs opacity-75 mt-0.5">{n.message}</p>
                      </div>
                      <button
                        onClick={() => handleDelete(n.id)}
                        className="p-1 hover:bg-white/30 rounded-lg transition-colors shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <p className="text-xs opacity-60 mt-2">{new Date(n.createdAt).toLocaleDateString()} at {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </VoterLayout>
  );
}
