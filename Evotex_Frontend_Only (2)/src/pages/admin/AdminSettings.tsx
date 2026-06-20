import { useState, useEffect } from 'react';
import { Loader2, Shield, Bell, Lock } from 'lucide-react';
import api from '../../api';
import AdminLayout from '../../components/AdminSidebar';

interface Settings {
  siteName: string;
  adminEmail: string;
  emailNotifications: boolean;
  voteConfirmationAlerts: boolean;
  allowBiometric: boolean;
}

export default function AdminSettings() {
  const [settings, setSettings] = useState<Settings>({
    siteName: 'E-Votex',
    adminEmail: 'admin@evotex.com',
    emailNotifications: true,
    voteConfirmationAlerts: true,
    allowBiometric: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchSettings();
  }, []);

  async function fetchSettings() {
    try {
      const response = await api.get('/admin/settings');
      const data = response.data || {};
      setSettings({
        siteName: data.siteName || 'E-Votex',
        adminEmail: data.adminEmail || 'admin@evotex.com',
        emailNotifications: data.emailNotifications ?? data.notifyOnVote ?? true,
        voteConfirmationAlerts: data.voteConfirmationAlerts ?? data.notifyOnResult ?? true,
        allowBiometric: data.allowBiometric ?? true,
      });
    } catch (error) {
      console.error('Failed to fetch settings:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    setMessage('');
    try {
      await api.put('/admin/settings', settings);
      setMessage('Settings saved successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error: unknown) {
      const msg = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setMessage(msg || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  }

  const set = <K extends keyof Settings>(field: K, value: Settings[K]) => {
    setSettings(s => ({ ...s, [field]: value }));
  };

  const Toggle = ({ on, onChange }: { on: boolean; onChange: () => void }) => (
    <button
      type="button"
      onClick={onChange}
      className={`relative w-12 h-6 rounded-full transition-colors shrink-0 ${on ? 'bg-[#16a34a]' : 'bg-gray-300'}`}
    >
      <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow ${on ? 'left-6' : 'left-0.5'}`} />
    </button>
  );

  if (loading) {
    return (
      <AdminLayout title="Settings">
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#16a34a]" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Settings">
      <div className="max-w-3xl space-y-6">
        {message && (
          <div className={`${message.includes('successfully') ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'} border rounded-xl p-4 text-sm`}>
            {message}
          </div>
        )}

        <div className="bg-white rounded-2xl border border-[#e5e7eb] shadow-sm p-6">
          <div className="flex items-center gap-2 mb-5">
            <Shield className="w-5 h-5 text-[#14532d]" />
            <h2 className="text-lg font-bold text-[#14532d]">General Settings</h2>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Site Name</label>
              <input
                type="text"
                value={settings.siteName}
                onChange={e => set('siteName', e.target.value)}
                className="border border-[#e5e7eb] rounded-xl px-4 py-3 w-full outline-none focus:ring-2 focus:ring-green-200 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Admin Email</label>
              <input
                type="email"
                value={settings.adminEmail}
                onChange={e => set('adminEmail', e.target.value)}
                className="border border-[#e5e7eb] rounded-xl px-4 py-3 w-full outline-none focus:ring-2 focus:ring-green-200 text-sm"
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#e5e7eb] shadow-sm p-6">
          <div className="flex items-center gap-2 mb-5">
            <Bell className="w-5 h-5 text-[#14532d]" />
            <h2 className="text-lg font-bold text-[#14532d]">Notification Preferences</h2>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4 py-2">
              <div>
                <p className="font-semibold text-gray-900 text-sm">Email Notifications</p>
                <p className="text-xs text-[#6b7280] mt-0.5">Receive email alerts for new registrations and approvals.</p>
              </div>
              <Toggle on={settings.emailNotifications} onChange={() => set('emailNotifications', !settings.emailNotifications)} />
            </div>
            <div className="flex items-center justify-between gap-4 py-2">
              <div>
                <p className="font-semibold text-gray-900 text-sm">Vote Confirmation Alerts</p>
                <p className="text-xs text-[#6b7280] mt-0.5">Get notified when votes are cast in active elections.</p>
              </div>
              <Toggle on={settings.voteConfirmationAlerts} onChange={() => set('voteConfirmationAlerts', !settings.voteConfirmationAlerts)} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#e5e7eb] shadow-sm p-6">
          <div className="flex items-center gap-2 mb-5">
            <Lock className="w-5 h-5 text-[#14532d]" />
            <h2 className="text-lg font-bold text-[#14532d]">Security</h2>
          </div>
          <div className="flex items-center justify-between gap-4 py-2">
            <div>
              <p className="font-semibold text-gray-900 text-sm">Allow Biometric Authentication</p>
              <p className="text-xs text-[#6b7280] mt-0.5">Enable fingerprint and facial recognition for voting.</p>
            </div>
            <Toggle on={settings.allowBiometric} onChange={() => set('allowBiometric', !settings.allowBiometric)} />
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full max-w-xs bg-[#16a34a] hover:bg-green-700 disabled:opacity-50 text-white font-semibold rounded-xl py-3 transition-colors flex items-center justify-center gap-2"
        >
          {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : 'Save Settings'}
        </button>
      </div>
    </AdminLayout>
  );
}
