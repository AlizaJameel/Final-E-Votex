import { useState, useEffect } from 'react';

import { useParams, Link } from 'react-router-dom';

import { BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie } from 'recharts';

import { CalendarDays, Trophy, TrendingUp, Users, FileCheck, AlertCircle } from 'lucide-react';

import api from '../../api';

import VoterLayout from '../../components/VoterLayout';

import StatCard from '../../components/ui/StatCard';



interface Candidate {

  id: number;

  name: string;

  party: string;

  partyCode?: string;

  voteCount: number;

  photoUrl?: string;

}



interface ElectionResults {

  id: number;

  title: string;

  endDate: string;

  totalVotes: number;

  turnout?: number;

  candidates: Candidate[];

}



const BAR_COLORS = ['#14532d', '#16a34a', '#4ade80'];

const PIE_COLORS = ['#14532d', '#16a34a', '#86efac'];



function parseResultsPayload(raw: unknown): ElectionResults | null {

  if (!raw || typeof raw !== 'object') return null;



  const record = raw as Record<string, unknown>;

  const payload =

    record.data && typeof record.data === 'object'

      ? (record.data as Record<string, unknown>)

      : record;



  const candidatesRaw = Array.isArray(payload.candidates) ? payload.candidates : [];

  const candidates: Candidate[] = candidatesRaw.map((entry, index) => {

    const item = entry as Record<string, unknown>;

    return {

      id: Number(item.id ?? index + 1),

      name: String(item.name ?? `Candidate ${index + 1}`),

      party: String(item.party ?? item.partyCode ?? 'Independent'),

      partyCode: item.partyCode ? String(item.partyCode) : undefined,

      voteCount: Number(item.voteCount ?? item.votes ?? 0),

      photoUrl: item.photoUrl ? String(item.photoUrl) : undefined,

    };

  });



  const totalVotes = Number(

    payload.totalVotes ??

      payload.voteCount ??

      candidates.reduce((sum, candidate) => sum + candidate.voteCount, 0),

  );



  const turnout =

    payload.turnout != null

      ? Number(payload.turnout)

      : payload.voterTurnout != null

        ? Number(payload.voterTurnout)

        : undefined;



  if (!payload.title && candidates.length === 0) return null;



  return {

    id: Number(payload.id ?? 0),

    title: String(payload.title ?? 'Election Results'),

    endDate: String(payload.endDate ?? ''),

    totalVotes: Number.isFinite(totalVotes) ? totalVotes : 0,

    turnout: turnout != null && Number.isFinite(turnout) ? turnout : undefined,

    candidates,

  };

}



function formatEndDate(endDate: string) {

  if (!endDate) return 'Date unavailable';

  const parsed = new Date(endDate);

  if (Number.isNaN(parsed.getTime())) return 'Date unavailable';

  return parsed.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

}



