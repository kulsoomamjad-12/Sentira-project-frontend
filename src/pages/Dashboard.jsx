import React, { useEffect, useState } from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import jsPDF from 'jspdf';
import { getAnalyticsSummary, getTopicTrends, getFeedback, getTickets, getForms, deleteFeedbackItem } from '../services/api';
import TopNav from '../components/TopNav';
import SentimentBadge from '../components/SentimentBadge';
import UrgencyBadge from '../components/UrgencyBadge';
import { LoadingState } from '../components/Spinner';
import CountUp from '../components/CountUp';

const TAG_COLORS = ['#a78bfa', '#34d399', '#fbbf24', '#f87171', '#60a5fa', '#22d3ee'];
const SENTIMENT_COLORS = { Positive: '#34d399', Neutral: '#fbbf24', Negative: '#f87171' };

// Reshapes the backend's per-tag weekly-count arrays into one array of
// { week, tagA, tagB, ... } rows, which is what recharts expects.
function buildTrendChartData(trends) {
  const weekMap = {};

  trends.forEach(({ _id: tag, weeklyCounts }) => {
    weeklyCounts.forEach(({ week, count }) => {
      const weekLabel = new Date(week).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
      });
      if (!weekMap[weekLabel]) weekMap[weekLabel] = { week: weekLabel };
      weekMap[weekLabel][tag] = count;
    });
  });

  return Object.values(weekMap);
}

// Same week-bucketing idea as buildTrendChartData, but grouped by sentiment
// instead of tag, computed client-side from the raw feedback list (no
// separate backend endpoint needed).
function buildSentimentTrendData(feedback) {
  const weekMap = {};

  feedback.forEach((item) => {
    const sentiment = item.aiAnalysis?.sentiment;
    if (!sentiment) return;

    const d = new Date(item.createdAt);
    const day = d.getDay();
    const diff = (day === 0 ? -6 : 1) - day; // back up to Monday of that week
    const weekStart = new Date(d);
    weekStart.setDate(d.getDate() + diff);
    weekStart.setHours(0, 0, 0, 0);
    const key = weekStart.toISOString();

    if (!weekMap[key]) {
      weekMap[key] = {
        key,
        week: weekStart.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        Positive: 0,
        Neutral: 0,
        Negative: 0,
      };
    }
    weekMap[key][sentiment] += 1;
  });

  return Object.values(weekMap).sort((a, b) => a.key.localeCompare(b.key));
}

// Groups feedback by calendar month and returns this-month vs last-month
// counts per sentiment, for a direct month-over-month comparison chart
// (distinct from the continuous weekly sparkline above).
function buildMonthlySentimentComparison(feedback) {
  const now = new Date();
  const thisMonthKey = `${now.getFullYear()}-${now.getMonth()}`;
  const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthKey = `${lastMonthDate.getFullYear()}-${lastMonthDate.getMonth()}`;

  const counts = {
    thisMonth: { Positive: 0, Neutral: 0, Negative: 0 },
    lastMonth: { Positive: 0, Neutral: 0, Negative: 0 },
  };

  feedback.forEach((item) => {
    const sentiment = item.aiAnalysis?.sentiment;
    if (!sentiment) return;
    const d = new Date(item.createdAt);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    if (key === thisMonthKey) counts.thisMonth[sentiment] += 1;
    else if (key === lastMonthKey) counts.lastMonth[sentiment] += 1;
  });

  return ['Positive', 'Neutral', 'Negative'].map((sentiment) => ({
    sentiment,
    'This month': counts.thisMonth[sentiment],
    'Last month': counts.lastMonth[sentiment],
  }));
}

