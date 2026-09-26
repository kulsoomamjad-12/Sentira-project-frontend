import React, { useEffect, useState } from 'react';
import { createForm, updateForm, getForms, deleteForm } from '../services/api';
import TopNav from '../components/TopNav';
import { LoadingState } from '../components/Spinner';

const FIELD_TYPES = [
  { value: 'short_text', label: 'Short answer' },
  { value: 'paragraph', label: 'Paragraph' },
  { value: 'multiple_choice', label: 'Multiple choice' },
  { value: 'checkboxes', label: 'Checkboxes' },
  { value: 'dropdown', label: 'Dropdown' },
  { value: 'date', label: 'Date' },
];

const CHOICE_TYPES = ['multiple_choice', 'checkboxes', 'dropdown'];

const genId = () =>
  window.crypto?.randomUUID ? window.crypto.randomUUID() : Math.random().toString(36).slice(2);

const emptyForm = () => ({
  title: '',
  description: '',
  ratingType: 'stars',
  ratingLabel: 'How would you rate your experience?',
  commentLabel: 'Tell us more about your experience',
  collectName: true,
  collectEmail: true,
  nameRequired: false,
  emailRequired: false,
  fields: [],
});

// One customizable question card in the builder — mirrors the Google Forms
// "question" editor: label, type, options, required. Every question type
// gets its own options editor: for Multiple choice/Checkboxes/Dropdown
// they're the actual answer choices (2+ required); for the free-text types
// they're optional quick-select suggestions the respondent can still type
// over.
function FieldCard({ field, index, total, onChange, onRemove, onMove }) {
  const isChoice = CHOICE_TYPES.includes(field.type);

  const updateOption = (i, value) => {
    const options = [...field.options];
    options[i] = value;
    onChange({ ...field, options });
  };
  const addOption = () => onChange({ ...field, options: [...field.options, ''] });
  const removeOption = (i) => onChange({ ...field, options: field.options.filter((_, idx) => idx !== i) });

  return (
    <div className="panel-card p-4 mb-3" style={{ background: 'rgba(255,255,255,0.03)' }}>
      <div className="flex items-start gap-2">
        <div className="flex flex-col gap-1 pt-1">
          <button
            type="button"
            onClick={() => onMove(-1)}
            disabled={index === 0}
            className="w-6 h-6 flex items-center justify-center rounded text-gray-400 hover:text-white disabled:opacity-20"
            title="Move up"
          >
            ↑
          </button>
          <button
            type="button"
            onClick={() => onMove(1)}
            disabled={index === total - 1}
            className="w-6 h-6 flex items-center justify-center rounded text-gray-400 hover:text-white disabled:opacity-20"
            title="Move down"
          >
            ↓
          </button>
        </div>

        <div className="flex-1 space-y-2">
          <div>
            <label className="block text-[11px] text-gray-500 mb-1">Question text (write it here)</label>
            <input
              placeholder="e.g. What could we improve?"
              value={field.label}
              onChange={(e) => onChange({ ...field, label: e.target.value })}
              className="input-field w-full"
            />
          </div>
          <div>
            <label className="block text-[11px] text-gray-500 mb-1">Answer type</label>
            <select
              value={field.type}
              onChange={(e) => {
                const type = e.target.value;
                // Switching into a choice type pads up to 2 blank options if
                // there aren't any yet; existing options are otherwise kept
                // no matter what type is picked, so nothing typed is lost.
                const needsMinimum = CHOICE_TYPES.includes(type) && field.options.length < 2;
                onChange({
                  ...field,
                  type,
                  options: needsMinimum ? [...field.options, '', ''].slice(0, 2) : field.options,
                });
              }}
              className="input-field w-full sm:w-56"
            >
              {FIELD_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5 pl-1">
            <p className="text-[11px] text-gray-500">
              {isChoice ? 'Answer options' : 'Quick-select suggestions (optional)'}
            </p>
            {field.options.map((opt, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-gray-500 text-xs w-4">{i + 1}.</span>
                <input
                  placeholder={`Option ${i + 1}`}
                  value={opt}
                  onChange={(e) => updateOption(i, e.target.value)}
                  className="input-field flex-1 text-sm py-1.5"
                />
                <button
                  type="button"
                  onClick={() => removeOption(i)}
                  className="text-gray-500 hover:text-red-400 text-sm px-1"
                  title="Remove option"
                >
                  ✕
                </button>
              </div>
            ))}
            <button type="button" onClick={addOption} className="text-xs text-accent-light hover:underline pl-6">
              + Add option
            </button>
          </div>

          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center gap-1.5 text-xs text-gray-400">
              <input
                type="checkbox"
                checked={field.required}
                onChange={(e) => onChange({ ...field, required: e.target.checked })}
              />
              Required
            </label>
            <button type="button" onClick={onRemove} className="text-xs text-red-400 hover:underline">
              Remove question
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function FormBuilder() {
  const currentUser = JSON.parse(localStorage.getItem('user') || 'null');
  const canCreate = currentUser?.role === 'admin';

  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null); // null = creating a new form
  const [draft, setDraft] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [copiedId, setCopiedId] = useState('');
  const [confirmingDeleteId, setConfirmingDeleteId] = useState('');
  const [deletingId, setDeletingId] = useState('');
  const [deleteError, setDeleteError] = useState('');

  useEffect(() => {
    getForms()
      .then((res) => setForms(res.data.forms))
      .finally(() => setLoading(false));
  }, []);

  const startEdit = (form) => {
    setEditingId(form._id);
    setDraft({
      title: form.title,
      description: form.description || '',
      ratingType: form.ratingType,
      ratingLabel: form.ratingLabel || 'How would you rate your experience?',
      commentLabel: form.commentLabel || 'Tell us more about your experience',
      collectName: form.collectName !== false,
      collectEmail: form.collectEmail !== false,
      nameRequired: !!form.nameRequired,
      emailRequired: !!form.emailRequired,
      fields: (form.fields || []).map((f) => ({ ...f, id: f.id || genId() })),
    });
    setError('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setDraft(emptyForm());
    setError('');
  };

  const addField = () => {
    setDraft((d) => ({
      ...d,
      fields: [...d.fields, { id: genId(), type: 'short_text', label: '', required: false, options: [] }],
    }));
  };
  const updateField = (id, next) => {
    setDraft((d) => ({ ...d, fields: d.fields.map((f) => (f.id === id ? next : f)) }));
  };
  const removeField = (id) => {
    setDraft((d) => ({ ...d, fields: d.fields.filter((f) => f.id !== id) }));
  };
  const moveField = (id, dir) => {
    setDraft((d) => {
      const idx = d.fields.findIndex((f) => f.id === id);
      const next = idx + dir;
      if (next < 0 || next >= d.fields.length) return d;
      const fields = [...d.fields];
      [fields[idx], fields[next]] = [fields[next], fields[idx]];
      return { ...d, fields };
    });
  };

  const validateDraft = () => {
    if (!draft.title.trim()) return 'Form title is required';
    for (const f of draft.fields) {
      if (!f.label.trim()) return 'Every question needs a label';
      if (CHOICE_TYPES.includes(f.type) && f.options.filter((o) => o.trim()).length < 2) {
        return `"${f.label || 'Untitled question'}" needs at least 2 options`;
      }
    }
    return '';
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const validationError = validateDraft();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError('');
    setSaving(true);
    try {
      const payload = { ...draft, fields: draft.fields.map((f) => ({ ...f, options: f.options.filter((o) => o.trim()) })) };
      if (editingId) {
        const res = await updateForm(editingId, payload);
        setForms(forms.map((f) => (f._id === editingId ? res.data.form : f)));
      } else {
        const res = await createForm(payload);
        setForms([res.data.form, ...forms]);
      }
      cancelEdit();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save form');
    } finally {
      setSaving(false);
    }
  };

  const handleCopy = (form) => {
    const link = `${window.location.origin}/feedback/${form.publicSlug}`;
    navigator.clipboard.writeText(link);
    setCopiedId(form._id);
    setTimeout(() => setCopiedId(''), 1500);
  };

  const handleDelete = async (formId) => {
    setDeleteError('');
    setDeletingId(formId);
    try {
      await deleteForm(formId);
      setForms(forms.filter((f) => f._id !== formId));
      setConfirmingDeleteId('');
      if (editingId === formId) cancelEdit();
    } catch (err) {
      setDeleteError(err.response?.data?.message || 'Failed to delete form');
    } finally {
      setDeletingId('');
    }
  };

  return (
    <div className="space-background-2 relative min-h-screen overflow-hidden pb-20">
      <div className="glow-orb w-[600px] h-[600px] -top-64 left-1/2 -translate-x-1/2" />

      <div className="relative z-10 pt-20">
        <TopNav />

        <div className="text-center max-w-2xl mx-auto mt-16 mb-12 px-4">
          <h1 className="text-3xl sm:text-4xl font-semibold text-white mb-2">
            Create <span className="accent-italic text-accent-light">shareable</span> feedback forms
          </h1>
          <p className="text-gray-400 text-sm">
            Every form gets a public link you can send to customers to collect feedback — customize the questions
            just like you would in Google Forms.
          </p>
        </div>

        <div className="max-w-3xl mx-auto px-4">
          {canCreate && (
            <div className="panel-card p-6 mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-white">{editingId ? 'Edit form' : 'Create a new form'}</h2>
                {editingId && (
                  <button type="button" onClick={cancelEdit} className="text-xs text-gray-400 hover:text-white">
                    Cancel edit
                  </button>
                )}
              </div>
              <form onSubmit={handleSave} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium field-label mb-1">Form title</label>
                  <input
                    placeholder="e.g. Post-purchase survey"
                    value={draft.title}
                    onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                    required
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium field-label mb-1">Description</label>
                  <textarea
                    placeholder="(optional)"
                    value={draft.description}
                    onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                    rows={2}
                    className="input-field"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium field-label mb-1">Rating scale</label>
                    <select
                      value={draft.ratingType}
                      onChange={(e) => setDraft({ ...draft, ratingType: e.target.value })}
                      className="input-field"
                    >
                      <option value="stars">Stars (1–5)</option>
                      <option value="nps">NPS (0–10)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium field-label mb-1">Rating question text</label>
                    <input
                      value={draft.ratingLabel}
                      onChange={(e) => setDraft({ ...draft, ratingLabel: e.target.value })}
                      className="input-field"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium field-label mb-1">Comment question text</label>
                  <input
                    value={draft.commentLabel}
                    onChange={(e) => setDraft({ ...draft, commentLabel: e.target.value })}
                    className="input-field"
                  />
                </div>

                <div className="flex flex-wrap gap-4 pt-1">
                  <label className="flex items-center gap-1.5 text-xs text-gray-400">
                    <input
                      type="checkbox"
                      checked={draft.collectName}
                      onChange={(e) => setDraft({ ...draft, collectName: e.target.checked })}
                    />
                    Ask for name
                  </label>
                  {draft.collectName && (
                    <label className="flex items-center gap-1.5 text-xs text-gray-400">
                      <input
                        type="checkbox"
                        checked={draft.nameRequired}
                        onChange={(e) => setDraft({ ...draft, nameRequired: e.target.checked })}
                      />
                      Name required
                    </label>
                  )}
                  <label className="flex items-center gap-1.5 text-xs text-gray-400">
                    <input
                      type="checkbox"
                      checked={draft.collectEmail}
                      onChange={(e) => setDraft({ ...draft, collectEmail: e.target.checked })}
                    />
                    Ask for email
                  </label>
                  {draft.collectEmail && (
                    <label className="flex items-center gap-1.5 text-xs text-gray-400">
                      <input
                        type="checkbox"
                        checked={draft.emailRequired}
                        onChange={(e) => setDraft({ ...draft, emailRequired: e.target.checked })}
                      />
                      Email required
                    </label>
                  )}
                </div>

                <div className="pt-2">
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-medium field-label">Custom questions</label>
                    <button type="button" onClick={addField} className="btn-outline text-xs py-1.5 px-3">
                      + Add question
                    </button>
                  </div>

                  {draft.fields.length === 0 ? (
                    <p className="text-xs text-gray-500">
                      No custom questions yet — every form always asks for a rating and a comment; add more below if
                      you need anything else.
                    </p>
                  ) : (
                    draft.fields.map((field, i) => (
                      <FieldCard
                        key={field.id}
                        field={field}
                        index={i}
                        total={draft.fields.length}
                        onChange={(next) => updateField(field.id, next)}
                        onRemove={() => removeField(field.id)}
                        onMove={(dir) => moveField(field.id, dir)}
                      />
                    ))
                  )}
                </div>

                {error && <p className="text-red-400 text-sm">{error}</p>}
                <button type="submit" disabled={saving} className="btn-primary w-full py-3 rounded-lg font-medium">
                  {saving ? 'Saving...' : editingId ? 'Save changes' : 'Create form'}
                </button>
              </form>
            </div>
          )}

          <h2 className="text-lg font-semibold text-white mb-4">Your forms</h2>

          {loading ? (
            <LoadingState label="Loading forms..." className="py-10" />
          ) : forms.length === 0 ? (
            <div className="panel-card p-6 text-center">
              <p className="text-gray-400 text-sm">No forms yet — create one above to start collecting feedback.</p>
            </div>
          ) : (
            forms.map((form) => {
              const link = `${window.location.origin}/feedback/${form.publicSlug}`;
              const customCount = form.fields?.length || 0;
              return (
                <div key={form._id} className="panel-card p-5 mb-3">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-semibold text-white text-sm">{form.title}</p>
                      {form.description && <p className="text-xs text-gray-500 mt-0.5">{form.description}</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="badge-chip">{form.ratingType === 'nps' ? 'NPS (0-10)' : 'Stars (1-5)'}</span>
                      {customCount > 0 && (
                        <span className="badge-chip">
                          +{customCount} question{customCount === 1 ? '' : 's'}
                        </span>
                      )}
                      {canCreate && (
                        <>
                          <button
                            onClick={() => startEdit(form)}
                            title="Edit form"
                            className="w-7 h-7 flex items-center justify-center rounded-full text-gray-300 border border-white/15 hover:bg-white/10"
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </button>
                          <button
                            onClick={() => setConfirmingDeleteId(form._id)}
                            title="Delete form"
                            className="w-7 h-7 flex items-center justify-center rounded-full text-red-400 border border-red-500/30 hover:bg-red-500/10"
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6h16z" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {confirmingDeleteId === form._id && (
                    <div className="mb-3 p-3 rounded-lg" style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                      <p className="text-xs text-red-300 mb-2">
                        This permanently deletes "{form.title}" and every review/ticket collected through it. This
                        cannot be undone.
                      </p>
                      {deleteError && <p className="text-red-400 text-xs mb-2">{deleteError}</p>}
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleDelete(form._id)}
                          disabled={deletingId === form._id}
                          className="text-xs font-semibold text-white bg-red-500 rounded-lg py-1.5 px-4 hover:bg-red-600"
                        >
                          {deletingId === form._id ? 'Deleting...' : 'Delete permanently'}
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
                  )}

                  <div className="flex items-center gap-2 mt-3">
                    <input readOnly value={link} className="input-field text-xs text-gray-400" />
                    <button onClick={() => handleCopy(form)} className="btn-outline text-xs py-2 px-4 whitespace-nowrap">
                      {copiedId === form._id ? 'Copied!' : 'Copy'}
                    </button>
                  </div>

                  <p className="text-xs text-gray-500 mt-2">
                    Created {new Date(form.createdAt).toLocaleDateString()}
                  </p>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
