import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getPublicForm, submitFeedback } from '../services/api';
import { CustomField } from '../components/CustomFormFields';
import { LoadingState } from '../components/Spinner';

// Defined outside the page component so its identity stays stable across
// re-renders — defining it inline inside the component body recreated a new
// function (and therefore a new component type) on every keystroke, which
// made React remount the whole subtree and drop focus from any input.
function Shell({ children }) {
  return (
    <div className="space-background-2 relative min-h-screen flex items-center justify-center overflow-hidden px-4 py-12">
      <div className="glow-orb w-[450px] h-[450px] -top-32 -left-32" />
      <div className="glow-orb w-[350px] h-[350px] -bottom-32 -right-24" />
      <div className="relative z-10 w-full max-w-md">{children}</div>
    </div>
  );
}

// The page a customer lands on via the shareable public link
export default function PublicFeedbackForm() {
  const { slug } = useParams();
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [responses, setResponses] = useState({});

  useEffect(() => {
    getPublicForm(slug)
      .then((res) => setForm(res.data.form))
      .catch(() => setError('This feedback form could not be found.'))
      .finally(() => setLoading(false));
  }, [slug]);

  const setResponse = (fieldId, value) => setResponses((r) => ({ ...r, [fieldId]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await submitFeedback(slug, { customerName, customerEmail, rating, comment, responses });
      setSubmitted(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong submitting your feedback.');
    }
  };

  if (loading) return <Shell><LoadingState label="Loading form..." /></Shell>;
  if (error && !form) return <Shell><p className="text-center text-red-400">{error}</p></Shell>;

  if (submitted) {
    return (
      <Shell>
        <div className="panel-card p-8 text-center shadow-card">
          <div className="icon-circle mx-auto mb-4">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M4 12l6 6L20 6" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-white">Thank you!</h2>
          <p className="text-gray-400 mt-2 text-sm">Your feedback has been received.</p>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="panel-card p-8 shadow-card">
        <span className="badge-chip mb-4">Feedback form</span>
        <h1 className="text-2xl font-semibold text-white mb-1">{form.title}</h1>
        {form.description && <p className="text-gray-400 text-sm mb-6">{form.description}</p>}

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {form.collectName !== false && (
            <div>
              <label className="block text-sm field-label mb-2">
                Your name
                {form.nameRequired && <span className="text-red-400"> *</span>}
              </label>
              <input
                type="text"
                placeholder={form.nameRequired ? 'Your name' : 'Your name (optional)'}
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                required={form.nameRequired}
                className="input-field"
              />
            </div>
          )}
          {form.collectEmail !== false && (
            <div>
              <label className="block text-sm field-label mb-2">
                Your email
                {form.emailRequired && <span className="text-red-400"> *</span>}
              </label>
              <input
                type="email"
                placeholder={form.emailRequired ? 'Your email' : 'Your email (optional)'}
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                required={form.emailRequired}
                className="input-field"
              />
            </div>
          )}
          <div>
            <label className="block text-sm field-label mb-2">
              {form.ratingLabel || 'How would you rate your experience?'}:{' '}
              <span className="text-accent-light font-semibold">{rating}</span> / {form.ratingType === 'nps' ? 10 : 5}
            </label>
            <input
              type="range"
              min="0"
              max={form.ratingType === 'nps' ? 10 : 5}
              value={rating}
              onChange={(e) => setRating(Number(e.target.value))}
              className="w-full accent-accent"
            />
          </div>
          <div>
            <label className="block text-sm field-label mb-2">{form.commentLabel || 'Your feedback'}</label>
            <textarea
              placeholder="Tell us about your experience..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              required
              rows={4}
              className="input-field"
            />
          </div>

          {(form.fields || []).map((field) => (
            <CustomField
              key={field.id}
              field={field}
              value={responses[field.id]}
              onChange={(value) => setResponse(field.id, value)}
            />
          ))}

          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button type="submit" className="btn-primary w-full">
            Submit feedback
          </button>
        </form>
      </div>
    </Shell>
  );
}
