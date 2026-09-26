import React from 'react';

// Shared by PublicFeedbackForm.jsx (customer-facing) and
// LogExternalFeedback.jsx (staff manually logging a review found
// elsewhere) — both need to render the same admin-defined custom
// questions the same way, so a form built in FormBuilder.jsx looks and
// behaves identically no matter which of the two ways it's filled in.

// Clickable suggestion chips shown under a free-text question when the
// admin added optional quick-select options for it — filling the field
// without stopping whoever's filling it in from typing their own answer
// instead.
export function SuggestionChips({ options, onPick }) {
  if (!options?.length) return null;
  return (
    <div className="flex flex-wrap gap-1.5 mt-1.5">
      {options.map((opt) => (
        <button key={opt} type="button" onClick={() => onPick(opt)} className="badge-chip text-xs hover:opacity-80">
          {opt}
        </button>
      ))}
    </div>
  );
}

// Renders one admin-defined custom question, matching the type built in
// FormBuilder.jsx (short_text, paragraph, multiple_choice, checkboxes,
// dropdown, date).
export function CustomField({ field, value, onChange }) {
  const label = (
    <label className="block text-sm field-label mb-2">
      {field.label}
      {field.required && <span className="text-red-400"> *</span>}
    </label>
  );

  switch (field.type) {
    case 'paragraph':
      return (
        <div>
          {label}
          <textarea
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            required={field.required}
            rows={3}
            className="input-field"
          />
          <SuggestionChips options={field.options} onPick={onChange} />
        </div>
      );
    case 'dropdown':
      return (
        <div>
          {label}
          <select
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            required={field.required}
            className="input-field"
          >
            <option value="" disabled>
              Select an option
            </option>
            {field.options.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>
      );
    case 'multiple_choice':
      return (
        <div>
          {label}
          <div className="space-y-1.5">
            {field.options.map((opt) => (
              <label key={opt} className="flex items-center gap-2 text-sm text-gray-300">
                <input
                  type="radio"
                  name={field.id}
                  value={opt}
                  checked={value === opt}
                  onChange={() => onChange(opt)}
                  required={field.required}
                />
                {opt}
              </label>
            ))}
          </div>
        </div>
      );
    case 'checkboxes': {
      const values = Array.isArray(value) ? value : [];
      const toggle = (opt) => onChange(values.includes(opt) ? values.filter((v) => v !== opt) : [...values, opt]);
      return (
        <div>
          {label}
          <div className="space-y-1.5">
            {field.options.map((opt) => (
              <label key={opt} className="flex items-center gap-2 text-sm text-gray-300">
                <input type="checkbox" checked={values.includes(opt)} onChange={() => toggle(opt)} />
                {opt}
              </label>
            ))}
          </div>
        </div>
      );
    }
    case 'date':
      return (
        <div>
          {label}
          <input
            type="date"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            required={field.required}
            className="input-field"
          />
          <SuggestionChips options={field.options} onPick={onChange} />
        </div>
      );
    case 'short_text':
    default:
      return (
        <div>
          {label}
          <input
            type="text"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            required={field.required}
            className="input-field"
          />
          <SuggestionChips options={field.options} onPick={onChange} />
        </div>
      );
  }
}