export default function ResultsPage() {

  const { id } = useParams();

  const [election, setElection] = useState<ElectionResults | null>(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState('');



  useEffect(() => {

    async function fetchResults() {

      if (!id) {

        setError('Election ID is missing.');

        setLoading(false);

        return;

      }



      setLoading(true);

      setError('');



      try {

        const response = await api.get(`/elections/${id}/results`);

        const parsed = parseResultsPayload(response.data);

        if (!parsed) {

          setElection(null);

          setError('No results available for this election.');

          return;

        }

        setElection(parsed);

      } catch (err: unknown) {

        const message =

          (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||

          'Failed to load election results.';

        setElection(null);

        setError(message);

        console.error(err);

      } finally {

        setLoading(false);

      }

    }



    fetchResults();

  }, [id]);



  if (loading) {

    return (

      <VoterLayout title="Election Results">

        <div className="flex justify-center py-12">

          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-evotex-primary" />

        </div>

      </VoterLayout>

    );

  }



  if (error || !election) {

    return (

      <VoterLayout title="Election Results">

        <div className="evotex-card max-w-lg mx-auto p-8 text-center">

          <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-4" />

          <p className="text-evotex-muted mb-6">{error || 'Election not found'}</p>

          <Link

            to="/elections"

            className="inline-block border-2 border-evotex-primary text-evotex-primary font-semibold px-8 py-2.5 rounded-xl hover:bg-evotex-mint transition-colors text-sm"

          >

            Back to Elections

          </Link>

        </div>

      </VoterLayout>

    );

  }



  const candidates = election.candidates ?? [];

  const sorted = [...candidates].sort((a, b) => b.voteCount - a.voteCount);

  const totalVotes =

    election.totalVotes > 0

      ? election.totalVotes

      : sorted.reduce((sum, candidate) => sum + candidate.voteCount, 0);

  const winner = sorted[0];

  const share = winner && totalVotes > 0 ? Math.round((winner.voteCount / totalVotes) * 100) : 0;

  const maxVotes = sorted.length > 0 ? Math.max(...sorted.map(candidate => candidate.voteCount), 0) : 0;

  const yAxisMax = maxVotes > 0 ? Math.ceil(maxVotes * 1.1) : 100;



  const barData = sorted.map(candidate => ({

    name: candidate.name.split(' ')[0] || candidate.name,

    votes: candidate.voteCount,

  }));



  const pieData = sorted.map(candidate => ({

    name: candidate.name.split(' ')[0] || candidate.name,

    value: totalVotes > 0 ? Math.round((candidate.voteCount / totalVotes) * 100) : 0,

  }));



  return (

    <VoterLayout title="Election Results">

      <span className="inline-block text-xs font-semibold text-evotex-primary bg-evotex-mint border border-evotex-mint-border px-3 py-1 rounded-full mb-4">

        Election Results

      </span>

      <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">{election.title}</h1>

      <p className="flex items-center gap-2 text-sm text-evotex-muted mb-6">

        <CalendarDays className="w-4 h-4 text-evotex-primary" />

        Election ended on {formatEndDate(election.endDate)}

      </p>



      {winner && (

        <div className="bg-evotex-primary rounded-2xl text-white p-6 mb-6 flex flex-col sm:flex-row items-center justify-between gap-6">

          <div className="flex items-center gap-4">

            <div className="w-14 h-14 rounded-xl bg-green-800/40 flex items-center justify-center">

              <Trophy className="w-7 h-7" />

            </div>

            <div>

              <p className="text-xs uppercase tracking-wide text-white/80 font-semibold">Winner</p>

              <p className="text-2xl font-bold">{winner.name}</p>

              <p className="text-sm text-white/90">{winner.partyCode || winner.party}</p>

            </div>

          </div>

          <div className="text-center sm:text-right">

            <p className="text-2xl font-bold">{winner.voteCount.toLocaleString()} votes</p>

            <p className="text-lg font-semibold text-white/90">{share}%</p>

          </div>

        </div>

      )}



      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">

        <StatCard label="Total Votes Cast" value={totalVotes.toLocaleString()} icon={TrendingUp} />

        <StatCard

          label="Voter Turnout"

          value={election.turnout != null ? `${election.turnout}%` : 'N/A'}

          icon={Users}

        />

        <StatCard label="Total Candidates" value={sorted.length} icon={FileCheck} />

      </div>



      {sorted.length > 0 ? (

        <>

          <div className="grid lg:grid-cols-2 gap-6">

            <div className="evotex-card p-6">

              <h2 className="text-lg font-bold text-gray-900 mb-4">Votes Per Candidate</h2>

              <ResponsiveContainer width="100%" height={280}>

                <BarChart data={barData}>

                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />

                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />

                  <YAxis tick={{ fontSize: 12 }} domain={[0, yAxisMax]} />

                  <Tooltip />

                  <Bar dataKey="votes" radius={[6, 6, 0, 0]}>

                    {barData.map((_, i) => (

                      <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />

                    ))}

                  </Bar>

                </BarChart>

              </ResponsiveContainer>

            </div>



            <div className="evotex-card p-6">

              <h2 className="text-lg font-bold text-gray-900 mb-4">Vote Share (%)</h2>

              <ResponsiveContainer width="100%" height={280}>

                <PieChart>

                  <Pie

                    data={pieData}

                    dataKey="value"

                    nameKey="name"

                    cx="50%"

                    cy="50%"

                    innerRadius={55}

                    outerRadius={90}

                    paddingAngle={2}

                  >

                    {pieData.map((_, i) => (

                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />

                    ))}

                  </Pie>

                  <Tooltip formatter={(v: number) => [`${v}%`, 'Share']} />

                </PieChart>

              </ResponsiveContainer>

              <div className="flex flex-wrap justify-center gap-4 mt-2">

                {pieData.map((d, i) => (

                  <span key={d.name} className="flex items-center gap-2 text-sm text-evotex-muted">

                    <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: PIE_COLORS[i] }} />

                    {d.name}

                  </span>

                ))}

              </div>

            </div>

          </div>



          <div className="evotex-card p-6 mt-6">

            <h2 className="text-lg font-bold text-gray-900 mb-4">Detailed Results</h2>

            <div className="overflow-x-auto">

              <table className="w-full text-sm">

                <thead>

                  <tr className="text-left text-xs uppercase tracking-wide text-evotex-muted border-b border-gray-100">

                    <th className="pb-3 pr-4 font-semibold">Rank</th>

                    <th className="pb-3 pr-4 font-semibold">Candidate</th>

                    <th className="pb-3 pr-4 font-semibold">Party</th>

                    <th className="pb-3 pr-4 font-semibold">Votes</th>

                    <th className="pb-3 pr-4 font-semibold">Share</th>

                    <th className="pb-3 font-semibold">Progress</th>

                  </tr>

                </thead>

                <tbody className="divide-y divide-gray-50">

                  {sorted.map((candidate, i) => {

                    const pct = totalVotes > 0 ? Math.round((candidate.voteCount / totalVotes) * 100) : 0;

                    const barColors = ['bg-evotex-sidebar', 'bg-evotex-primary', 'bg-green-400'];

                    return (

                      <tr key={candidate.id}>

                        <td className="py-4 pr-4 font-bold text-gray-900">{i + 1}</td>

                        <td className="py-4 pr-4 font-bold text-gray-900">{candidate.name}</td>

                        <td className="py-4 pr-4 text-evotex-muted">{candidate.partyCode || candidate.party}</td>

                        <td className="py-4 pr-4 font-semibold">{candidate.voteCount.toLocaleString()}</td>

                        <td className="py-4 pr-4 font-semibold">{pct}%</td>

                        <td className="py-4 min-w-[140px]">

                          <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">

                            <div

                              className={`h-full rounded-full ${barColors[i % barColors.length]}`}

                              style={{ width: `${pct}%` }}

                            />

                          </div>

                        </td>

                      </tr>

                    );

                  })}

                </tbody>

              </table>

            </div>

          </div>

        </>

      ) : (

        <div className="evotex-card p-8 text-center text-evotex-muted text-sm">

          No candidate results available yet.

        </div>

      )}



      <div className="mt-6 text-center">

        <Link

          to="/elections"

          className="inline-block border-2 border-evotex-primary text-evotex-primary font-semibold px-8 py-2.5 rounded-xl hover:bg-evotex-mint transition-colors text-sm"

        >

          Back to Elections

        </Link>

      </div>

    </VoterLayout>

  );

}


