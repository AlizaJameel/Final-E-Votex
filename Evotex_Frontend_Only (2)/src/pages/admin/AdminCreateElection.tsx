import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Vote, CalendarDays, Plus, Trash2, ChevronLeft, Loader2 } from 'lucide-react';
import api from '../../api';
import AdminLayout from '../../components/AdminSidebar';

interface Candidate {
  id: number;
  name: string;
  party: string;
  photoUrl?: string;
}

export default function AdminCreateElection() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ title: '', description: '', startDate: '', endDate: '' });
  const [candidates, setCandidates] = useState<Candidate[]>([{ id: 1, name: '', party: '' }]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const set = (field: string, value: string | boolean) => setForm(f => ({ ...f, [field]: value }));
  const addCandidate = () => setCandidates(prev => [...prev, { id: Date.now(), name: '', party: '' }]);
  const removeCandidate = (id: number) => setCandidates(prev => prev.filter(c => c.id !== id));
  const updateCandidate = (id: number, field: string, value: string) => setCandidates(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c));

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

    setSubmitting(true);
    try {
      const response = await api.post('/admin/elections', {
        title: form.title,
        description: form.description,
        startDate: new Date(form.startDate).toISOString(),
        endDate: new Date(form.endDate).toISOString(),
        candidates: candidates.map(c => ({
          name: c.name,
          party: c.party,
          photoUrl: c.photoUrl || null,
        })),
      });
      navigate('/admin/elections');
    } catch (error: any) {
      setErrors({ submit: error.response?.data?.message || 'Failed to create election' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AdminLayout title="Candidates">
        <Link to="/admin/elections" className="inline-flex items-center gap-1.5 text-sm text-[#16a34a] font-medium hover:underline mb-6">
          <ChevronLeft className="w-4 h-4" /> Back to Elections
        </Link>

        <div className="grid lg:grid-cols-5 gap-6">
          {/* Left — Form */}
          <div className="lg:col-span-3 space-y-6">
            <div className="bg-white rounded-3xl border border-[#bbf7d0] shadow-sm p-6">
              <h3 className="font-bold text-gray-900 text-lg mb-5" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Election Details</h3>
              <div className="space-y-5">
                {errors.submit && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
                    {errors.submit}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Election Title <span className="text-red-400">*</span></label>
                  <div className="relative">
                    <Vote className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={form.title}
                      onChange={e => set('title', e.target.value)}
                      placeholder="e.g. General Election 2024"
                      className={`border ${errors.title ? 'border-red-400 ring-2 ring-red-100' : 'border-[#bbf7d0] focus:ring-2 focus:ring-green-300'} rounded-xl px-4 py-2.5 pl-10 w-full outline-none text-sm transition-shadow`}
                    />
                  </div>
                  {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title}</p>}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Description</label>
                  <textarea
                    value={form.description}
                    onChange={e => set('description', e.target.value)}
                    rows={4}
                    placeholder="Describe the purpose and scope of this election..."
                    className="border border-[#bbf7d0] focus:ring-2 focus:ring-green-300 rounded-xl px-4 py-2.5 w-full outline-none text-sm resize-none transition-shadow"
                  />
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Start Date & Time <span className="text-red-400">*</span></label>
                    <div className="relative">
                      <CalendarDays className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="datetime-local"
                        value={form.startDate}
                        onChange={e => set('startDate', e.target.value)}
                        className={`border ${errors.startDate ? 'border-red-400 ring-2 ring-red-100' : 'border-[#bbf7d0] focus:ring-2 focus:ring-green-300'} rounded-xl px-4 py-2.5 pl-10 w-full outline-none text-sm transition-shadow`}
                      />
                    </div>
                    {errors.startDate && <p className="text-red-500 text-xs mt-1">{errors.startDate}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">End Date & Time <span className="text-red-400">*</span></label>
                    <div className="relative">
                      <CalendarDays className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="datetime-local"
                        value={form.endDate}
                        onChange={e => set('endDate', e.target.value)}
                        className={`border ${errors.endDate ? 'border-red-400 ring-2 ring-red-100' : 'border-[#bbf7d0] focus:ring-2 focus:ring-green-300'} rounded-xl px-4 py-2.5 pl-10 w-full outline-none text-sm transition-shadow`}
                      />
                    </div>
                    {errors.endDate && <p className="text-red-500 text-xs mt-1">{errors.endDate}</p>}
                  </div>
                </div>
              </div>
            </div>

            {/* Candidates */}
            <div className="bg-white rounded-3xl border border-[#bbf7d0] shadow-sm p-6">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-gray-900 text-lg" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Candidates</h3>
                  <span className="bg-[#f0fdf4] text-[#16a34a] text-xs font-bold px-2 py-0.5 rounded-full">{candidates.length}</span>
                </div>
                <button
                  onClick={addCandidate}
                  className="flex items-center gap-1.5 text-sm text-[#16a34a] font-semibold border border-[#bbf7d0] rounded-xl px-3 py-1.5 hover:bg-[#f0fdf4] transition-colors"
                >
                  <Plus className="w-4 h-4" /> Add Candidate
                </button>
              </div>
              {errors.candidates && <p className="text-red-500 text-xs mb-3">{errors.candidates}</p>}
              <div className="space-y-3">
                {candidates.map((c, i) => (
                  <div key={c.id} className="flex items-start gap-3 p-4 bg-[#f9fafb] rounded-xl border border-[#e5e7eb]">
                    <span className="w-7 h-7 bg-[#f0fdf4] rounded-lg flex items-center justify-center text-[#16a34a] font-bold text-xs shrink-0 mt-1.5">{i + 1}</span>
                    <div className="flex-1 grid sm:grid-cols-3 gap-3">
                      <div>
                        <input
                          type="text"
                          value={c.name}
                          onChange={e => updateCandidate(c.id, 'name', e.target.value)}
                          placeholder="Candidate full name"
                          className="border border-[#e5e7eb] focus:ring-2 focus:ring-green-300 rounded-xl px-3 py-2 w-full outline-none text-sm bg-white transition-shadow"
                        />
                      </div>
                      <div>
                        <input
                          type="text"
                          value={c.party}
                          onChange={e => updateCandidate(c.id, 'party', e.target.value)}
                          placeholder="Political party name"
                          className="border border-[#e5e7eb] focus:ring-2 focus:ring-green-300 rounded-xl px-3 py-2 w-full outline-none text-sm bg-white transition-shadow"
                        />
                      </div>
                      <div>
                        <input
                          type="text"
                          value={c.photoUrl || ''}
                          onChange={e => updateCandidate(c.id, 'photoUrl', e.target.value)}
                          placeholder="Photo URL"
                          className="border border-[#e5e7eb] focus:ring-2 focus:ring-green-300 rounded-xl px-3 py-2 w-full outline-none text-sm bg-white transition-shadow"
                        />
                      </div>
                    </div>
                    {candidates.length > 1 && (
                      <button onClick={() => removeCandidate(c.id)} className="text-gray-400 hover:text-red-500 transition-colors mt-1.5 shrink-0">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <button
                onClick={addCandidate}
                className="mt-4 w-full border-2 border-dashed border-[#bbf7d0] text-[#16a34a] font-semibold rounded-xl py-3 text-sm hover:bg-[#f0fdf4] transition-colors flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" /> Add Another Candidate
              </button>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => navigate('/admin/elections')}
                className="flex-1 border border-gray-200 text-gray-700 font-semibold rounded-xl py-3 hover:bg-gray-50 transition-colors text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex-1 bg-[#16a34a] hover:bg-green-700 disabled:opacity-50 text-white font-semibold rounded-xl py-3 transition-colors text-sm flex items-center justify-center gap-2"
              >
                {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating...</> : 'Create Election'}
              </button>
            </div>
          </div>

          {/* Right — Summary */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-3xl border border-[#bbf7d0] shadow-sm p-6 sticky top-24">
              <h3 className="font-bold text-gray-900 mb-4" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Election Summary</h3>
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-[#6b7280] font-medium">Title</p>
                  <p className="text-gray-900 font-semibold mt-0.5">{form.title || 'Not set'}</p>
                </div>
                <div>
                  <p className="text-[#6b7280] font-medium">Candidates</p>
                  <p className="text-gray-900 font-semibold mt-0.5">{candidates.length} candidates</p>
                </div>
                {form.startDate && (
                  <div>
                    <p className="text-[#6b7280] font-medium">Start Date</p>
                    <p className="text-gray-900 font-semibold mt-0.5">{new Date(form.startDate).toLocaleDateString()}</p>
                  </div>
                )}
                {form.endDate && (
                  <div>
                    <p className="text-[#6b7280] font-medium">End Date</p>
                    <p className="text-gray-900 font-semibold mt-0.5">{new Date(form.endDate).toLocaleDateString()}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
    </AdminLayout>
  );
}
