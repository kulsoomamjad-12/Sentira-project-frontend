import React from 'react';
import SentimentBadge from './SentimentBadge';
import UrgencyBadge from './UrgencyBadge';

// Displays one feedback submission with its full AI analysis breakdown.
// Accepts optional children (e.g. ticket controls) rendered below the footer.
// `urgentNote`, when given, renders as a red callout inside the card, above
// the customer name — e.g. "Needs fixing — flagged critical urgency".
export default function FeedbackCard({ feedback, children, urgentNote }) {
  const { customerName, customerEmail, comment, rating, aiAnalysis, createdAt, source, sourceUrl } = feedback;

  return (
    <div className="panel-card p-5 mb-3">
      {urgentNote && (
        <div
          className="text-xs font-semibold text-red-300 px-4 py-2 mb-3 rounded-lg"
          style={{ background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.3)' }}
        >
          🚨 {urgentNote}
        </div>
      )}
      <div className="flex flex-wrap justify-between items-start gap-2 mb-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-white text-sm break-words">{customerName || 'Anonymous'}</p>
            {source === 'external' && (
              <span className="badge-chip text-[10px] py-0.5 px-2">
                {sourceUrl ? (
                  <a href={sourceUrl} target="_blank" rel="noreferrer" className="hover:underline">
                    External
                  </a>
                ) : (
                  'External'
                )}
              </span>
            )}
          </div>
          {customerEmail && <p className="text-xs text-gray-500">{customerEmail}</p>}
        </div>
        <div className="flex gap-2">
          <SentimentBadge sentiment={aiAnalysis?.sentiment} />
          <UrgencyBadge urgency={aiAnalysis?.urgency} />
        </div>
      </div>

      <p className="text-gray-300 text-sm mb-3">{comment}</p>

      {aiAnalysis?.summary && (
        <p className="text-sm italic accent-italic text-accent-light mb-3">"{aiAnalysis.summary}"</p>
      )}

      <div className="flex flex-wrap gap-2 mb-3">
        {aiAnalysis?.tags?.map((tag) => (
          <span key={tag} className="badge-chip">
            #{tag}
          </span>
        ))}
      </div>

      <div className="flex flex-wrap justify-between gap-x-3 gap-y-1 text-xs text-gray-500 border-t border-base-border pt-3">
        <span>
          Emotion: {aiAnalysis?.emotion || 'n/a'} · Intensity: {aiAnalysis?.intensity ?? 'n/a'}/10
          {rating != null && ` · Rating: ${rating}`}
        </span>
        <span className="whitespace-nowrap">{new Date(createdAt).toLocaleDateString()}</span>
      </div>

      {children && <div className="mt-3 pt-3 border-t border-base-border">{children}</div>}
    </div>
  );
}
