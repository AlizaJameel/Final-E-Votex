import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Bell, CheckCircle, CalendarDays, Users, Clock } from 'lucide-react';
import api, { GENERAL_ELECTION_ID, getSessionUser } from '../../api';
import VoterLayout from '../../components/VoterLayout';

interface User {
  id: number;
  name: string;
  email: string;
  cnic: string;
  status: string;
}

interface Election {
  id: number;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  status: string;
  candidateCount: number;
}

interface Notification {
  id: number;
  title: string;
  read: boolean;
  createdAt: string;
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return 'Just now';
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  return `${Math.floor(hours / 24)} day${hours >= 48 ? 's' : ''} ago`;
}

function countdown(endDate: string) {
  const diff = Math.max(0, new Date(endDate).getTime() - Date.now());
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  return `${d}d ${h}h ${m}m`;
}

export default function DashboardPage() {
  const location = useLocation();
  const [user, setUser] = useState<User | null>(null);
  const [election, setElection] = useState<Election | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [hasVoted, setHasVoted] = useState(false);
  const [votesCast, setVotesCast] = useState(0);
  const [voteStatusLoading, setVoteStatusLoading] = useState(false);
  const [loading, setLoading] = useState(true);

  const applyUser = (data: User) => setUser(data);

  useEffect(() => {
    const session = getSessionUser();
    if (session) applyUser(session);

    const onUserUpdated = (e: Event) => {
      const detail = (e as CustomEvent<User>).detail;
      if (detail) applyUser(detail);
    };
    window.addEventListener('evotex-user-updated', onUserUpdated);
    return () => window.removeEventListener('evotex-user-updated', onUserUpdated);
  }, []);

  useEffect(() => {
    async function fetchData() {
      try {
        const [userRes, electionsRes, notificationsRes] = await Promise.all([
          api.get('/auth/me'),
          api.get('/elections'),
          api.get('/notifications').catch(() => ({ data: [] })),
        ]);
        applyUser(userRes.data);
        const list = electionsRes.data as Election[];
        setElection(list.find(e => e.id === GENERAL_ELECTION_ID) || list[0] || null);
        setNotifications(notificationsRes.data || []);
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  useEffect(() => {
    if (!election) {
      setHasVoted(false);
      setVotesCast(0);
      return;
    }

    async function fetchVoteStatus() {
      setVoteStatusLoading(true);
      try {
        const response = await api.get(`/votes/status/${election.id}`);
        const payload = (response.data?.data ?? response.data) as { hasVoted?: boolean };
        const voted = payload?.hasVoted === true;
        setHasVoted(voted);
        setVotesCast(voted ? 1 : 0);
      } catch (error) {
        console.error('Failed to fetch vote status:', error);
        setHasVoted(false);
        setVotesCast(0);
      } finally {
        setVoteStatusLoading(false);
      }
    }

    fetchVoteStatus();
  }, [election?.id, location.pathname]);

  return (
    <VoterLayout title="Dashboard">
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-evotex-primary" />
        </div>
      ) : (
        <>
          <div className="bg-evotex-mint border border-evotex-mint-border rounded-2xl p-6 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Welcome back, {user?.name || 'Voter'}</h1>
              <p className="text-evotex-muted text-sm mt-1">You are verified and eligible to vote</p>
              {user?.cnic ? (
                <p className="text-evotex-muted text-sm mt-1 font-mono">CNIC: {user.cnic}</p>
              ) : null}
            </div>
            <span className="inline-flex items-center gap-1.5 bg-evotex-primary text-white text-sm font-semibold px-4 py-1.5 rounded-full self-start">
              <CheckCircle className="w-4 h-4" /> Verified
            </span>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[
              { label: 'Active Elections', value: '01', icon: CheckCircle },
              { label: 'Votes Cast', value: String(votesCast).padStart(2, '0'), icon: CheckCircle },
              { label: 'Elections Completed', value: '00', icon: Clock },
              { label: 'Days to Next Election', value: '04', icon: CalendarDays },
            ].map((stat, i) => {
              const Icon = stat.icon;
              return (
                <div key={i} className="evotex-card p-5 flex items-center justify-between">
                  <div>
                    <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
                    <p className="text-xs text-evotex-muted font-medium mt-1">{stat.label}</p>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-evotex-mint flex items-center justify-center">
                    <Icon className="w-5 h-5 text-evotex-primary" />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            <div>
              <h2 className="text-lg font-bold text-gray-900 mb-4">Active Elections</h2>
              {election ? (
                <div className="evotex-card p-6">
                  <span className="inline-block text-xs font-bold text-evotex-primary border border-evotex-primary px-3 py-0.5 rounded-full mb-4">
                    OPEN
                  </span>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{election.title}</h3>
                  <p className="text-sm text-evotex-muted mb-4">{election.description}</p>
                  <div className="space-y-2 text-sm text-evotex-muted mb-6">
                    <p className="flex items-center gap-2">
                      <CalendarDays className="w-4 h-4 text-evotex-primary shrink-0" />
                      {election.startDate.slice(0, 10)} to {election.endDate.slice(0, 10)}
                    </p>
                    <p className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-evotex-primary shrink-0" />
                      Ends in <span className="font-semibold text-evotex-primary">{countdown(election.endDate)}</span>
                    </p>
                    <p className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-evotex-primary shrink-0" />
                      {election.candidateCount} candidates
                    </p>
                  </div>
                  {voteStatusLoading ? (
                    <div className="flex justify-center py-3">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-evotex-primary" />
                    </div>
                  ) : hasVoted ? (
                    <>
                      <div className="rounded-2xl border border-evotex-mint-border bg-evotex-mint p-5 mb-4 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-evotex-primary text-white flex items-center justify-center shrink-0">
                          <CheckCircle className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="font-bold text-green-800">Vote Cast Successfully</p>
                          <p className="text-sm text-green-800/90">
                            Your vote has been recorded for {election.title}. Thank you for participating.
                          </p>
                        </div>
                      </div>
                      <Link
                        to={`/results/${election.id}`}
                        className="block w-full text-center evotex-btn-primary py-3.5"
                      >
                        View Results
                      </Link>
                    </>
                  ) : (
                    <Link
                      to="/elections/1/vote"
                      className="block w-full text-center evotex-btn-primary py-3.5"
                    >
                      Vote Now
                    </Link>
                  )}
                </div>
              ) : (
                <div className="evotex-card p-8 text-center text-evotex-muted text-sm">No active election</div>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-gray-900">Recent Notifications</h2>
                <Link to="/notifications" className="text-sm font-semibold text-evotex-primary hover:underline">
                  View All
                </Link>
              </div>
              <div className="evotex-card divide-y divide-gray-100">
                {notifications.length === 0 ? (
                  <p className="p-6 text-center text-evotex-muted text-sm">No notifications</p>
                ) : (
                  notifications.slice(0, 4).map((n, idx) => (
                    <div
                      key={n.id}
                      className={`flex items-start gap-3 p-4 ${!n.read && idx < 2 ? 'border-l-4 border-evotex-primary' : ''}`}
                    >
                      <Bell className="w-5 h-5 text-evotex-muted mt-0.5 shrink-0" />
                      <div>
                        <p className="font-semibold text-gray-900 text-sm">{n.title}</p>
                        <p className="text-xs text-evotex-muted mt-0.5">{timeAgo(n.createdAt)}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </VoterLayout>
  );
}
