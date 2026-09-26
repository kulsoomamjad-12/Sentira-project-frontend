import React from 'react';

// Small reusable badge that colors itself based on the AI's sentiment output
export default function SentimentBadge({ sentiment }) {
  const classMap = {
    Positive: 'sentiment-positive',
    Neutral: 'sentiment-neutral',
    Negative: 'sentiment-negative',
  };

  const className = classMap[sentiment] || 'sentiment-neutral';

  return <span className={`sentiment-badge ${className}`}>{sentiment || 'Unclassified'}</span>;
}
