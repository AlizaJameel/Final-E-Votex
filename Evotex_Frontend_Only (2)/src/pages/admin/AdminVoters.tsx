import { useState, useEffect } from 'react';
import { Search, Download, Users, CheckCircle, Clock, XCircle, Eye, Check, X } from 'lucide-react';
import api from '../../api';
import AdminLayout from '../../components/AdminSidebar';
import StatCard from '../../components/ui/StatCard';

interface Voter {
  id: number;
  name: string;
  email: string;
  cnic: string;
  phone?: string;
  status: 'pending' | 'verified' | 'rejected';
  biometric?: boolean;
  votesCast?: number;
  createdAt: string;
}

const statusStyles: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  verified: 'bg-green-50 text-green-700 border-green-200',
  rejected: 'bg-red-50 text-red-700 border-red-200',
};

function initials(name: string) {
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
}

export default function AdminVoters() {
  const [voters, setVoters] = useState<Voter[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'verified' | 'rejected'>('all');
  const [page, setPage] = useState(1);
  const perPage = 5;
  const [actioningId, setActioningId] = useState<number | null>(null);

  useEffect(() => {
    fetchVoters();
  }, []);

  async function fetchVoters() {
    try {
      const response = await api.get('/admin/voters');
      setVoters(response.data);
    } catch (error) {
      console.error('Failed to fetch voters:', error);
    } finally {
      setLoading(false);
    }
  }

  const filtered = voters.filter(v => {
    const matchStatus = statusFilter === 'all' || v.status === statusFilter;
    const q = search.toLowerCase();
    const matchSearch =
      v.name.toLowerCase().includes(q) || v.email.toLowerCase().includes(q) || v.cnic.includes(search);
    return matchStatus && matchSearch;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const pageItems = filtered.slice((page - 1) * perPage, page * perPage);

  async function updateStatus(voterId: number, newStatus: 'verified' | 'rejected') {
    setActioningId(voterId);
    try {
      await api.put(`/admin/voters/${voterId}/status`, { status: newStatus });
      setVoters(voters.map(v => (v.id === voterId ? { ...v, status: newStatus } : v)));
    } catch (error) {
      console.error('Failed to update voter status:', error);
    } finally {
      setActioningId(null);
    }
  }

  const stats = {
    total: voters.length,
    pending: voters.filter(v => v.status === 'pending').length,
    verified: voters.filter(v => v.status === 'verified').length,
    rejected: voters.filter(v => v.status === 'rejected').length,
  };

  const exportCsv = () => {
    const header = 'Name,Email,CNIC,Phone,Status,Biometric,Votes\n';
    const rows = filtered.map(v =>
      [v.name, v.email, v.cnic, v.phone || '', v.status, v.biometric ? 'Yes' : 'No', v.votesCast ?? 0].join(',')
    );
    const blob = new Blob([header + rows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'voters.csv';
    a.click();
  };

  return (
    <AdminLayout title="Voter Management">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Voters" value={stats.total} icon={Users} />
        <StatCard label="Verified" value={stats.verified} icon={CheckCircle} />
        <StatCard label="Pending" value={stats.pending} icon={Clock} iconColor="text-amber-600" iconBg="bg-amber-50" />
        <StatCard label="Rejected" value={stats.rejected} icon={XCircle} iconColor="text-red-600" iconBg="bg-red-50" />
      </div>

      <div className="evotex-card p-4 mb-6 flex flex-col lg:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by name, CNIC, or email..."
            className="evotex-input pl-10"
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value as typeof statusFilter); setPage(1); }}
          className="evotex-input w-full lg:w-36"
        >
          <option value="all">All</option>
          <option value="pending">Pending</option>
          <option value="verified">Verified</option>
          <option value="rejected">Rejected</option>
        </select>
        <button type="button" onClick={exportCsv} className="evotex-btn-outline flex items-center justify-center gap-2 text-sm py-2.5 whitespace-nowrap">
          <Download className="w-4 h-4" /> Export CSV
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-evotex-primary" />
        </div>
      ) : (
        <div className="evotex-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[800px]">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left p-4 font-semibold text-evotex-muted">#</th>
                  <th className="text-left p-4 font-semibold text-evotex-muted">VOTER INFO</th>
                  <th className="text-left p-4 font-semibold text-evotex-muted">CNIC</th>
                  <th className="text-left p-4 font-semibold text-evotex-muted">PHONE</th>
                  <th className="text-left p-4 font-semibold text-evotex-muted">BIOMETRIC</th>
                  <th className="text-center p-4 font-semibold text-evotex-muted">VOTES CAST</th>
                  <th className="text-center p-4 font-semibold text-evotex-muted">STATUS</th>
                  <th className="text-center p-4 font-semibold text-evotex-muted">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {pageItems.map((voter, idx) => (
                  <tr key={voter.id} className="hover:bg-gray-50">
                    <td className="p-4 text-evotex-muted">{(page - 1) * perPage + idx + 1}</td>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-evotex-mint text-evotex-primary text-xs font-bold flex items-center justify-center">
                          {initials(voter.name)}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{voter.name}</p>
                          <p className="text-xs text-evotex-muted">{voter.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 font-mono text-gray-800">{voter.cnic}</td>
                    <td className="p-4 text-evotex-muted">{voter.phone || '—'}</td>
                    <td className="p-4">
                      {voter.biometric ? (
                        <span className="inline-flex items-center gap-1 text-green-700 text-xs font-semibold">
                          <CheckCircle className="w-3.5 h-3.5" /> Registered
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-red-600 text-xs font-semibold">
                          <X className="w-3.5 h-3.5" /> Not Registered
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-center font-semibold">{voter.votesCast ?? 0}</td>
                    <td className="p-4 text-center">
                      <span className={`inline-block text-xs font-bold px-3 py-1 rounded-full border capitalize ${statusStyles[voter.status]}`}>
                        {voter.status}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-center gap-1">
                        <button type="button" className="p-2 text-gray-400 hover:text-evotex-primary rounded-lg" aria-label="View">
                          <Eye className="w-4 h-4" />
                        </button>
                        {voter.status === 'pending' && (
                          <>
                            <button
                              type="button"
                              disabled={actioningId === voter.id}
                              onClick={() => updateStatus(voter.id, 'verified')}
                              className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              disabled={actioningId === voter.id}
                              onClick={() => updateStatus(voter.id, 'rejected')}
                              className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-evotex-muted">
            <span>
              Showing {(page - 1) * perPage + 1}-{Math.min(page * perPage, filtered.length)} of {filtered.length}
            </span>
            <div className="flex gap-2">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPage(p)}
                  className={`w-8 h-8 rounded-full text-sm font-semibold ${
                    p === page ? 'bg-evotex-sidebar text-white' : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
