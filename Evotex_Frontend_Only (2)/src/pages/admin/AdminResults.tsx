import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Trophy, Medal, Award, RefreshCw } from 'lucide-react';
import api from '../../api';
import AdminLayout from '../../components/AdminSidebar';

interface Candidate {
  id: number;
  name: string;
  party: string;
  partyCode?: string;
  voteCount: number;
  photoUrl: string;
  symbol: string;
}

interface Election {
  id: number;
  title: string;
  candidates: Candidate[];
  voteCount: number;
}

const TIMELINE_DATA = [
  { time: '8AM', votes: 420 },
  { time: '9AM', votes: 680 },
  { time: '10AM', votes: 920 },
  { time: '11AM', votes: 1200 },
  { time: '12PM', votes: 980 },
  { time: '1PM', votes: 640 },
  { time: '2PM', votes: 880 },
  { time: '3PM', votes: 1100 },
  { time: '4PM', votes: 1340 },
  { time: '5PM', votes: 1050 },
  { time: '6PM', votes: 780 },
  { time: '7PM', votes: 520 },
  { time: '8PM', votes: 310 },
];

const ELIGIBLE_VOTERS = 100000;
const rankIcon = [Trophy, Medal, Award];

export default function AdminResults() {
  const { id } = useParams();
  const [election, setElection] = useState<Election | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchResults() {
      try {
        const response = await api.get(`/elections/${id}/results`);
        setElection(response.data);
      } catch (error) {
        console.error('Failed to load election results:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchResults();
  }, [id]);

  if (loading) {
    return (
      <AdminLayout title="Election Results">
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#16a34a]" />
        </div>
      </AdminLayout>
    );
  }

  if (!election) {
    return (
      <AdminLayout title="Election Results">
        <p className="text-center text-[#6b7280] py-12">Election not found</p>
      </AdminLayout>
    );
  }

  const sorted = [...election.candidates].sort((a, b) => b.voteCount - a.voteCount);
  const totalVotes = sorted.reduce((sum, c) => sum + c.voteCount, 0) || election.voteCount;

  return (
    <AdminLayout title="Election Results">
      <div className="bg-white rounded-2xl border border-[#e5e7eb] shadow-sm overflow-hidden mb-6">
        <div className="p-6 border-b border-[#f3f4f6]">
          <h2 className="text-lg font-bold text-gray-900">Detailed Results</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[#f9fafb] border-b border-[#e5e7eb]">
              <tr>
                <th className="text-left p-4 font-semibold text-[#6b7280] uppercase text-xs">Rank</th>
                <th className="text-left p-4 font-semibold text-[#6b7280] uppercase text-xs">Candidate</th>
                <th className="text-left p-4 font-semibold text-[#6b7280] uppercase text-xs">Party</th>
                <th className="text-right p-4 font-semibold text-[#6b7280] uppercase text-xs">Votes</th>
                <th className="text-right p-4 font-semibold text-[#6b7280] uppercase text-xs">Share</th>
                <th className="text-right p-4 font-semibold text-[#6b7280] uppercase text-xs">% of Eligible</th>
                <th className="text-left p-4 font-semibold text-[#6b7280] uppercase text-xs min-w-[140px]">Progress</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((c, idx) => {
                const share = totalVotes > 0 ? Math.round((c.voteCount / totalVotes) * 100) : 0;
                const eligiblePct = Math.round((c.voteCount / ELIGIBLE_VOTERS) * 100);
                const Icon = rankIcon[idx] || Award;
                const iconColor = idx === 0 ? 'text-amber-500' : idx === 1 ? 'text-gray-400' : 'text-amber-700';
                return (
                  <tr key={c.id} className="border-b border-[#f3f4f6] hover:bg-[#fafafa]">
                    <td className="p-4">
                      <Icon className={`w-6 h-6 ${iconColor}`} />
                    </td>
                    <td className="p-4 font-semibold text-gray-900">{c.name}</td>
                    <td className="p-4 text-[#6b7280]">{(c as Candidate).partyCode || c.party}</td>
                    <td className="p-4 text-right font-semibold">{c.voteCount.toLocaleString()}</td>
                    <td className="p-4 text-right font-semibold">{share}%</td>
                    <td className="p-4 text-right font-semibold">{eligiblePct}%</td>
                    <td className="p-4">
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-[#16a34a] rounded-full" style={{ width: `${share}%` }} />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-[#e5e7eb] shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-gray-900">Voting Activity Timeline</h2>
          <div className="flex items-center gap-2 text-sm text-[#6b7280]">
            <RefreshCw className="w-4 h-4" />
            Peak: 4PM (1,340 votes)
          </div>
        </div>
        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={TIMELINE_DATA}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
            <XAxis dataKey="time" tick={{ fontSize: 12 }} stroke="#9ca3af" />
            <YAxis tick={{ fontSize: 12 }} stroke="#9ca3af" domain={[0, 1400]} ticks={[0, 200, 400, 600, 800, 1000, 1200, 1400]} />
            <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }} />
            <Line type="monotone" dataKey="votes" stroke="#16a34a" strokeWidth={3} dot={{ fill: '#16a34a', r: 4 }} activeDot={{ r: 6 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </AdminLayout>
  );
}
