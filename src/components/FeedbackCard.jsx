import React, { useState } from 'react';
import SentimentBadge from './SentimentBadge';
import UrgencyBadge from './UrgencyBadge';

// Formats a custom-question answer for display (checkboxes are arrays,
// dates are stored as YYYY-MM-DD strings).
const formatAnswer = (response) => {
  const { type, value } = response;
  if (Array.isArray(value)) return value.join(', ');
  if (type === 'date' && value) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString();
  }
  return value == null || value === '' ? '' : String(value);
};

// Every question the customer was asked, in the same order the public form
// shows them (rating, comment, then the admin's custom questions), paired
// with their answer. Only form submissions have questions — external and
// social-imported reviews just have the comment.
const buildQuestionAnswers = (feedback) => {
  const { form, rating, ratingType, comment, responses } = feedback;
  const scaleMax = (ratingType || form?.ratingType) === 'nps' ? 10 : 5;
  const rows = [];

  if (rating != null) {
    rows.push({ question: form?.ratingLabel || 'How would you rate your experience?', answer: `${rating} / ${scaleMax}` });
  }
  rows.push({ question: form?.commentLabel || 'Your feedback', answer: comment });
  for (const response of responses || []) {
    rows.push({ question: response.label || 'Question', answer: formatAnswer(response) });
  }
  return rows;
};

// Displays one feedback submission with its full AI analysis breakdown.
// Accepts optional children (e.g. ticket controls) rendered below the footer.
// `urgentNote`, when given, renders as a red callout inside the card, above
// the customer name — e.g. "Needs fixing — flagged critical urgency".
export default function FeedbackCard({ feedback, children, urgentNote }) {
  const { customerName, customerEmail, comment, rating, aiAnalysis, createdAt, source, sourceUrl, form } = feedback;
  const isFormSubmission = (source || 'form') === 'form';
  const questionAnswers = isFormSubmission ? buildQuestionAnswers(feedback) : [];
  // Collapsed by default — the card shows just the comment until the owner
  // clicks to expand the full list of questions and answers.
  const [showAllAnswers, setShowAllAnswers] = useState(false);

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

      {isFormSubmission && (
        <button
          type="button"
          onClick={() => setShowAllAnswers((open) => !open)}
          aria-expanded={showAllAnswers}
          className="btn-outline text-xs py-1.5 px-3 mb-3 inline-flex items-center gap-1.5"
        >
          {showAllAnswers ? 'Hide questions & answers' : `View all questions & answers (${questionAnswers.length})`}
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className={`transition-transform ${showAllAnswers ? 'rotate-180' : ''}`}
          >
            <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      )}

      {isFormSubmission && showAllAnswers && (
        <div className="mb-3 rounded-lg border border-base-border p-4" style={{ background: 'rgba(255, 255, 255, 0.02)' }}>
          <p className="text-[11px] uppercase tracking-wide text-gray-500 mb-3">
            Form responses{form?.title ? ` · ${form.title}` : ''}
          </p>
          <dl className="space-y-3">
            {questionAnswers.map((row, i) => (
              <div key={i}>
                <dt className="text-xs font-medium field-label">{row.question}</dt>
                <dd className={`text-sm mt-0.5 break-words whitespace-pre-wrap ${row.answer ? 'text-gray-300' : 'text-gray-500 italic'}`}>
                  {row.answer || 'No answer'}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      )}

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
