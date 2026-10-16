import React from 'react';

const URGENCY_STYLES = {
  low: 'bg-white/5 text-gray-300 border border-base-border',
  high: 'bg-orange-400/10 text-orange-300 border border-orange-400/20',
  critical: 'bg-red-500/10 text-red-300 border border-red-500/30 font-bold',
};

// Highlights how urgently a piece of feedback needs attention
export default function UrgencyBadge({ urgency }) {
  // 'medium' was removed — any older value still lying around shows as 'high'
  const level = urgency === 'medium' ? 'high' : URGENCY_STYLES[urgency] ? urgency : 'low';
  const style = URGENCY_STYLES[level];

  return (
    <span className={`inline-block px-3 py-1 rounded-full text-xs uppercase tracking-wide ${style}`}>
      {level}
    </span>
  );
}
