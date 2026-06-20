import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import {
  Users,
  Vote,
  TrendingUp,
  CheckCircle,
  User,
  AlertTriangle,
  Zap,
  Eye,
  Settings,
  Plus,
  Lock,
  Check,
  AlertCircle,
} from 'lucide-react';
import api, { GENERAL_ELECTION_ID } from '../../api';
import AdminLayout from '../../components/AdminSidebar';

interface Election {
  id: number;
  title: string;
  status: 'upcoming' | 'active' | 'ended';
  voteCount: number;
  candidateCount: number;
  startDate?: string;
  endDate?: string;
  constituency?: string;
}

interface DashboardStats {
  totalRegisteredVoters: number;
  totalVotesCast: number;
  pendingVoters: number;
}

interface AuditLogEntry {
  type: 'success' | 'warning' | 'danger';
  text: string;
  time: string;
}

function getDashboardPayload(raw: unknown): Record<string, unknown> | null {
  if (!raw || typeof raw !== 'object') return null;

  const record = raw as Record<string, unknown>;
  return record.data && typeof record.data === 'object'
    ? (record.data as Record<string, unknown>)
    : record;
}

function formatAuditTime(value: unknown): string {
  if (!value) return '';
  if (typeof value === 'string') {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) {
      return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    }
    return value;
  }
  return String(value);
}

function parseAuditLogs(raw: unknown): AuditLogEntry[] {
  if (!Array.isArray(raw)) return [];

  return raw
    .map(entry => {
      const item = entry as Record<string, unknown>;
      const typeRaw = String(item.type ?? item.level ?? item.severity ?? 'success').toLowerCase();
      const type: AuditLogEntry['type'] =
        typeRaw === 'warning' || typeRaw === 'danger' ? typeRaw : 'success';

      return {
        type,
        text: String(item.text ?? item.message ?? item.description ?? item.action ?? ''),
        time: formatAuditTime(item.time ?? item.timestamp ?? item.createdAt ?? ''),
      };
    })
    .filter(item => item.text);
}

function parseDashboardStats(raw: unknown): DashboardStats | null {
  const payload = getDashboardPayload(raw);
  if (!payload) return null;

  const totalRegisteredVoters = Number(
    payload.totalRegisteredVoters ?? payload.registeredVoters ?? 0,
  );
  const totalVotesCast = Number(payload.totalVotesCast ?? payload.votesCast ?? 0);
  const pendingVoters = Number(payload.pendingVoters ?? 0);

  if (!totalRegisteredVoters && !totalVotesCast && !pendingVoters) return null;

  return { totalRegisteredVoters, totalVotesCast, pendingVoters };
}

function formatVoterTurnout(stats: DashboardStats): string {
  if (stats.totalRegisteredVoters <= 0) return '0.0%';
  return `${((stats.totalVotesCast / stats.totalRegisteredVoters) * 100).toFixed(1)}%`;
}

const PROVINCE_DATA = [
  { name: 'Punjab', turnout: 82 },
  { name: 'Sindh', turnout: 74 },
  { name: 'KPK', turnout: 68 },
  { name: 'Balochistan', turnout: 55 },
  { name: 'Islamabad', turnout: 88 },
];

