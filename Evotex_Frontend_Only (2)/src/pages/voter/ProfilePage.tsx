import { useState, useEffect, useCallback } from 'react';
import { User, Mail, Shield, CheckCircle } from 'lucide-react';
import api, { getSessionUser } from '../../api';
import VoterLayout from '../../components/VoterLayout';

interface UserProfile {
  id: number;
  name: string;
  email: string;
  cnic: string;
  status: string;
  createdAt?: string;
}

export default function ProfilePage() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const applyUser = useCallback((data: UserProfile) => {
    setUser(data);
  }, []);

  const loadProfile = useCallback(async () => {
    const session = getSessionUser();
    if (session) applyUser(session);

    try {
      const response = await api.get('/auth/me');
      applyUser(response.data);
    } catch (err) {
      if (!session) setError('Failed to load profile');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [applyUser]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  useEffect(() => {
    const onUserUpdated = (e: Event) => {
      const detail = (e as CustomEvent<UserProfile>).detail;
      if (detail) applyUser(detail);
      else loadProfile();
    };
    window.addEventListener('evotex-user-updated', onUserUpdated);
    return () => window.removeEventListener('evotex-user-updated', onUserUpdated);
  }, [loadProfile, applyUser]);

  if (loading) {
    return (
      <VoterLayout title="My Votes">
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-evotex-primary" />
        </div>
      </VoterLayout>
    );
  }

  return (
    <VoterLayout title="My Votes">
      {error && !user && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {user && (
        <div className="max-w-xl mx-auto">
          <div className="evotex-card p-6 sm:p-8">
            <div className="flex items-center gap-4 mb-6 pb-6 border-b border-gray-100">
              <div className="w-14 h-14 bg-evotex-primary rounded-xl flex items-center justify-center shrink-0">
                <User className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">My Details</h1>
                <p className="text-sm text-evotex-muted">Your voter information</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-evotex-mint/50 rounded-xl p-4 flex items-start gap-4">
                <User className="w-5 h-5 text-evotex-primary mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-evotex-muted font-medium">Full Name</p>
                  <p className="text-sm font-bold text-gray-900 mt-1">{user.name}</p>
                </div>
              </div>

              <div className="bg-evotex-mint/50 rounded-xl p-4 flex items-start gap-4">
                <Shield className="w-5 h-5 text-evotex-primary mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-evotex-muted font-medium">CNIC</p>
                  <p className="text-sm font-bold text-gray-900 font-mono mt-1" aria-live="polite">
                    {user.cnic || '—'}
                  </p>
                </div>
              </div>

              <div className="bg-evotex-mint/50 rounded-xl p-4 flex items-start gap-4">
                <Mail className="w-5 h-5 text-evotex-primary mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-evotex-muted font-medium">Email</p>
                  <p className="text-sm font-bold text-gray-900 mt-1 break-all">{user.email}</p>
                </div>
              </div>

              <div className="bg-evotex-mint/50 rounded-xl p-4 flex items-start gap-4">
                <CheckCircle className="w-5 h-5 text-evotex-primary mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-evotex-muted font-medium">Status</p>
                  <p className="text-sm font-bold text-evotex-primary mt-1 capitalize">
                    {user.status === 'verified' ? 'Verified Voter' : user.status}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </VoterLayout>
  );
}
