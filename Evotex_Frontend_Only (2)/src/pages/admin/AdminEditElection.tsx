import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ChevronLeft, Loader2, Plus, Trash2, CalendarDays, Vote } from 'lucide-react';
import api from '../../api';
import AdminLayout from '../../components/AdminSidebar';

interface Candidate {
  id: number;
  name: string;
  party: string;
  photoUrl?: string;
}

interface Election {
  id: number;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  candidates: Candidate[];
}

export default function AdminEditElection() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState({ title: '', description: '', startDate: '', endDate: '' });
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    async function fetchElection() {
      try {
        const response = await api.get(`/admin/elections/${id}`);
        const data = response.data;
        setForm({
          title: data.title,
          description: data.description,
          startDate: data.startDate,
          endDate: data.endDate,
        });
        setCandidates(data.candidates || []);
      } catch (error) {
        setErrors({ fetch: 'Failed to load election' });
      } finally {
        setLoading(false);
      }
    }
    fetchElection();
  }, [id]);

  const set = (field: string, value: string) => setForm(f => ({ ...f, [field]: value }));
  const addCandidate = () => setCandidates(prev => [...prev, { id: Date.now(), name: '', party: '' }]);
  const removeCandidate = (candidateId: number) => setCandidates(prev => prev.filter(c => c.id !== candidateId));
  const updateCandidate = (candidateId: number, field: string, value: string) => 
    setCandidates(prev => prev.map(c => c.id === candidateId ? { ...c, [field]: value } : c));

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.title.trim()) e.title = 'Title is required.';
    if (!form.startDate) e.startDate = 'Start date is required.';
    if (!form.endDate) e.endDate = 'End date is required.';
    if (form.startDate && form.endDate && form.startDate >= form.endDate) e.endDate = 'End must be after start.';
    if (candidates.length < 1) e.candidates = 'At least 1 candidate required.';
    if (candidates.some(c => !c.name.trim())) e.candidates = 'All candidates need a name.';
    return e;
  };

  const handleSubmit = async () => {
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSaving(true);
    try {
      await api.put(`/admin/elections/${id}`, {
        title: form.title,
        description: form.description,
        startDate: new Date(form.startDate).toISOString(),
        endDate: new Date(form.endDate).toISOString(),
        candidates: candidates.map(c => ({
          id: typeof c.id === 'number' && c.id > 100000 ? undefined : c.id,
          name: c.name,
          party: c.party,
          photoUrl: c.photoUrl || null,
        })),
      });
      navigate('/admin/elections');
    } catch (error: any) {
      setErrors({ submit: error.response?.data?.message || 'Failed to update election' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout title="Edit Election">
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#16a34a]"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Edit Election">
        <Link to="/admin/elections" className="inline-flex items-center gap-1.5 text-sm text-[#16a34a] font-medium hover:underline mb-6">
          <ChevronLeft className="w-4 h-4" /> Back to Elections
        </Link>

        <div className="grid lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3 space-y-6">
            <div className="bg-white rounded-3xl border border-[#bbf7d0] shadow-sm p-6">
              <h3 className="font-bold text-gray-900 text-lg mb-5" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Edit Election</h3>
              <div className="space-y-5">
                {errors.submit && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
                    {errors.submit}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Title <span className="text-red-400">*</span></label>
                  <input
                    type="text"
                    value={form.title}
                    onChange={e => set('title', e.target.value)}
                    className={`border ${errors.title ? 'border-red-400' : 'border-[#bbf7d0]'} rounded-xl px-4 py-2.5 w-full outline-none focus:ring-2 focus:ring-green-300 text-sm`}
                  />
                  {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title}</p>}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Description</label>
                  <textarea
                    value={form.description}
                    onChange={e => set('description', e.target.value)}
                    rows={4}
                    className="border border-[#bbf7d0] rounded-xl px-4 py-2.5 w-full outline-none focus:ring-2 focus:ring-green-300 text-sm resize-none"
                  />
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Start Date <span className="text-red-400">*</span></label>
                    <input
                      type="datetime-local"
                      value={form.startDate}
                      onChange={e => set('startDate', e.target.value)}
                      className={`border ${errors.startDate ? 'border-red-400' : 'border-[#bbf7d0]'} rounded-xl px-4 py-2.5 w-full outline-none focus:ring-2 focus:ring-green-300 text-sm`}
                    />
                    {errors.startDate && <p className="text-red-500 text-xs mt-1">{errors.startDate}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">End Date <span className="text-red-400">*</span></label>
                    <input
                      type="datetime-local"
                      value={form.endDate}
                      onChange={e => set('endDate', e.target.value)}
                      className={`border ${errors.endDate ? 'border-red-400' : 'border-[#bbf7d0]'} rounded-xl px-4 py-2.5 w-full outline-none focus:ring-2 focus:ring-green-300 text-sm`}
                    />
                    {errors.endDate && <p className="text-red-500 text-xs mt-1">{errors.endDate}</p>}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-3xl border border-[#bbf7d0] shadow-sm p-6">
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-bold text-gray-900 text-lg" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Candidates</h3>
                <button
                  onClick={addCandidate}
                  className="flex items-center gap-1.5 text-sm text-[#16a34a] font-semibold border border-[#bbf7d0] rounded-xl px-3 py-1.5 hover:bg-[#f0fdf4] transition-colors"
                >
                  <Plus className="w-4 h-4" /> Add
                </button>
              </div>
              {errors.candidates && <p className="text-red-500 text-xs mb-3">{errors.candidates}</p>}
              <div className="space-y-3">
                {candidates.map((c, i) => (
                  <div key={c.id} className="flex items-start gap-3 p-4 bg-[#f9fafb] rounded-xl border border-[#e5e7eb]">
                    <span className="w-7 h-7 bg-[#f0fdf4] rounded-lg flex items-center justify-center text-[#16a34a] font-bold text-xs shrink-0">{i + 1}</span>
                    <div className="flex-1 grid sm:grid-cols-3 gap-3">
                      <input
                        type="text"
                        value={c.name}
                        onChange={e => updateCandidate(c.id, 'name', e.target.value)}
                        placeholder="Name"
                        className="border border-[#e5e7eb] rounded-xl px-3 py-2 w-full outline-none focus:ring-2 focus:ring-green-300 text-sm"
                      />
                      <input
                        type="text"
                        value={c.party}
                        onChange={e => updateCandidate(c.id, 'party', e.target.value)}
                        placeholder="Party"
                        className="border border-[#e5e7eb] rounded-xl px-3 py-2 w-full outline-none focus:ring-2 focus:ring-green-300 text-sm"
                      />
                      <input
                        type="text"
                        value={c.photoUrl || ''}
                        onChange={e => updateCandidate(c.id, 'photoUrl', e.target.value)}
                        placeholder="Photo URL"
                        className="border border-[#e5e7eb] rounded-xl px-3 py-2 w-full outline-none focus:ring-2 focus:ring-green-300 text-sm"
                      />
                    </div>
                    {candidates.length > 1 && (
                      <button onClick={() => removeCandidate(c.id)} className="text-gray-400 hover:text-red-500 mt-1.5">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => navigate('/admin/elections')}
                className="flex-1 border border-gray-200 text-gray-700 font-semibold rounded-xl py-3 hover:bg-gray-50 transition-colors text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={saving}
                className="flex-1 bg-[#16a34a] hover:bg-green-700 disabled:opacity-50 text-white font-semibold rounded-xl py-3 transition-colors text-sm flex items-center justify-center gap-2"
              >
                {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
    </AdminLayout>
  );
}
