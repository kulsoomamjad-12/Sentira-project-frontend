import React, { useEffect, useState } from 'react';
import { getTeam, getInviteLink, regenerateInviteLink, sendInviteEmail, removeTeamMember } from '../services/api';
import TopNav from '../components/TopNav';
import Spinner, { LoadingState } from '../components/Spinner';

// Copies text to the clipboard and reports back whether it worked, so the
// caller can show "Copied!" feedback without swallowing failures silently.
async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export default function Team() {
  const currentUser = JSON.parse(localStorage.getItem('user') || 'null');
  const isAdmin = currentUser?.role === 'admin';

  const [team, setTeam] = useState([]);
  const [loading, setLoading] = useState(true);

  // One persistent link for the whole company — every member the
  // admin wants to add gets this exact same link, unlike a per-person invite.
  const [inviteLink, setInviteLink] = useState('');
  const [linkCopied, setLinkCopied] = useState(false);
  const [confirmingRegenerate, setConfirmingRegenerate] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [sendingInvite, setSendingInvite] = useState(false);
  const [inviteSentMessage, setInviteSentMessage] = useState('');
  const [inviteError, setInviteError] = useState('');

  const [confirmingRemoveId, setConfirmingRemoveId] = useState('');
  const [removingId, setRemovingId] = useState('');
  const [removeError, setRemoveError] = useState('');

  const loadTeam = () => {
    getTeam()
      .then((res) => setTeam(res.data.team))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadTeam();
    if (isAdmin) {
      getInviteLink().then((res) => setInviteLink(res.data.inviteLink));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCopyLink = async () => {
    const ok = await copyToClipboard(inviteLink);
    if (ok) {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    }
  };

  const handleRegenerate = async () => {
    setRegenerating(true);
    try {
      const res = await regenerateInviteLink();
      setInviteLink(res.data.inviteLink);
      setConfirmingRegenerate(false);
    } finally {
      setRegenerating(false);
    }
  };

  const handleSendInvite = async (e) => {
    e.preventDefault();
    setInviteError('');
    setInviteSentMessage('');
    setSendingInvite(true);
    try {
      await sendInviteEmail(inviteName, inviteEmail);
      setInviteSentMessage(`Invite sent to ${inviteName} (${inviteEmail})`);
      setInviteName('');
      setInviteEmail('');
    } catch (err) {
      setInviteError(err.response?.data?.message || 'Failed to send invite email');
    } finally {
      setSendingInvite(false);
    }
  };

  const handleRemoveMember = async (id) => {
    setRemoveError('');
    setRemovingId(id);
    try {
      await removeTeamMember(id);
      setTeam((prev) => prev.filter((m) => m._id !== id));
      setConfirmingRemoveId('');
    } catch (err) {
      setRemoveError(err.response?.data?.message || 'Failed to remove team member');
    } finally {
      setRemovingId('');
    }
  };

  return (
    <div className="space-background-2 relative min-h-screen overflow-hidden pb-20">
      <div className="glow-orb w-[600px] h-[600px] -top-64 left-1/2 -translate-x-1/2" />

      <div className="relative z-10 pt-20">
        <TopNav />

        <div className="text-center max-w-2xl mx-auto mt-16 mb-12 px-4">
          <h1 className="text-3xl sm:text-4xl font-semibold text-white mb-2">
            Manage your <span className="accent-italic text-accent-light">team</span>
          </h1>
          <p className="text-gray-400 text-sm">
            Share your company's invite link so team members can join and be assigned tickets.
          </p>
        </div>

        <div className="max-w-2xl mx-auto px-4 space-y-6">
          {isAdmin && (
            <div className="panel-card p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Company invite link</h2>
              <p className="text-xs text-gray-500 mb-4">
                One link for everyone at <span className="text-gray-300">{currentUser?.companyName}</span> — send it
                to anyone you want on the team (email, Slack, WhatsApp, anywhere). They register themselves — their
                own name, email, and password — and register as a Team Member on the registration page; the link
                is what ties them to your company. Everyone uses this exact same link until you regenerate it.
              </p>

              {!inviteLink ? (
                <div className="flex items-center gap-2 text-gray-500 text-sm">
                  <Spinner size={16} />
                  Loading your invite link...
                </div>
              ) : (
                <div className="flex gap-2">
                  <input readOnly value={inviteLink} className="input-field text-xs flex-1" onFocus={(e) => e.target.select()} />
                  <button type="button" onClick={handleCopyLink} className="btn-outline text-xs py-1.5 px-3 shrink-0">
                    {linkCopied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              )}

              <div className="mt-4 pt-4 border-t border-base-border">
                <p className="text-xs font-medium text-gray-300 mb-2">Or email the invite link directly</p>
                <form onSubmit={handleSendInvite} className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    required
                    value={inviteName}
                    onChange={(e) => setInviteName(e.target.value)}
                    placeholder="Teammate's name"
                    className="input-field text-xs sm:flex-1"
                  />
                  <input
                    type="email"
                    required
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="teammate@company.com"
                    className="input-field text-xs sm:flex-1"
                  />
                  <button type="submit" disabled={sendingInvite} className="btn-outline text-xs py-1.5 px-3 shrink-0">
                    {sendingInvite ? 'Sending...' : 'Send'}
                  </button>
                </form>
                {inviteSentMessage && <p className="text-xs text-green-400 mt-2">{inviteSentMessage}</p>}
                {inviteError && <p className="text-xs text-red-400 mt-2">{inviteError}</p>}
              </div>

              <div className="mt-4 pt-4 border-t border-base-border">
                {!confirmingRegenerate ? (
                  <button
                    type="button"
                    onClick={() => setConfirmingRegenerate(true)}
                    className="text-xs font-medium text-red-400 hover:underline"
                  >
                    Regenerate link
                  </button>
                ) : (
                  <div className="p-3 rounded-lg" style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                    <p className="text-xs text-red-300 mb-2">
                      The old link will stop working immediately — anyone who hasn't joined yet will need the new one.
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={handleRegenerate}
                        disabled={regenerating}
                        className="text-xs font-semibold text-white bg-red-500 rounded-lg py-1.5 px-4 hover:bg-red-600"
                      >
                        {regenerating ? 'Regenerating...' : 'Regenerate'}
                      </button>
                      <button onClick={() => setConfirmingRegenerate(false)} className="btn-outline text-xs py-1.5 px-4">
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="panel-card p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Team members</h2>
            {removeError && <p className="text-red-400 text-xs mb-3">{removeError}</p>}
            {loading ? (
              <LoadingState className="py-4" />
            ) : (
              <div className="space-y-2">
                {team.map((member) => {
                  const canRemove = isAdmin && member.role !== 'admin' && member._id !== currentUser?._id;
                  return (
                    <div key={member._id} className="border-t border-base-border pt-2 first:border-t-0 first:pt-0">
                      <div className="flex items-center justify-between text-sm">
                        <div>
                          <p className="text-white">{member.name}</p>
                          <p className="text-gray-500 text-xs">{member.email}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="badge-chip capitalize">{member.role}</span>
                          {canRemove && confirmingRemoveId !== member._id && (
                            <button
                              onClick={() => setConfirmingRemoveId(member._id)}
                              title="Remove from team"
                              className="text-gray-500 hover:text-red-400"
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6h16z" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </div>
                      {canRemove && confirmingRemoveId === member._id && (
                        <div className="mt-2 p-3 rounded-lg" style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                          <p className="text-xs text-red-300 mb-2">
                            Remove {member.name} from the team? Any tickets assigned to them will become unassigned.
                          </p>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleRemoveMember(member._id)}
                              disabled={removingId === member._id}
                              className="text-xs font-semibold text-white bg-red-500 rounded-lg py-1.5 px-4 hover:bg-red-600"
                            >
                              {removingId === member._id ? 'Removing...' : 'Remove'}
                            </button>
                            <button onClick={() => setConfirmingRemoveId('')} className="btn-outline text-xs py-1.5 px-4">
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