export default function AdminDashboard() {
  const [elections, setElections] = useState<Election[]>([]);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        const [electionsRes, statsRes] = await Promise.all([
          api.get('/admin/elections'),
          api.get('/admin/dashboard-stats'),
        ]);
        setElections(electionsRes.data);
        setDashboardStats(parseDashboardStats(statsRes.data));
        const payload = getDashboardPayload(statsRes.data);
        setAuditLogs(parseAuditLogs(payload?.auditLogs));
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchDashboardData();
  }, []);

  const mainElection =
    elections.find(e => e.id === GENERAL_ELECTION_ID) || elections[0];
  const totalCandidates = elections.reduce((sum, e) => sum + e.candidateCount, 0);
  const activeElections = elections.filter(e => e.status === 'active').length;

  const stats = [
    {
      label: 'Total Registered Voters',
      value: dashboardStats ? dashboardStats.totalRegisteredVoters.toLocaleString() : '—',
      icon: Users,
    },
    {
      label: 'Total Votes Cast',
      value: dashboardStats ? dashboardStats.totalVotesCast.toLocaleString() : '—',
      icon: Vote,
    },
    {
      label: 'Voter Turnout',
      value: dashboardStats ? formatVoterTurnout(dashboardStats) : '—',
      icon: TrendingUp,
    },
    { label: 'Active Elections', value: String(activeElections || 1), icon: CheckCircle },
    { label: 'Total Candidates', value: String(totalCandidates || 3), icon: User },
    { label: 'Flagged Issues', value: String(dashboardStats?.pendingVoters ?? 0), icon: AlertTriangle, alert: true },
  ];

  return (
    <AdminLayout title="Admin Dashboard">
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-evotex-primary" />
        </div>
      ) : (
        <>
          <div className="bg-evotex-primary rounded-2xl p-6 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-white">Welcome, Admin</h2>
              <p className="text-white/90 text-sm mt-1">
                Manage elections, voters, and view real-time analytics.
              </p>
            </div>
            <span className="inline-flex items-center gap-2 bg-white/20 text-white text-sm font-semibold px-4 py-2 rounded-full self-start">
              <Zap className="w-4 h-4" /> System Active
            </span>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {stats.map((stat, i) => {
              const Icon = stat.icon;
              return (
                <div
                  key={i}
                  className={`evotex-card p-5 flex items-center justify-between ${
                    stat.alert ? 'border-red-200 bg-red-50/30' : ''
                  }`}
                >
                  <div>
                    <p className="text-xs text-evotex-muted font-medium mb-1">{stat.label}</p>
                    <p className={`text-2xl font-bold ${stat.alert ? 'text-red-600' : 'text-gray-900'}`}>
                      {stat.value}
                    </p>
                  </div>
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      stat.alert ? 'bg-red-100' : 'bg-evotex-mint'
                    }`}
                  >
                    <Icon className={`w-5 h-5 ${stat.alert ? 'text-red-500' : 'text-evotex-primary'}`} />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            <div className="evotex-card p-6">
              {mainElection ? (
                <>
                  <h3 className="text-lg font-bold text-gray-900 mb-1">{mainElection.title}</h3>
                  <p className="text-sm text-evotex-muted mb-4">
                    May 2, 2026 – May 4, 2026
                  </p>
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="inline-block text-xs font-bold text-evotex-primary bg-evotex-mint border border-evotex-mint-border px-3 py-0.5 rounded-full mb-2">
                        Open
                      </span>
                      <p className="text-3xl font-bold text-gray-900">
                        {mainElection.voteCount.toLocaleString()}
                      </p>
                      <p className="text-xs text-evotex-muted">total votes</p>
                    </div>
                    <div className="flex gap-2">
                      <Link
                        to={`/admin/results/${mainElection.id}`}
                        className="p-2 rounded-lg border border-gray-200 hover:bg-evotex-mint text-evotex-muted"
                        title="View results"
                      >
                        <Eye className="w-5 h-5" />
                      </Link>
                      <Link
                        to={`/admin/elections/edit/${mainElection.id}`}
                        className="p-2 rounded-lg border border-gray-200 hover:bg-evotex-mint text-evotex-muted"
                        title="Manage election"
                      >
                        <Settings className="w-5 h-5" />
                      </Link>
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-evotex-muted text-sm">No elections configured</p>
              )}
            </div>

            <div className="evotex-card p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Regional Statistics</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={PROVINCE_DATA}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} tickFormatter={v => `${v}%`} />
                  <Tooltip formatter={(v: number) => [`${v}%`, 'Turnout']} />
                  <Bar dataKey="turnout" fill="#16a34a" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="evotex-card p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Recent Audit Log</h3>
              {auditLogs.length === 0 ? (
                <p className="text-sm text-evotex-muted">No recent activity</p>
              ) : (
                <ul className="space-y-4">
                  {auditLogs.map((item, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm">
                      {item.type === 'success' && (
                        <Check className="w-5 h-5 text-evotex-primary shrink-0 mt-0.5" />
                      )}
                      {item.type === 'warning' && (
                        <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                      )}
                      {item.type === 'danger' && (
                        <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-gray-900">{item.text}</p>
                        {item.time ? (
                          <p className="text-xs text-evotex-muted mt-0.5">{item.time}</p>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="evotex-card p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <Link
                  to="/admin/elections/create"
                  className="flex items-center justify-center gap-2 w-full evotex-btn-primary py-3 text-sm"
                >
                  <Plus className="w-4 h-4" /> Add Election
                </Link>
                <Link
                  to="/admin/elections"
                  className="flex items-center justify-center gap-2 w-full border-2 border-evotex-primary text-evotex-primary font-semibold rounded-xl py-3 text-sm hover:bg-evotex-mint transition-colors"
                >
                  <User className="w-4 h-4" /> Add Candidate
                </Link>
                {mainElection && (
                  <Link
                    to={`/admin/results/${mainElection.id}`}
                    className="flex items-center justify-center gap-2 w-full border-2 border-evotex-primary text-evotex-primary font-semibold rounded-xl py-3 text-sm hover:bg-evotex-mint transition-colors"
                  >
                    <Vote className="w-4 h-4" /> Export Results
                  </Link>
                )}
                <button
                  type="button"
                  className="flex items-center justify-center gap-2 w-full border-2 border-evotex-primary text-evotex-primary font-semibold rounded-xl py-3 text-sm hover:bg-evotex-mint transition-colors"
                >
                  <Lock className="w-4 h-4" /> Lock Election
                </button>
                <button
                  type="button"
                  className="flex items-center justify-center gap-2 w-full bg-red-500 hover:bg-red-600 text-white font-semibold rounded-xl py-3 text-sm transition-colors"
                >
                  View Flagged Issues (5)
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </AdminLayout>
  );
}
