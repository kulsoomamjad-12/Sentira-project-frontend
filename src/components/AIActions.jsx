import React, { useState } from 'react';
import { translateFeedbackItem, draftFeedbackReply, sendFeedbackReply } from '../services/api';

// One-click AI assist actions for a single feedback item. Both calls are
// on-demand only (never run automatically), so they only cost an AI call
// when a staff member actually clicks the button.
export default function AIActions({ feedbackId, customerName, customerEmail }) {
  const [translation, setTranslation] = useState(null);
  const [translating, setTranslating] = useState(false);

  const [draft, setDraft] = useState('');
  const [drafting, setDrafting] = useState(false);
  const [copied, setCopied] = useState(false);

  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const [error, setError] = useState('');

  const handleTranslate = async () => {
    setError('');
    setTranslating(true);
    try {
      const res = await translateFeedbackItem(feedbackId);
      setTranslation(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Translation failed');
    } finally {
      setTranslating(false);
    }
  };

  const handleDraft = async () => {
    setError('');
    setSent(false);
    setDrafting(true);
    try {
      const res = await draftFeedbackReply(feedbackId);
      setDraft(res.data.draft);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to draft a reply');
    } finally {
      setDrafting(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(draft);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleSend = async () => {
    setError('');
    setSending(true);
    try {
      await sendFeedbackReply(feedbackId, draft);
      setSent(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send reply');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <button onClick={handleTranslate} disabled={translating} className="btn-outline text-xs py-1.5 px-3">
          {translating ? 'Translating...' : 'Translate'}
        </button>
        <button onClick={handleDraft} disabled={drafting} className="btn-outline text-xs py-1.5 px-3">
          {drafting ? 'Drafting...' : '✨ Draft AI reply'}
        </button>
      </div>

      {error && <p className="text-red-400 text-xs">{error}</p>}

      {translation && (
        <div className="rounded-xl border border-base-border bg-white/5 p-3">
          <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Translation</p>
          <p className="text-xs text-gray-300 leading-relaxed">
            {translation.translated ? translation.translation : (
              <>
                <span className="text-gray-500">{translation.note} </span>
                {translation.translation}
              </>
            )}
          </p>
        </div>
      )}

      {draft && (
        <div className="rounded-xl border border-accent/25 bg-accent/[0.06] p-3.5">
          <div className="flex items-center gap-1.5 mb-2">
            <span className="text-sm">✨</span>
            <p className="text-[11px] font-semibold text-accent-light uppercase tracking-wide">AI-drafted reply</p>
          </div>
          <textarea
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              setSent(false);
            }}
            rows={6}
            className="input-field text-sm leading-relaxed mb-3 resize-y"
          />
          <div className="flex flex-wrap items-center gap-2">
            {customerEmail ? (
              <button onClick={handleSend} disabled={sending} className="btn-primary text-xs py-1.5 px-4">
                {sending ? 'Sending...' : sent ? '✓ Sent' : `Send to ${customerName || customerEmail}`}
              </button>
            ) : (
              <span className="text-[11px] text-gray-500 italic">No email on file — can't send directly</span>
            )}
            <button onClick={handleCopy} className="btn-outline text-xs py-1.5 px-4">
              {copied ? 'Copied!' : 'Copy reply'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
