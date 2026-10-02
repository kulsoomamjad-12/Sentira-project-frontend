import React, { useState } from 'react';
import { createTicket, updateTicket } from '../services/api';

const STATUS_OPTIONS = ['open', 'in-progress', 'resolved'];

// Shared "this one's done" look for a resolved ticket — used in every view
// (assignee, admin, any other team member) so a resolved ticket reads the
// same everywhere instead of some viewers seeing a plain "Status: resolved" line.
function ResolvedStatus({ notes }) {
  return (
    <div className="text-xs">
      <p className="text-accent-light font-semibold">✓ Resolved</p>
      {notes && <p className="mt-1 text-gray-400">{notes}</p>}
    </div>
  );
}

// Ticket workflow controls rendered inside a FeedbackCard: creates a ticket
// for a feedback submission, then lets its status/notes/assignee be edited.
// Resolving the actual issue (status + notes) is the assigned team member's
// job — the admin can only view that part, never change it. Assigning/
// reassigning who owns the ticket stays an admin privilege, separate from
// doing the work (both enforced again server-side — this just keeps the UI
// honest about what will actually work).
export default function TicketControls({ feedbackId, ticket, onChange, teamMembers = [] }) {
  const currentUser = JSON.parse(localStorage.getItem('user') || 'null');
  const isAdmin = currentUser?.role === 'admin';
  const isAssignee = ticket?.assignedTo?._id === currentUser?._id;
  const canEditStatus = isAssignee;
  const canAssign = isAdmin;

  const [creating, setCreating] = useState(false);
  const [status, setStatus] = useState(ticket?.status || 'open');
  const [resolutionNotes, setResolutionNotes] = useState(ticket?.resolutionNotes || '');
  const [assignedTo, setAssignedTo] = useState(ticket?.assignedTo?._id || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async () => {
    setCreating(true);
    setError('');
    try {
      const res = await createTicket({ feedbackId });
      onChange(res.data.ticket);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create ticket');
    } finally {
      setCreating(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const payload = { status, resolutionNotes };
      if (canAssign) payload.assignedTo = assignedTo || null;
      const res = await updateTicket(ticket._id, payload);
      onChange(res.data.ticket);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update ticket');
    } finally {
      setSaving(false);
    }
  };

  // Admin-only path: they can route the ticket to someone, but never touch
  // status/notes, so this sends *just* the assignment, not the whole form.
  const handleSaveAssignment = async () => {
    setSaving(true);
    setError('');
    try {
      const res = await updateTicket(ticket._id, { assignedTo: assignedTo || null });
      onChange(res.data.ticket);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update assignment');
    } finally {
      setSaving(false);
    }
  };

  // Opening a ticket is an admin-only action (enforced again server-side);
  // a team member just sees that none exists yet instead of a button that
  // would fail.
  if (!ticket) {
    if (!isAdmin) {
      return <p className="text-xs text-gray-500">No ticket opened for this yet.</p>;
    }
    return (
      <div>
        <button onClick={handleCreate} disabled={creating} className="btn-outline text-xs py-1.5 px-4">
          {creating ? 'Creating ticket...' : 'Create ticket'}
        </button>
        {error && <p className="text-red-400 text-xs mt-2">{error}</p>}
      </div>
    );
  }

  // Admin: read-only status/notes, but can still reassign who's working it.
  if (isAdmin) {
    return (
      <div className="space-y-2">
        {ticket.status === 'resolved' ? (
          <ResolvedStatus notes={ticket.resolutionNotes} />
        ) : (
          <div className="text-xs text-gray-400">
            <p>
              Status: <span className="text-gray-300">{ticket.status}</span>
            </p>
            {ticket.resolutionNotes && <p className="mt-1 text-gray-500">{ticket.resolutionNotes}</p>}
          </div>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-xs field-label">Assigned to</label>
          <select
            value={assignedTo}
            onChange={(e) => setAssignedTo(e.target.value)}
            className="input-field w-auto text-xs py-1.5"
          >
            <option value="">Unassigned</option>
            {teamMembers.map((member) => (
              <option key={member._id} value={member._id}>
                {member.name} ({member.role})
              </option>
            ))}
          </select>
          <button onClick={handleSaveAssignment} disabled={saving} className="btn-primary text-xs py-1.5 px-4">
            {saving ? 'Saving...' : 'Save assignment'}
          </button>
        </div>
        {error && <p className="text-red-400 text-xs">{error}</p>}
      </div>
    );
  }

  if (!canEditStatus) {
    if (ticket.status === 'resolved') {
      return <ResolvedStatus notes={ticket.resolutionNotes} />;
    }
    return (
      <div className="text-xs text-gray-400">
        <p>
          Status: <span className="text-gray-300">{ticket.status}</span>
          {ticket.assignedTo && <> · Assigned to <span className="text-gray-300">{ticket.assignedTo.name}</span></>}
        </p>
        {ticket.resolutionNotes && <p className="mt-1 text-gray-500">{ticket.resolutionNotes}</p>}
        <p className="mt-1 text-gray-600">Only the assignee can edit this ticket.</p>
      </div>
    );
  }

  // Once the server confirms this ticket is resolved, the assignee is done
  // with it — show the outcome instead of the editable form, so "Save
  // ticket" doesn't keep sitting there after there's nothing left to save.
  if (ticket.status === 'resolved') {
    return <ResolvedStatus notes={ticket.resolutionNotes} />;
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-xs field-label">Status</label>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="input-field w-auto text-xs py-1.5"
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        {canAssign && (
          <>
            <label className="text-xs field-label">Assigned to</label>
            <select
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
              className="input-field w-auto text-xs py-1.5"
            >
              <option value="">Unassigned</option>
              {teamMembers.map((member) => (
                <option key={member._id} value={member._id}>
                  {member.name} ({member.role})
                </option>
              ))}
            </select>
          </>
        )}
      </div>
      <div>
        <label className="block text-xs field-label mb-1">Resolution notes</label>
        <textarea
          placeholder="Resolution notes..."
          value={resolutionNotes}
          onChange={(e) => setResolutionNotes(e.target.value)}
          rows={2}
          className="input-field text-xs"
        />
      </div>
      <button onClick={handleSave} disabled={saving} className="btn-primary text-xs py-1.5 px-4">
        {saving ? 'Saving...' : 'Save ticket'}
      </button>
      {error && <p className="text-red-400 text-xs">{error}</p>}
    </div>
  );
}