// Builds a CSV string from raw feedback rows for the weekly export.
function toCSV(rows) {
  const header = ['Customer', 'Email', 'Rating', 'Comment', 'Sentiment', 'Emotion', 'Urgency', 'Tags', 'Date'];
  const escape = (val) => `"${String(val ?? '').replace(/"/g, '""')}"`;
  const lines = [header.map(escape).join(',')];

  rows.forEach((r) => {
    lines.push(
      [
        r.customerName || 'Anonymous',
        r.customerEmail || '',
        r.rating ?? '',
        r.comment,
        r.aiAnalysis?.sentiment || '',
        r.aiAnalysis?.emotion || '',
        r.aiAnalysis?.urgency || '',
        (r.aiAnalysis?.tags || []).join('; '),
        new Date(r.createdAt).toLocaleString(),
      ]
        .map(escape)
        .join(',')
    );
  });

  return lines.join('\n');
}

// Blends CSAT (out of 5), NPS (-100..100), and % positive sentiment into one
// 0-100 index — averaging whichever of the three are actually available, so
// it degrades gracefully rather than showing a fake number early on.
function computeHealthScore(summary) {
  if (!summary) return null;
  const components = [];
  if (summary.csat) components.push((summary.csat.average / 5) * 100);
  if (summary.nps) components.push(((summary.nps.score + 100) / 200) * 100);
  if (summary.breakdown?.length) {
    const positivePct = summary.breakdown.find((b) => b.sentiment === 'Positive')?.percentage ?? 0;
    components.push(positivePct);
  }
  if (!components.length) return null;
  return Math.round(components.reduce((a, b) => a + b, 0) / components.length);
}

// Derives a per-tag ticket status from the actual tickets linked to feedback
// carrying that tag. Returns null when the tag has no ticket at all (those
// tags are excluded from Top Fixes entirely — it only tracks topics that
// already have, or still need, someone working them). Otherwise:
//   green  = every linked ticket is resolved
//   red    = at least one linked ticket is assigned to someone but still open/in-progress
//   grey   = every linked ticket is still unassigned (nobody's working it yet)
function getTagTicketStatus(tag, tickets) {
  const matching = tickets.filter((t) => t.feedback?.aiAnalysis?.tags?.includes(tag));
  if (!matching.length) return null;
  if (matching.every((t) => t.status === 'resolved')) return { label: 'Resolved', dotClass: 'bg-green-500' };
  if (matching.some((t) => t.assignedTo)) return { label: 'Assigned', dotClass: 'bg-red-500' };
  return { label: 'Unassigned', dotClass: 'bg-gray-500' };
}

function HealthRing({ score }) {
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 80 ? '#34d399' : score >= 60 ? '#a78bfa' : score >= 40 ? '#fbbf24' : '#f87171';
  const label = score >= 80 ? 'Excellent' : score >= 60 ? 'Good' : score >= 40 ? 'Needs Attention' : 'Critical';

  return (
    <div className="flex flex-col items-center">
      <svg width="110" height="110" viewBox="0 0 110 110">
        <circle cx="55" cy="55" r={radius} fill="none" stroke="#1f2740" strokeWidth="10" />
        <circle
          cx="55"
          cy="55"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 55 55)"
        />
        <text x="55" y="51" textAnchor="middle" fontSize="22" fontWeight="700" fill="#e6e9f5">
          {score}
        </text>
        <text x="55" y="68" textAnchor="middle" fontSize="10" fill="#6b7284">
          /100
        </text>
      </svg>
      <p className="text-xs font-semibold mt-1" style={{ color }}>
        {label}
      </p>
    </div>
  );
}

function StatCard({ icon, value, label }) {
  return (
    <div className="panel-card p-3 flex items-start gap-2">
      <div className="icon-circle" style={{ width: 32, height: 32 }}>
        {icon}
      </div>
      <div>
        <p className="text-lg font-bold text-white leading-none">{value}</p>
        <p className="text-gray-500 text-[11px] mt-1">{label}</p>
      </div>
    </div>
  );
}

const ICONS = {
  csat: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 2l2.9 6.9 7.1.6-5.6 4.7 1.8 7-6.2-4-6.2 4 1.8-7-5.6-4.7 7.1-.6L12 2z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  nps: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M23 6l-9.5 9.5-5-5L1 18" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M17 6h6v6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  responses: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  tickets: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 8v4M12 16h.01" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
};

