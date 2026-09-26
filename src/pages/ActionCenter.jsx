import React, { useEffect, useState } from 'react';
import { getFeedback, getTickets, getTeam, getForms, deleteFeedbackItem } from '../services/api';
import TopNav from '../components/TopNav';
import FeedbackCard from '../components/FeedbackCard';
import TicketControls from '../components/TicketControls';
import AIActions from '../components/AIActions';
import { LoadingState } from '../components/Spinner';

const SENTIMENTS = ['Positive', 'Neutral', 'Negative'];
const URGENCIES = ['low', 'medium', 'high', 'critical'];
const URGENCY_RANK = { critical: 4, high: 3, medium: 2, low: 1 };

export default function ActionCenter() {
  const currentUser = JSON.parse(localStorage.getItem('user') || 'null');
  const canDelete = currentUser?.role === 'admin';

  const [feedback, setFeedback] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [forms, setForms] = useState([]);
  const [selectedFormId, setSelectedFormId] = useState('');
  const [loading, setLoading] = useState(true);
  const [sentiment, setSentiment] = useState('');
  const [urgency, setUrgency] = useState('');
  const [search, setSearch] = useState('');
  const [minIntensity, setMinIntensity] = useState(1);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState('');
  const [deletingId, setDeletingId] = useState('');
  const [deleteError, setDeleteError] = useState('');
  // Tracks the urgent count at the moment the banner was dismissed, so it
  // stays hidden until a *new* urgent review pushes the count past that —
  // dismissing doesn't just hide it forever and risk missing something new.
  const [dismissedAtCount, setDismissedAtCount] = useState(0);

  const loadFeedback = () => {
    setLoading(true);
    // "urgent" is a client-side combo of high+critical, not a backend value
    getFeedback({
      sentiment: sentiment || undefined,
      urgency: urgency !== 'urgent' ? urgency || undefined : undefined,
      formId: selectedFormId || undefined,
    })
      .then((res) => setFeedback(res.data.feedback))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadFeedback();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sentiment, urgency, selectedFormId]);

  useEffect(() => {
    getTickets().then((res) => setTickets(res.data.tickets));
    getTeam().then((res) => setTeamMembers(res.data.team));
    getForms().then((res) => setForms(res.data.forms));
  }, []);

  const ticketByFeedbackId = Object.fromEntries(
    tickets.map((t) => [t.feedback?._id || t.feedback, t])
  );

  // A review counts as "needs action" if the AI flagged it high/critical
  // urgency and it hasn't been resolved yet — this is what the urgent
  // banner and quick filter surface for admins.
  const needsAction = (item) => {
    const isUrgent = ['high', 'critical'].includes(item.aiAnalysis?.urgency);
    const ticket = ticketByFeedbackId[item._id];
    return isUrgent && ticket?.status !== 'resolved';
  };
  const urgentCount = feedback.filter(needsAction).length;
  const showUrgentBanner = urgentCount > 0 && urgentCount > dismissedAtCount;

  const handleTicketChange = (ticket) => {
    setTickets((prev) => {
      const exists = prev.some((t) => t._id === ticket._id);
      return exists ? prev.map((t) => (t._id === ticket._id ? ticket : t)) : [ticket, ...prev];
    });
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

  const visibleFeedback = feedback
    .filter((f) => (f.aiAnalysis?.intensity ?? 0) >= minIntensity)
    .filter((f) => urgency !== 'urgent' || ['high', 'critical'].includes(f.aiAnalysis?.urgency))
    .filter((f) => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return f.comment.toLowerCase().includes(q) || (f.customerName || '').toLowerCase().includes(q);
    })
    // Urgent reviews always bubble to the top, regardless of the active
    // filter, so nothing that needs fixing gets buried under older items.
    .sort((a, b) => {
      const rankDiff = (URGENCY_RANK[b.aiAnalysis?.urgency] || 0) - (URGENCY_RANK[a.aiAnalysis?.urgency] || 0);
      if (rankDiff !== 0) return rankDiff;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

  return (
    <div className="space-background-2 relative min-h-screen overflow-hidden pb-20">
      <div className="glow-orb w-[600px] h-[600px] -top-64 left-1/2 -translate-x-1/2" />

      <div className="relative z-10 pt-20">
        <TopNav />

        <div className="text-center max-w-2xl mx-auto mt-16 mb-12 px-4">
          <h1 className="text-3xl sm:text-4xl font-semibold text-white mb-2">
            Turn feedback into <span className="accent-italic text-accent-light">resolved issues</span>
          </h1>
          <p className="text-gray-400 text-sm">
            Open a ticket on anything that needs follow-up and track it through to resolution.
          </p>
        </div>

        {forms.length > 0 && (
          <div className="max-w-3xl mx-auto px-4 mb-4 flex justify-end">
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

        <div className="max-w-3xl mx-auto px-4">
          {showUrgentBanner && (
            <div
              className="w-full flex items-center gap-3 mb-6 p-4 rounded-lg"
              style={{
                background: 'rgba(239, 68, 68, 0.08)',
                border: urgency === 'urgent' ? '1px solid rgba(239, 68, 68, 0.6)' : '1px solid rgba(239, 68, 68, 0.3)',
              }}
            >
              <button
                onClick={() => setUrgency(urgency === 'urgent' ? '' : 'urgent')}
                className="flex-1 flex items-center gap-3 text-left"
              >
                <span className="relative flex h-3 w-3 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
                </span>
                <span className="flex-1">
                  <span className="text-sm font-semibold text-red-300">
                    🚨 {urgentCount} urgent review{urgentCount === 1 ? '' : 's'} need{urgentCount === 1 ? 's' : ''} fixing
                  </span>
                  <span className="block text-xs text-red-400/80 mt-0.5">
                    Flagged high/critical by AI — {urgency === 'urgent' ? 'showing urgent only, click to clear' : 'click to review them first'}
                  </span>
                </span>
              </button>
              <button
                onClick={() => setDismissedAtCount(urgentCount)}
                title="Dismiss"
                aria-label="Dismiss urgent reviews banner"
                className="shrink-0 text-red-400/70 hover:text-red-300 p-1"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          )}

          <div className="mb-6">
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label className="block text-xs font-medium field-label mb-1">Sentiment</label>
                <select value={sentiment} onChange={(e) => setSentiment(e.target.value)} className="input-field w-auto">
                  <option value="">All sentiments</option>
                  {SENTIMENTS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div className="relative w-auto">
                <label className="block text-xs font-medium field-label mb-1">Search</label>
                <input
                  placeholder="Search feedback..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="input-field w-auto pr-9"
                />
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="absolute right-3 bottom-2.5 text-gray-500 pointer-events-none"
                >
                  <circle cx="11" cy="11" r="7" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="m21 21-4.3-4.3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div>
                <label className="block text-xs font-medium field-label mb-1">Urgency</label>
                <select value={urgency} onChange={(e) => setUrgency(e.target.value)} className="input-field w-auto">
                  <option value="">All urgencies</option>
                  <option value="urgent">🚨 Urgent (high + critical)</option>
                  {URGENCIES.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex justify-end mt-3">
              <label className="flex items-center gap-2 text-xs field-label">
                Min intensity
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={minIntensity}
                  onChange={(e) => setMinIntensity(Number(e.target.value))}
                  className="w-24 accent-accent"
                />
                <span className="text-gray-300 w-4">{minIntensity}</span>
              </label>
            </div>
          </div>

          {loading ? (
            <LoadingState label="Loading feedback..." className="py-10" />
          ) : visibleFeedback.length === 0 ? (
            <div className="panel-card p-6 text-center">
              <p className="text-gray-400 text-sm">No feedback matches these filters.</p>
            </div>
          ) : (
            visibleFeedback.map((item) => {
              const isUrgent = needsAction(item);
              const isFlagged = isUrgent || item.aiAnalysis?.sentiment === 'Negative';
              return (
                <div
                  key={item._id}
                  className={isFlagged ? 'border-l-4 border-red-500/40 rounded-l-lg' : ''}
                >
                  <FeedbackCard
                    feedback={item}
                    urgentNote={isUrgent ? `Needs fixing — flagged ${item.aiAnalysis.urgency} urgency` : null}
                  >
                    <TicketControls
                      feedbackId={item._id}
                      ticket={ticketByFeedbackId[item._id]}
                      onChange={handleTicketChange}
                      teamMembers={teamMembers}
                    />
                    <div className="mt-3 pt-3 border-t border-base-border">
                      <AIActions feedbackId={item._id} customerName={item.customerName} customerEmail={item.customerEmail} />
                    </div>

                    {canDelete && (
                      <div className="mt-3 pt-3 border-t border-base-border">
                        {confirmingDeleteId === item._id ? (
                          <div className="p-3 rounded-lg" style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                            <p className="text-xs text-red-300 mb-2">Permanently delete this review? This cannot be undone.</p>
                            {deleteError && <p className="text-red-400 text-xs mb-2">{deleteError}</p>}
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleDeleteFeedback(item._id)}
                                disabled={deletingId === item._id}
                                className="text-xs font-semibold text-white bg-red-500 rounded-lg py-1.5 px-4 hover:bg-red-600"
                              >
                                {deletingId === item._id ? 'Deleting...' : 'Delete permanently'}
                              </button>
                              <button
                                onClick={() => {
                                  setConfirmingDeleteId('');
                                  setDeleteError('');
                                }}
                                className="btn-outline text-xs py-1.5 px-4"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmingDeleteId(item._id)}
                            className="text-xs font-medium text-red-400 hover:underline"
                          >
                            Delete review
                          </button>
                        )}
                      </div>
                    )}
                  </FeedbackCard>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
