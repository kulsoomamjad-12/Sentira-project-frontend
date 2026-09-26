import React, { useEffect, useRef, useState } from 'react';
import { getFeedback, getTickets, getTopicTrends, getAnalyticsSummary } from '../services/api';
import { buildPulseMessage } from '../utils/pulse';

const MAX_NOTIFICATIONS = 20;

// Polls for new feedback/tickets instead of a Socket.IO push — the backend
// runs on Vercel's serverless functions, which can't hold a live WebSocket
// connection open between requests. 20s keeps this feeling close to
// real-time without hammering the API. One accepted trade-off vs. real
// push: there's no cheap way from polling alone to know WHO made a change,
// so unlike the old socket rooms (which excluded the acting user), you can
// occasionally see a notification for your own edit.
const POLL_INTERVAL_MS = 20000;

function describeFeedback(item) {
  const who = item.customerName || 'a customer';
  const snippet = (item.aiAnalysis?.summary || item.comment || '').slice(0, 80);
  if (item.aiAnalysis?.urgency === 'critical') return `⚠️ Critical review from ${who}: "${snippet}"`;
  if (item.aiAnalysis?.urgency === 'high') return `🚨 Urgent review from ${who} needs fixing: "${snippet}"`;
  if (item.aiAnalysis?.sentiment === 'Negative') return `🔴 Negative review from ${who}: "${snippet}"`;
  return `New review from ${who}: "${snippet}"`;
}

function describeTicketCreated(ticket) {
  return `New ticket opened on: "${(ticket.feedback?.comment || '').slice(0, 60)}"`;
}

function describeTicketUpdated(ticket) {
  const snippet = (ticket.feedback?.comment || '').slice(0, 60);
  const note = ticket.resolutionNotes ? ` — note: "${ticket.resolutionNotes.slice(0, 80)}"` : '';
  if (ticket.status === 'resolved') return `✅ Ticket resolved on: "${snippet}"${note}`;
  if (ticket.status === 'in-progress') return `👀 Ticket picked up on: "${snippet}"${note}`;
  return `🔄 Ticket moved to "${ticket.status}" — "${snippet}"${note}`;
}

export default function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);
  const [pulse, setPulse] = useState(null);

  // null until the first poll establishes a baseline — nothing that already
  // existed before this bell mounted should generate a notification.
  const seenFeedbackIds = useRef(null);
  const seenTicketUpdatedAt = useRef(null);

  // The same one-sentence insight that used to live in a Dashboard banner —
  // shown here instead, refreshed on mount and whenever new feedback shows up.
  const refreshPulse = () => {
    Promise.all([getFeedback(), getTopicTrends(), getAnalyticsSummary()])
      .then(([feedbackRes, trendsRes, summaryRes]) => {
        setPulse(buildPulseMessage(feedbackRes.data.feedback, trendsRes.data.trends, summaryRes.data));
      })
      .catch(() => {});
  };

  const pushNotification = (type, id, message) => {
    setNotifications((prev) =>
      [{ id: `${type}-${id}-${Date.now()}`, type, message, createdAt: new Date(), read: false }, ...prev].slice(
        0,
        MAX_NOTIFICATIONS
      )
    );
  };

  useEffect(() => {
    let cancelled = false;

    const poll = async () => {
      try {
        const [feedbackRes, ticketsRes] = await Promise.all([getFeedback(), getTickets()]);
        if (cancelled) return;
        const feedback = feedbackRes.data.feedback;
        const tickets = ticketsRes.data.tickets;

        if (seenFeedbackIds.current === null) {
          // First poll: record what already exists, silently — no
          // notifications for anything that isn't actually new.
          seenFeedbackIds.current = new Set(feedback.map((f) => f._id));
          seenTicketUpdatedAt.current = new Map(tickets.map((t) => [t._id, t.updatedAt]));
          return;
        }

        let sawNewFeedback = false;
        for (const item of feedback) {
          if (!seenFeedbackIds.current.has(item._id)) {
            seenFeedbackIds.current.add(item._id);
            pushNotification('new-feedback', item._id, describeFeedback(item));
            sawNewFeedback = true;
          }
        }

        for (const ticket of tickets) {
          const lastSeen = seenTicketUpdatedAt.current.get(ticket._id);
          if (lastSeen === undefined) {
            pushNotification('ticket-created', ticket._id, describeTicketCreated(ticket));
          } else if (lastSeen !== ticket.updatedAt) {
            pushNotification('ticket-updated', `${ticket._id}-${ticket.updatedAt}`, describeTicketUpdated(ticket));
          }
          seenTicketUpdatedAt.current.set(ticket._id, ticket.updatedAt);
        }

        if (sawNewFeedback) refreshPulse();
      } catch {
        // A poll failing (brief network blip) just tries again next tick.
      }
    };

    refreshPulse();
    poll();
    const interval = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleToggle = () => {
    setOpen((prev) => !prev);
    if (!open) {
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    }
  };

  return (
    <div className="relative">
      <button
        onClick={handleToggle}
        className="relative w-8 h-8 flex items-center justify-center rounded-full bg-white/5 border border-base-border hover:bg-white/10"
        aria-label="Notifications"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 w-2.5 h-2.5 rounded-full bg-red-500" />
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto panel-card p-3 z-30">
          {pulse && (
            <div className="flex items-start gap-2 px-1 pb-2 mb-2 border-b border-base-border">
              <span className="text-sm shrink-0">{pulse.icon}</span>
              <p className="text-xs text-gray-300">{pulse.text}</p>
            </div>
          )}
          <p className="text-xs font-semibold text-gray-400 mb-2 px-1">Notifications</p>
          {notifications.length === 0 ? (
            <p className="text-xs text-gray-500 px-1 py-3 text-center">Nothing yet — new activity appears here.</p>
          ) : (
            notifications.map((n) => (
              <div key={n.id} className="px-2 py-2 rounded-lg hover:bg-white/5 text-xs">
                <p className="text-gray-200">{n.message}</p>
                <p className="text-gray-500 mt-0.5">{n.createdAt.toLocaleTimeString()}</p>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