export default function Dashboard() {
  const currentUser = JSON.parse(localStorage.getItem('user') || 'null');
  const canDelete = currentUser?.role === 'admin';

  const [summary, setSummary] = useState(null);
  const [trends, setTrends] = useState([]);
  const [feedback, setFeedback] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [forms, setForms] = useState([]);
  const [selectedFormId, setSelectedFormId] = useState('');
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [sentimentFilter, setSentimentFilter] = useState('');
  const [urgencyFilter, setUrgencyFilter] = useState('');
  const [minIntensity, setMinIntensity] = useState(1);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState('');
  const [deletingId, setDeletingId] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [exportingCsv, setExportingCsv] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);

  // Forms + tickets are fetched once — tickets are filtered client-side
  // below to match whichever form is currently selected.
  useEffect(() => {
    getForms().then((res) => setForms(res.data.forms));
    getTickets().then((res) => setTickets(res.data.tickets));
  }, []);

  // Re-fetched whenever the form switcher changes, so the whole dashboard
  // (stats, charts, feedback table) reflects just that one form.
  useEffect(() => {
    setLoading(true);
    const formId = selectedFormId || undefined;
    Promise.all([getAnalyticsSummary({ formId }), getTopicTrends({ formId }), getFeedback({ formId })])
      .then(([summaryRes, trendsRes, feedbackRes]) => {
        setSummary(summaryRes.data);
        setTrends(trendsRes.data.trends);
        setFeedback(feedbackRes.data.feedback);
      })
      .finally(() => setLoading(false));
  }, [selectedFormId]);

  const chartData = buildTrendChartData(trends);
  const tagNames = trends.map((t) => t._id);
  const visibleFeedbackIds = new Set(feedback.map((f) => f._id));
  const visibleTickets = tickets.filter((t) => visibleFeedbackIds.has(t.feedback?._id || t.feedback));
  const resolvedTicketCount = visibleTickets.filter((t) => t.status === 'resolved').length;
  const sentimentTrendData = buildSentimentTrendData(feedback);
  const monthlyComparison = buildMonthlySentimentComparison(feedback);
  const healthScore = computeHealthScore(summary);
  // Top Fixes only tracks topics that already have a ticket (assigned or
  // still needing to be), so tags with no ticket at all are dropped here —
  // not just hidden by the dot color.
  const topTags = trends
    .map((t) => ({ ...t, ticketStatus: getTagTicketStatus(t._id, visibleTickets) }))
    .filter((t) => t.ticketStatus)
    .slice(0, 5);

  const visibleFeedback = feedback
    .filter((f) => !sentimentFilter || f.aiAnalysis?.sentiment === sentimentFilter)
    .filter((f) => !urgencyFilter || f.aiAnalysis?.urgency === urgencyFilter)
    .filter((f) => (f.aiAnalysis?.intensity ?? 0) >= minIntensity)
    .filter((f) => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return f.comment.toLowerCase().includes(q) || (f.customerName || '').toLowerCase().includes(q);
    })
    .slice(0, 5);

  // Both exports pull a fresh, date-scoped fetch (last 7 days) rather than
  // reusing the already-loaded `feedback` state, which isn't date-limited.
  const handleExportCSV = async () => {
    setExportingCsv(true);
    try {
      const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const res = await getFeedback({ startDate });
      const blob = new Blob([toCSV(res.data.feedback)], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `weekly-feedback-report-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExportingCsv(false);
    }
  };

  const handleDeleteFeedback = async (feedbackId) => {
    setDeleteError('');
    setDeletingId(feedbackId);
    try {
      await deleteFeedbackItem(feedbackId);
      setFeedback((prev) => prev.filter((f) => f._id !== feedbackId));
      setTickets((prev) => prev.filter((t) => (t.feedback?._id || t.feedback) !== feedbackId));
      setConfirmingDeleteId('');
    } catch (err) {
      setDeleteError(err.response?.data?.message || 'Failed to delete review');
    } finally {
      setDeletingId('');
    }
  };

  const handleExportPDF = async () => {
    setExportingPdf(true);
    try {
      const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const res = await getFeedback({ startDate });
      const items = res.data.feedback;

      const positive = items.filter((i) => i.aiAnalysis?.sentiment === 'Positive').length;
      const neutral = items.filter((i) => i.aiAnalysis?.sentiment === 'Neutral').length;
      const negative = items.filter((i) => i.aiAnalysis?.sentiment === 'Negative').length;

      const doc = new jsPDF();
      doc.setFontSize(18);
      doc.text('Weekly Feedback Report', 14, 20);
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Generated ${new Date().toLocaleDateString()} — last 7 days`, 14, 27);

      doc.setFontSize(12);
      doc.setTextColor(0);
      doc.text(`Total responses: ${items.length}`, 14, 38);
      doc.text(`Positive: ${positive}    Neutral: ${neutral}    Negative: ${negative}`, 14, 45);

      let y = 58;
      doc.setFontSize(11);
      doc.text('Feedback', 14, y);
      y += 7;
      doc.setFontSize(9);

      if (items.length === 0) {
        doc.text('No feedback in this period.', 14, y);
      }

      items.slice(0, 60).forEach((item) => {
        if (y > 280) {
          doc.addPage();
          y = 20;
        }
        const line = `[${item.aiAnalysis?.sentiment || 'N/A'}] ${item.customerName || 'Anonymous'}: ${item.comment}`;
        const wrapped = doc.splitTextToSize(line, 180);
        doc.text(wrapped, 14, y);
        y += wrapped.length * 5 + 3;
      });

      doc.save(`weekly-feedback-report-${new Date().toISOString().slice(0, 10)}.pdf`);
    } finally {
      setExportingPdf(false);
    }
  };

  return (
    <div className="space-background-2 relative min-h-screen overflow-hidden pb-20">
      <div className="glow-orb w-[600px] h-[600px] -top-64 left-1/2 -translate-x-1/2" />

      <div className="relative z-10 pt-20">
        <TopNav />

        <div className="text-center max-w-2xl mx-auto mt-16 mb-12 px-4">
          {/* <span className="badge-chip mb-4">Sentiment overview</span> */}
          <h1 className="text-3xl sm:text-4xl font-semibold text-white mb-2">
            Know exactly how customers <span className="accent-italic text-accent-light">feel</span>
          </h1>
          <p className="text-gray-400 text-sm">
            Emotion, urgency, and topic trends — pulled automatically from every response.
          </p>
        </div>

        {forms.length > 0 && (
          <div className="max-w-6xl mx-auto px-4 mb-4 flex justify-end">
            <select
              value={selectedFormId}
              onChange={(e) => setSelectedFormId(e.target.value)}
              className="input-field w-auto text-sm py-2"
            >
              <option value="">All forms</option>
              {forms.map((form) => (
                <option key={form._id} value={form._id}>
                  {form.title}
                </option>
              ))}
            </select>
          </div>
        )}

        {loading ? (
          <LoadingState label="Loading dashboard..." className="py-24" />
        ) : (
          <div className="max-w-6xl mx-auto px-4 space-y-4">
            {/* Health score + stat cards + performance chart */}
            <div className="grid grid-cols-1 lg:grid-cols-[auto_1fr_1.6fr] gap-4 items-stretch">
              <div className="panel-card p-5 flex flex-col items-center justify-center">
                <p className="text-xs text-gray-500 mb-2">Customer Health</p>
                {healthScore == null ? (
                  <p className="text-gray-600 text-xs text-center max-w-[120px]">Not enough data yet</p>
                ) : (
                  <HealthRing score={healthScore} />
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <StatCard icon={ICONS.csat} value={summary?.csat ? `${summary.csat.average}/5` : '—'} label="CSAT score" />
                <StatCard icon={ICONS.nps} value={summary?.nps ? `${summary.nps.score > 0 ? '+' : ''}${summary.nps.score}` : '—'} label="NPS score" />
                <StatCard icon={ICONS.responses} value={summary?.totalFeedback ?? 0} label="Total responses" />
                <StatCard icon={ICONS.tickets} value={resolvedTicketCount} label="Resolved tickets" />
              </div>

              <div className="panel-card p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-semibold text-white text-sm">Topic performance</h2>
                  <span className="badge-chip text-[11px] py-1 px-3">Last 8 weeks</span>
                </div>
                {chartData.length === 0 ? (
                  <p className="text-gray-500 text-sm text-center py-16">Not enough data yet to show trends.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1f2740" vertical={false} />
                      <XAxis dataKey="week" stroke="#6b7284" fontSize={11} />
                      <YAxis allowDecimals={false} stroke="#6b7284" fontSize={11} />
                      <Tooltip
                        contentStyle={{ background: '#0c1120', border: '1px solid #1f2740', borderRadius: 12 }}
                        labelStyle={{ color: '#e6e9f5' }}
                      />
                      <Legend wrapperStyle={{ fontSize: 11, color: '#cbd3ea' }} />
                      {tagNames.map((tag, i) => (
                        <Bar key={tag} dataKey={tag} fill={TAG_COLORS[i % TAG_COLORS.length]} radius={[4, 4, 0, 0]} />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Sentiment trend sparkline: how Positive/Neutral/Negative have shifted over time */}
            <div className="panel-card p-5">
              <h2 className="font-semibold text-white text-sm mb-4">Sentiment trend</h2>
              {sentimentTrendData.length < 2 ? (
                <p className="text-gray-500 text-sm text-center py-12">
                  Not enough history yet to show a trend — check back after a few more days of feedback.
                </p>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={sentimentTrendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f2740" vertical={false} />
                    <XAxis dataKey="week" stroke="#6b7284" fontSize={11} />
                    <YAxis allowDecimals={false} stroke="#6b7284" fontSize={11} />
                    <Tooltip
                      contentStyle={{ background: '#0c1120', border: '1px solid #1f2740', borderRadius: 12 }}
                      labelStyle={{ color: '#e6e9f5' }}
                    />
                    <Legend wrapperStyle={{ fontSize: 11, color: '#cbd3ea' }} />
                    <Line type="monotone" dataKey="Positive" stroke={SENTIMENT_COLORS.Positive} strokeWidth={2} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="Neutral" stroke={SENTIMENT_COLORS.Neutral} strokeWidth={2} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="Negative" stroke={SENTIMENT_COLORS.Negative} strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Monthly sentiment comparison: this month vs last month, side by side */}
            <div className="panel-card p-5">
              <h2 className="font-semibold text-white text-sm mb-4">Monthly comparison</h2>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={monthlyComparison}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2740" vertical={false} />
                  <XAxis dataKey="sentiment" stroke="#6b7284" fontSize={11} />
                  <YAxis allowDecimals={false} stroke="#6b7284" fontSize={11} />
                  <Tooltip
                    contentStyle={{ background: '#0c1120', border: '1px solid #1f2740', borderRadius: 12 }}
                    labelStyle={{ color: '#e6e9f5' }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11, color: '#cbd3ea' }} />
                  <Bar dataKey="Last month" fill="#6b7284" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="This month" fill="#a78bfa" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Feedback table + sentiment donut */}
            <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-4">
              <div className="panel-card p-5">
                <h2 className="font-semibold text-white text-sm mb-3">Recent feedback</h2>
                <div className="flex flex-wrap items-end gap-2 mb-3">
                  <div>
                    <label className="block text-[11px] font-medium field-label mb-1">Sentiment</label>
                    <select value={sentimentFilter} onChange={(e) => setSentimentFilter(e.target.value)} className="input-field w-auto text-xs py-1.5">
                      <option value="">All sentiments</option>
                      <option value="Positive">Positive</option>
                      <option value="Neutral">Neutral</option>
                      <option value="Negative">Negative</option>
                    </select>
                  </div>
                  <div className="relative w-auto">
                    <label className="block text-[11px] font-medium field-label mb-1">Search</label>
                    <input
                      placeholder="Search feedback..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="input-field w-auto text-xs py-1.5 pr-8"
                    />
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className="absolute right-2.5 bottom-2 text-gray-500 pointer-events-none"
                    >
                      <circle cx="11" cy="11" r="7" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="m21 21-4.3-4.3" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium field-label mb-1">Urgency</label>
                    <select value={urgencyFilter} onChange={(e) => setUrgencyFilter(e.target.value)} className="input-field w-auto text-xs py-1.5">
                      <option value="">All urgencies</option>
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="critical">Critical</option>
                    </select>
                  </div>
                </div>
                <div className="flex justify-end mb-4">
                  <label className="flex items-center gap-2 text-xs field-label">
                    Min intensity
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={minIntensity}
                      onChange={(e) => setMinIntensity(Number(e.target.value))}
                      className="w-20 accent-accent"
                    />
                    <span className="text-gray-300 w-4">{minIntensity}</span>
                  </label>
                </div>

                {deleteError && <p className="text-red-400 text-xs mb-2">{deleteError}</p>}
                {visibleFeedback.length === 0 ? (
                  <p className="text-gray-500 text-sm text-center py-8">No feedback matches these filters.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-left text-gray-500 border-b border-base-border">
                          <th className="pb-2 pr-3 font-medium">Customer</th>
                          <th className="pb-2 pr-3 font-medium">Comment</th>
                          <th className="pb-2 pr-3 font-medium">Sentiment</th>
                          <th className="pb-2 pr-3 font-medium">Urgency</th>
                          <th className="pb-2 pr-3 font-medium">Date</th>
                          {canDelete && <th className="pb-2 font-medium"></th>}
                        </tr>
                      </thead>
                      <tbody>
                        {visibleFeedback.map((item) => (
                          <tr key={item._id} className="border-b border-base-border last:border-b-0">
                            <td className="py-2.5 pr-3 text-gray-300 whitespace-nowrap">{item.customerName || 'Anonymous'}</td>
                            <td className="py-2.5 pr-3 text-gray-400 max-w-xs truncate">{item.comment}</td>
                            <td className="py-2.5 pr-3">
                              <SentimentBadge sentiment={item.aiAnalysis?.sentiment} />
                            </td>
                            <td className="py-2.5 pr-3">
                              <UrgencyBadge urgency={item.aiAnalysis?.urgency} />
                            </td>
                            <td className="py-2.5 pr-3 text-gray-500 whitespace-nowrap">
                              {new Date(item.createdAt).toLocaleDateString()}
                            </td>
                            {canDelete && (
                              <td className="py-2.5 whitespace-nowrap">
                                {confirmingDeleteId === item._id ? (
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => handleDeleteFeedback(item._id)}
                                      disabled={deletingId === item._id}
                                      className="text-red-400 font-semibold hover:underline"
                                    >
                                      {deletingId === item._id ? '...' : 'Confirm'}
                                    </button>
                                    <button onClick={() => setConfirmingDeleteId('')} className="text-gray-500 hover:underline">
                                      Cancel
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => setConfirmingDeleteId(item._id)}
                                    title="Delete review"
                                    className="text-gray-500 hover:text-red-400"
                                  >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                      <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6h16z" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                  </button>
                                )}
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="panel-card p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-semibold text-white text-sm">Sentiment breakdown</h2>
                </div>
                {!summary?.breakdown?.length ? (
                  <p className="text-gray-500 text-sm text-center py-16">No feedback yet.</p>
                ) : (
                  <>
                    <div className="relative">
                      <ResponsiveContainer width="100%" height={200}>
                        <PieChart>
                          <Pie
                            data={summary.breakdown}
                            dataKey="count"
                            nameKey="sentiment"
                            innerRadius={55}
                            outerRadius={80}
                            paddingAngle={2}
                            isAnimationActive
                            animationDuration={800}
                            animationEasing="ease-out"
                          >
                            {summary.breakdown.map((entry) => (
                              <Cell key={entry.sentiment} fill={SENTIMENT_COLORS[entry.sentiment] || '#6b7284'} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{ background: '#0c1120', border: '1px solid #1f2740', borderRadius: 12 }}
                            labelStyle={{ color: '#e6e9f5' }}
                            formatter={(value, name, props) => [`${value} (${props.payload.percentage}%)`, name]}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <p className="text-2xl font-bold text-white">
                          <CountUp value={summary.totalFeedback} />
                        </p>
                        <p className="text-gray-500 text-[11px]">Total resp.</p>
                      </div>
                    </div>
                    <div className="space-y-1.5 mt-2">
                      {summary.breakdown.map((item, i) => (
                        <div
                          key={item.sentiment}
                          className="flex items-center justify-between text-xs fade-in-up"
                          style={{ animationDelay: `${i * 80}ms` }}
                        >
                          <span className="flex items-center gap-2 text-gray-300">
                            <span
                              className="w-2 h-2 rounded-full"
                              style={{ background: SENTIMENT_COLORS[item.sentiment] || '#6b7284' }}
                            />
                            {item.sentiment}
                          </span>
                          <span className="text-gray-500">
                            <CountUp value={item.percentage} suffix="%" />
                          </span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Top Fixes tracker + emotion cloud */}
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-4">
              <div className="panel-card p-5">
                <h2 className="font-semibold text-white text-sm mb-4">Top fixes</h2>
                {topTags.length === 0 ? (
                  <p className="text-gray-500 text-sm text-center py-8">No topics with tickets yet.</p>
                ) : (
                  <div className="space-y-2">
                    {topTags.map((t) => (
                      <div key={t._id} className="flex items-center justify-between gap-2 text-xs py-1.5 border-t border-base-border first:border-t-0 first:pt-0">
                        <span className="text-gray-300 min-w-0 truncate">
                          {t._id} <span className="text-gray-600">· {t.totalMentions} mentions</span>
                        </span>
                        <span className="flex items-center gap-1.5 text-gray-400 shrink-0">
                          <span className={`w-2 h-2 rounded-full ${t.ticketStatus.dotClass}`} />
                          {t.ticketStatus.label}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="panel-card p-5">
                <h2 className="font-semibold text-white text-sm mb-4">Customer emotion cloud</h2>
                {trends.length === 0 ? (
                  <p className="text-gray-500 text-sm text-center py-8">No topics extracted yet.</p>
                ) : (
                  <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 py-4">
                    {trends.map((t, i) => {
                      const counts = trends.map((x) => x.totalMentions);
                      const max = Math.max(...counts);
                      const min = Math.min(...counts);
                      const scale = max === min ? 1 : (t.totalMentions - min) / (max - min);
                      const fontSize = 9 + scale * 11;
                      return (
                        <span
                          key={t._id}
                          className="font-semibold"
                          style={{ fontSize: `${fontSize}px`, color: TAG_COLORS[i % TAG_COLORS.length] }}
                        >
                          {t._id}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Weekly report export */}
            <div className="panel-card px-5 py-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-semibold text-white text-sm">Weekly report</h2>
                <p className="text-gray-500 text-xs mt-0.5">Export the last 7 days of feedback.</p>
              </div>
              <div className="flex gap-2 shrink-0">
                <button onClick={handleExportCSV} disabled={exportingCsv} className="btn-outline text-xs py-1.5 px-3">
                  {exportingCsv ? 'Exporting...' : 'Export CSV'}
                </button>
                <button onClick={handleExportPDF} disabled={exportingPdf} className="btn-outline text-xs py-1.5 px-3">
                  {exportingPdf ? 'Exporting...' : 'Export PDF'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
