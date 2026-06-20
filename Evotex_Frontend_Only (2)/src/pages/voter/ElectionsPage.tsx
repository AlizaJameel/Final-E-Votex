import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Vote, Clock, Search, CalendarDays, Users, CheckCircle } from 'lucide-react';
import api from '../../api';
import VoterLayout from '../../components/VoterLayout';

interface Election {
  id: number;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  status: 'active' | 'upcoming' | 'ended';
  candidateCount: number;
  voteCount: number;
}

function CountdownTimer({ endDate }: { endDate: string }) {
  const [text, setText] = useState('');
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const end = new Date(endDate).getTime();
    const update = () => {
      const diff = Math.max(0, end - Date.now());
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      setText(`${d}d ${h}h ${m}m`);
      rafRef.current = requestAnimationFrame(update);
    };
    update();
    return () => cancelAnimationFrame(rafRef.current);
  }, [endDate]);

  return <span className="font-mono text-[#16a34a] font-bold">{text}</span>;
}

const statusBadge: Record<string, string> = {
  active: 'bg-[#f0fdf4] text-[#16a34a] border border-[#bbf7d0]',
  ended: 'bg-gray-100 text-gray-600 border border-gray-200',
  upcoming: 'bg-amber-50 text-[#f59e0b] border border-amber-200',
};

export default function ElectionsPage() {
  const [elections, setElections] = useState<Election[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    async function fetchElections() {
      try {
        const response = await api.get('/elections');
        setElections(response.data);
      } catch (error) {
        console.error('Failed to fetch elections:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchElections();
  }, []);

  const filtered = elections.filter(e => {
    const matchTab = tab === 'all' || e.status === tab;
    const matchSearch = e.title.toLowerCase().includes(search.toLowerCase());
    return matchTab && matchSearch;
  });

  const activeCount = elections.filter(e => e.status === 'active').length;
  const upcomingCount = elections.filter(e => e.status === 'upcoming').length;

  return (
    <VoterLayout title="Elections">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Elections</h1>
        <p className="text-[#6b7280] text-sm mt-0.5">Browse and participate in active elections</p>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        {['all', 'active', 'upcoming'].map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold capitalize transition-colors ${
              tab === t ? 'bg-[#16a34a] text-white' : 'text-[#6b7280] hover:bg-[#f0fdf4]'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="relative mb-5">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search elections..."
          className="border border-[#bbf7d0] focus:ring-2 focus:ring-green-400 rounded-xl px-4 py-2.5 pl-10 w-full outline-none text-sm bg-white"
        />
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-[#bbf7d0] shadow-sm p-4 flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-[#16a34a]" />
          <div>
            <p className="text-lg font-bold text-gray-900" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{activeCount}</p>
            <p className="text-xs text-[#6b7280]">Active</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-[#bbf7d0] shadow-sm p-4 flex items-center gap-3">
          <Vote className="w-4 h-4 text-[#16a34a]" />
          <div>
            <p className="text-lg font-bold text-gray-900" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{elections.reduce((s, e) => s + e.voteCount, 0).toLocaleString()}</p>
            <p className="text-xs text-[#6b7280]">Total Votes</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-[#bbf7d0] shadow-sm p-4 flex items-center gap-3">
          <Clock className="w-4 h-4 text-[#16a34a]" />
          <div>
            <p className="text-lg font-bold text-gray-900" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{upcomingCount}</p>
            <p className="text-xs text-[#6b7280]">Upcoming</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#16a34a]"></div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <Vote className="w-12 h-12 mx-auto text-gray-200 mb-3" />
          <p className="text-[#6b7280] font-medium">No elections found</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {filtered.map(e => (
            <div key={e.id} className="bg-white rounded-2xl border border-[#bbf7d0] shadow-sm p-5 hover:shadow-md transition-shadow">
              <div className="flex justify-end mb-3">
                <span className={`text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full ${statusBadge[e.status]}`}>
                  {e.status}
                </span>
              </div>
              <h3 className="font-bold text-gray-900 mb-1" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{e.title}</h3>
              <p className="text-sm text-[#6b7280] mb-3">{e.description}</p>
              <div className="border-t border-gray-50 pt-3 space-y-2">
                <div className="flex items-center gap-2 text-xs text-[#6b7280]">
                  <CalendarDays className="w-3.5 h-3.5" />
                  {new Date(e.startDate).toLocaleDateString()} to {new Date(e.endDate).toLocaleDateString()}
                </div>
                {e.status === 'active' && (
                  <div className="flex items-center gap-2 text-xs">
                    <Clock className="w-3.5 h-3.5 text-[#16a34a]" />
                    Ends in <CountdownTimer endDate={e.endDate} />
                  </div>
                )}
                <div className="flex items-center gap-2 text-xs text-[#6b7280]">
                  <Users className="w-3.5 h-3.5" /> {e.candidateCount} Candidates
                </div>
              </div>
              <div className="mt-4">
                {e.status === 'active' ? (
                  <Link to={`/elections/${e.id}/vote`} className="block w-full bg-[#16a34a] hover:bg-green-700 text-white font-semibold rounded-xl py-2.5 text-sm text-center transition-colors">
                    Vote Now
                  </Link>
                ) : e.status === 'upcoming' ? (
                  <button disabled className="w-full bg-gray-100 text-gray-400 font-semibold rounded-xl py-2.5 text-sm cursor-not-allowed">
                    Coming Soon
                  </button>
                ) : (
                  <Link to={`/results/${e.id}`} className="block w-full border border-[#16a34a] text-[#16a34a] hover:bg-[#f0fdf4] font-semibold rounded-xl py-2.5 text-sm text-center transition-colors">
                    View Results
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </VoterLayout>
  );
}
