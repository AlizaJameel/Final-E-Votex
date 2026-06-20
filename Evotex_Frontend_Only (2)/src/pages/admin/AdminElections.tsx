import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Edit, Trash2, Eye, Search, Plus } from 'lucide-react';
import api from '../../api';
import AdminLayout from '../../components/AdminSidebar';
interface Election {
  id: number;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  status: 'upcoming' | 'active' | 'ended';
  candidateCount: number;
  voteCount: number;
}

export default function AdminElections() {
  const [elections, setElections] = useState<Election[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'upcoming' | 'active' | 'ended'>('all');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchElections();
  }, []);

  async function fetchElections() {
    try {
      const response = await api.get('/admin/elections');
      setElections(response.data);
    } catch (error) {
      console.error('Failed to fetch elections:', error);
    } finally {
      setLoading(false);
    }
  }

  const filtered = elections.filter(e => {
    const matchStatus = statusFilter === 'all' || e.status === statusFilter;
    const matchSearch = e.title.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  async function handleDelete(id: number) {
    setDeleting(true);
    try {
      await api.delete(`/admin/elections/${id}`);
      setElections(elections.filter(e => e.id !== id));
      setShowDeleteConfirm(null);
    } catch (error) {
      console.error('Failed to delete election:', error);
    } finally {
      setDeleting(false);
    }
  }

  async function toggleStatus(id: number, current: string) {
    const next = current === 'active' ? 'ended' : 'active';
    try {
      await api.put(`/admin/elections/${id}`, { status: next });
      setElections(elections.map(e => (e.id === id ? { ...e, status: next as Election['status'] } : e)));
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  }

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <AdminLayout title="Elections Management">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-bold text-gray-900">Elections</h2>
          <span className="text-xs font-medium text-evotex-muted bg-gray-100 px-2.5 py-1 rounded-full">
            {elections.length} total
          </span>
        </div>
        <Link to="/admin/elections/create" className="evotex-btn-primary inline-flex items-center gap-2 text-sm px-5 py-2.5">
          <Plus className="w-4 h-4" /> Create New Election
        </Link>
      </div>

      <div className="flex flex-wrap gap-3 mb-6">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search elections..."
            className="evotex-input w-full pl-10"
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value as typeof statusFilter)}
          className="evotex-input w-auto min-w-[120px]"
        >
          <option value="all">All Status</option>
          <option value="upcoming">Upcoming</option>
          <option value="active">Active</option>
          <option value="ended">Ended</option>
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-evotex-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="evotex-card p-12 text-center text-evotex-muted">No elections found</div>
      ) : (
        <div className="evotex-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-evotex-mint/50 border-b border-evotex-mint-border text-left text-xs uppercase tracking-wide text-evotex-muted">
                  <th className="p-4 font-semibold">#</th>
                  <th className="p-4 font-semibold">Title</th>
                  <th className="p-4 font-semibold">Start Date</th>
                  <th className="p-4 font-semibold">End Date</th>
                  <th className="p-4 font-semibold">Status</th>
                  <th className="p-4 font-semibold text-right">Total Votes</th>
                  <th className="p-4 font-semibold text-center">Candidates</th>
                  <th className="p-4 font-semibold text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((election, idx) => (
                  <tr key={election.id} className="hover:bg-gray-50/80">
                    <td className="p-4 text-evotex-muted">{idx + 1}</td>
                    <td className="p-4 font-bold text-gray-900">{election.title}</td>
                    <td className="p-4 text-evotex-muted">{formatDate(election.startDate)}</td>
                    <td className="p-4 text-evotex-muted">{formatDate(election.endDate)}</td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => toggleStatus(election.id, election.status)}
                          className={`relative w-11 h-6 rounded-full transition-colors ${
                            election.status === 'active' ? 'bg-evotex-primary' : 'bg-gray-300'
                          }`}
                          aria-label="Toggle election status"
                        >
                          <span
                            className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                              election.status === 'active' ? 'translate-x-5' : ''
                            }`}
                          />
                        </button>
                        <span
                          className={`text-xs font-bold capitalize ${
                            election.status === 'active' ? 'text-evotex-primary' : 'text-evotex-muted'
                          }`}
                        >
                          {election.status}
                        </span>
                      </div>
                    </td>
                    <td className="p-4 text-right font-semibold">{election.voteCount.toLocaleString()}</td>
                    <td className="p-4 text-center">{election.candidateCount}</td>
                    <td className="p-4">
                      <div className="flex items-center justify-center gap-2">
                        <Link
                          to={`/admin/results/${election.id}`}
                          className="p-2 text-evotex-muted hover:text-evotex-primary rounded-lg hover:bg-evotex-mint"
                          title="Manage / View"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        <Link
                          to={`/admin/elections/edit/${election.id}`}
                          className="p-2 text-evotex-muted hover:text-evotex-primary rounded-lg hover:bg-evotex-mint"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </Link>
                        <button
                          type="button"
                          onClick={() => setShowDeleteConfirm(election.id)}
                          className="p-2 text-evotex-muted hover:text-red-600 rounded-lg hover:bg-red-50"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 text-sm text-evotex-muted">
            <span>
              Showing 1-{filtered.length} of {filtered.length} results
            </span>
            <div className="flex gap-1">
              <span className="w-8 h-8 flex items-center justify-center rounded-full bg-evotex-sidebar text-white text-sm font-bold">
                1
              </span>
            </div>
          </div>
        </div>
      )}

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowDeleteConfirm(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-2">Delete Election?</h2>
            <p className="text-evotex-muted text-sm mb-6">
              This action cannot be undone. All votes and candidate data will be permanently deleted.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(null)}
                disabled={deleting}
                className="flex-1 px-4 py-2 border border-gray-200 text-gray-600 rounded-xl font-semibold hover:bg-gray-50 text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDelete(showDeleteConfirm)}
                disabled={deleting}
                className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl font-semibold text-sm"
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
