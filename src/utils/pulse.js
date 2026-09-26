const URGENCY_RANK = { critical: 4, high: 3, medium: 2, low: 1 };

// One real, data-derived headline sentence — never a fabricated statistic.
// Falls back down a priority list depending on how much data actually exists.
// Shared between the Dashboard (originally) and the NotificationBell, which
// now shows this same sentence in its dropdown instead of the page.
export function buildPulseMessage(feedback, trends, summary) {
  if (!feedback.length) {
    return { icon: '👋', text: 'No feedback yet — share your form link to start collecting responses.' };
  }

  const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
  const recentUrgent = feedback
    .filter((f) => ['critical', 'high'].includes(f.aiAnalysis?.urgency) && new Date(f.createdAt).getTime() >= oneDayAgo)
    .sort((a, b) => (URGENCY_RANK[b.aiAnalysis?.urgency] || 0) - (URGENCY_RANK[a.aiAnalysis?.urgency] || 0)
      || new Date(b.createdAt) - new Date(a.createdAt))[0];

  if (recentUrgent) {
    const label = recentUrgent.aiAnalysis.urgency === 'critical' ? 'Critical alert' : 'Urgent — needs fixing';
    return {
      icon: recentUrgent.aiAnalysis.urgency === 'critical' ? '⚠️' : '🚨',
      text: `${label}: "${recentUrgent.aiAnalysis.summary || recentUrgent.comment}"`,
    };
  }

  const topTag = trends[0];
  if (topTag?.weeklyCounts?.length >= 2) {
    const counts = topTag.weeklyCounts;
    const current = counts[counts.length - 1].count;
    const previous = counts[counts.length - 2].count;
    if (previous > 0) {
      const pct = Math.round(((current - previous) / previous) * 100);
      if (pct !== 0) {
        return {
          icon: pct > 0 ? '📈' : '📉',
          text: `"${topTag._id}" mentions are ${pct > 0 ? 'up' : 'down'} ${Math.abs(pct)}% vs last week.`,
        };
      }
    }
  }

  const positivePct = summary?.breakdown?.find((b) => b.sentiment === 'Positive')?.percentage;
  if (positivePct != null) {
    return { icon: '✅', text: `No critical issues right now — ${positivePct}% of recent feedback is positive.` };
  }

  return { icon: 'ℹ️', text: 'Feedback is coming in — check back soon for trends.' };
}
