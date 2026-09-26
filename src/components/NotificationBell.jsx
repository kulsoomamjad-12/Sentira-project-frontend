import React, { useEffect, useState } from 'react';
import { getSocket } from '../services/socket';
import { getFeedback, getTopicTrends, getAnalyticsSummary } from '../services/api';
import { buildPulseMessage } from '../utils/pulse';

const MAX_NOTIFICATIONS = 20;

function describe(type, payload) {
  if (type === 'new-feedback') {
    const who = payload.customerName || 'a customer';
    const snippet = (payload.summary || payload.comment || '').slice(0, 80);
    if (payload.urgency === 'critical') return `⚠️ Critical review from ${who}: "${snippet}"`;
    if (payload.urgency === 'high') return `🚨 Urgent review from ${who} needs fixing: "${snippet}"`;
    if (payload.sentiment === 'Negative') return `🔴 Negative review from ${who}: "${snippet}"`;
    return `New review from ${who}: "${snippet}"`;
  }
  if (type === 'ticket-created') {
    return `New ticket opened on: "${(payload.feedback?.comment || '').slice(0, 60)}"`;
  }
  if (type === 'ticket-updated') {
    const { ticket, updatedBy, previousStatus } = payload;
    const who = updatedBy?.name || 'A teammate';
    const snippet = (ticket.feedback?.comment || '').slice(0, 60);
    const note = ticket.resolutionNotes ? ` — note: "${ticket.resolutionNotes.slice(0, 80)}"` : '';

    if (ticket.status === 'resolved') {
      return `✅ ${who} resolved the ticket on: "${snippet}"${note}`;
    }
    if (ticket.status === 'in-progress' && previousStatus === 'open') {
      return `👀 ${who} has seen the ticket and started working on: "${snippet}"${note}`;
    }
    if (ticket.status === previousStatus) {
      return `📝 ${who} left a note on the ticket for: "${snippet}"${note}`;
    }
    return `🔄 ${who} moved the ticket to "${ticket.status}" — "${snippet}"${note}`;
  }
  return 'New activity';
}

export default function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);
  const [pulse, setPulse] = useState(null);

  // The same one-sentence insight that used to live in a Dashboard banner —
  // now shown here instead. Refreshed on mount and whenever a new review
  // comes in, so it stays current without needing the Dashboard open.
  const refreshPulse = () => {
    Promise.all([getFeedback(), getTopicTrends(), getAnalyticsSummary()])
      .then(([feedbackRes, trendsRes, summaryRes]) => {
        setPulse(buildPulseMessage(feedbackRes.data.feedback, trendsRes.data.trends, summaryRes.data));
      })
      .catch(() => {});
  };

  useEffect(() => {
    refreshPulse();

    const socket = getSocket();

    // `id` is the notification-list key, computed differently per event
    // shape (a bare ticket for ticket-created, {ticket, updatedBy,...} for
    // ticket-updated) — kept separate from `payload` so describe() still
    // gets the raw shape it expects.
    const pushNotification = (type, id, payload) => {
      setNotifications((prev) => [
        {
          id: `${type}-${id}-${Date.now()}`,
          type,
          message: describe(type, payload),
          createdAt: new Date(),
          read: false,
        },
        ...prev,
      ].slice(0, MAX_NOTIFICATIONS));
    };

    const onNewFeedback = (payload) => {
      pushNotification('new-feedback', payload.id || payload._id, payload);
      refreshPulse();
    };
    const onTicketCreated = (payload) => pushNotification('ticket-created', payload._id, payload);
    const onTicketUpdated = (payload) => pushNotification('ticket-updated', payload.ticket._id, payload);

    socket.on('new-feedback', onNewFeedback);
    socket.on('ticket-created', onTicketCreated);
    socket.on('ticket-updated', onTicketUpdated);

    return () => {
      socket.off('new-feedback', onNewFeedback);
      socket.off('ticket-created', onTicketCreated);
      socket.off('ticket-updated', onTicketUpdated);
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
            <p className="text-xs text-gray-500 px-1 py-3 text-center">Nothing yet — alerts appear here live.</p>
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
