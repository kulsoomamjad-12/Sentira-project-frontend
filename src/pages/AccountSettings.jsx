import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { updateProfile, changePassword, deleteAccount, deleteAllFeedback } from '../services/api';

const ICONS = {
  profile: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" strokeLinecap="round" />
    </svg>
  ),
  password: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="4" y="11" width="16" height="9" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" strokeLinecap="round" />
    </svg>
  ),
  reviews: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6h16z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  danger: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 9v4M12 17h.01" strokeLinecap="round" />
    </svg>
  ),
  logout: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M16 17l5-5-5-5M21 12H9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
};

export default function AccountSettings() {
  const navigate = useNavigate();
  const storedUser = JSON.parse(localStorage.getItem('user') || 'null');
  const isAdmin = storedUser?.role === 'admin';

  const [activeTab, setActiveTab] = useState('profile');

  const TABS = [
    { id: 'profile', label: 'Profile' },
    { id: 'password', label: 'Password' },
    ...(isAdmin ? [{ id: 'reviews', label: 'Delete Reviews' }] : []),
    { id: 'danger', label: 'Delete Account' },
  ];

  const [name, setName] = useState(storedUser?.name || '');
  const [nameSaving, setNameSaving] = useState(false);
  const [nameError, setNameError] = useState('');
  const [nameSuccess, setNameSuccess] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const [confirmingWipe, setConfirmingWipe] = useState(false);
  const [wipePassword, setWipePassword] = useState('');
  const [wiping, setWiping] = useState(false);
  const [wipeError, setWipeError] = useState('');
  const [wipeSuccess, setWipeSuccess] = useState('');

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const handleSaveName = async (e) => {
    e.preventDefault();
    setNameError('');
    setNameSuccess(false);
    setNameSaving(true);
    try {
      const res = await updateProfile({ name });
      localStorage.setItem('user', JSON.stringify(res.data.user));
      setNameSuccess(true);
    } catch (err) {
      setNameError(err.response?.data?.message || 'Failed to update name');
    } finally {
      setNameSaving(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess(false);
    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }
    setPasswordSaving(true);
    try {
      await changePassword({ currentPassword, newPassword });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordSuccess(true);
    } catch (err) {
      setPasswordError(err.response?.data?.message || 'Failed to change password');
    } finally {
      setPasswordSaving(false);
    }
  };

  const handleDelete = async (e) => {
    e.preventDefault();
    setDeleteError('');
    setDeleting(true);
    try {
      await deleteAccount({ password: deletePassword });
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      navigate('/register');
    } catch (err) {
      setDeleteError(err.response?.data?.message || 'Failed to delete account');
      setDeleting(false);
    }
  };

  const handleWipeReviews = async (e) => {
    e.preventDefault();
    setWipeError('');
    setWipeSuccess('');
    setWiping(true);
    try {
      const res = await deleteAllFeedback(wipePassword);
      setWipeSuccess(`Deleted ${res.data.deletedCount} review${res.data.deletedCount === 1 ? '' : 's'}.`);
      setWipePassword('');
      setConfirmingWipe(false);
    } catch (err) {
      setWipeError(err.response?.data?.message || 'Failed to delete reviews');
    } finally {
      setWiping(false);
    }
  };

  return (
    <div className="space-background-2 relative min-h-screen overflow-hidden pb-20">
      <div className="glow-orb w-[600px] h-[600px] -top-64 left-1/2 -translate-x-1/2" />

      <div className="relative z-10">
        {/* Sidebar: fixed to the page's left edge, fully independent of the
            centered column below — moving it never shifts anything else.
            Only shown at xl+: below that, the fixed 200px sidebar plus the
            centered max-w-2xl content column don't both fit without
            overlapping (they'd collide anywhere from ~1024px to ~1150px),
            so narrower screens use the horizontal tab bar instead. */}
        <div className="hidden xl:block fixed left-6 top-28 w-[200px] z-20">
          <div className="panel-card p-3">
            <nav className="flex flex-col gap-1">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 text-left text-sm px-3 py-2 rounded-lg whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'bg-accent/15 text-accent-light font-medium'
                      : tab.id === 'danger' || tab.id === 'reviews'
                      ? 'text-red-400 hover:bg-white/5'
                      : 'text-gray-300 hover:bg-white/5'
                  }`}
                >
                  {ICONS[tab.id]}
                  {tab.label}
                </button>
              ))}
              <div className="border-t border-base-border my-1" />
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 text-left text-sm px-3 py-2 rounded-lg text-gray-400 hover:bg-white/5 whitespace-nowrap"
              >
                {ICONS.logout}
                Log out
              </button>
            </nav>
          </div>
        </div>

        {/* Back to Dashboard: fixed, aligned with the sidebar's left edge at
            xl+ (left-4 below that, where the sidebar itself is hidden). */}
        <Link
          to="/dashboard"
          className="btn-primary fixed left-4 xl:left-6 top-8 z-20 inline-flex items-center gap-2 text-xs py-2 px-4 w-fit"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Back to Dashboard
        </Link>

        {/* Header, subtitle, and content: always their own centered column,
            regardless of where the sidebar sits. */}
        <div className="max-w-2xl mx-auto px-4 pt-8">
          <h1 className="text-3xl sm:text-4xl font-semibold text-white text-center">
            Account <span className="accent-italic text-accent-light">settings</span>
          </h1>
        </div>

        <div className="text-center max-w-2xl mx-auto mt-2 mb-10 px-4">
          <p className="text-gray-400 text-sm">Manage your profile, password, and account.</p>
        </div>

        {/* Mobile/tablet/small-desktop tab bar — the fixed sidebar only
            appears at xl+, so below that this replaces it in normal document
            flow. */}
        <div className="xl:hidden max-w-2xl mx-auto px-4 mb-4">
          <div className="panel-card p-3">
            <nav className="flex gap-1 overflow-x-auto">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 text-left text-sm px-3 py-2 rounded-lg whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'bg-accent/15 text-accent-light font-medium'
                      : tab.id === 'danger' || tab.id === 'reviews'
                      ? 'text-red-400 hover:bg-white/5'
                      : 'text-gray-300 hover:bg-white/5'
                  }`}
                >
                  {ICONS[tab.id]}
                  {tab.label}
                </button>
              ))}
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 text-left text-sm px-3 py-2 rounded-lg text-gray-400 hover:bg-white/5 whitespace-nowrap"
              >
                {ICONS.logout}
                Log out
              </button>
            </nav>
          </div>
        </div>

        <div className="max-w-2xl mx-auto px-4">
          <div>
            {activeTab === 'profile' && (
              <div className="panel-card p-6">
                <h2 className="text-lg font-semibold text-white mb-4">Profile</h2>
                <form onSubmit={handleSaveName} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium field-label mb-1">Name</label>
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium field-label mb-1">Email</label>
                    <input value={storedUser?.email || ''} readOnly className="input-field text-gray-500" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium field-label mb-1">Company</label>
                      <input value={storedUser?.companyName || ''} readOnly className="input-field text-gray-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium field-label mb-1">Role</label>
                      <input value={storedUser?.role || ''} readOnly className="input-field text-gray-500 capitalize" />
                    </div>
                  </div>
                  {nameError && <p className="text-red-400 text-sm">{nameError}</p>}
                  {nameSuccess && <p className="text-accent-light text-sm">Saved.</p>}
                  <button type="submit" disabled={nameSaving} className="btn-primary py-2.5 px-6 rounded-lg font-medium">
                    {nameSaving ? 'Saving...' : 'Save changes'}
                  </button>
                </form>
              </div>
            )}

            {activeTab === 'password' && (
              <div className="panel-card p-6">
                <h2 className="text-lg font-semibold text-white mb-4">Change password</h2>
                <form onSubmit={handleChangePassword} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium field-label mb-1">Current password</label>
                    <input
                      type="password"
                      placeholder="Current password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      required
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium field-label mb-1">New password</label>
                    <input
                      type="password"
                      placeholder="New password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      minLength={6}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium field-label mb-1">Confirm new password</label>
                    <input
                      type="password"
                      placeholder="Confirm new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      minLength={6}
                      className="input-field"
                    />
                  </div>
                  {passwordError && <p className="text-red-400 text-sm">{passwordError}</p>}
                  {passwordSuccess && <p className="text-accent-light text-sm">Password updated.</p>}
                  <button type="submit" disabled={passwordSaving} className="btn-primary py-2.5 px-6 rounded-lg font-medium">
                    {passwordSaving ? 'Saving...' : 'Update password'}
                  </button>
                </form>
              </div>
            )}

            {activeTab === 'reviews' && isAdmin && (
              <div className="panel-card p-6" style={{ borderColor: 'rgba(239, 68, 68, 0.3)' }}>
                <h2 className="text-lg font-semibold text-red-400">Delete all reviews</h2>
                <p className="text-gray-500 text-xs mt-1 mb-4">
                  Permanently deletes every review and its tickets across all your forms, so you can start fresh.
                  This cannot be undone.
                </p>

                {wipeSuccess && <p className="text-accent-light text-sm mb-3">{wipeSuccess}</p>}

                {!confirmingWipe ? (
                  <button
                    onClick={() => setConfirmingWipe(true)}
                    className="text-sm font-semibold text-red-400 border border-red-500/30 rounded-lg py-2.5 px-6 hover:bg-red-500/10"
                  >
                    Delete all reviews
                  </button>
                ) : (
                  <form onSubmit={handleWipeReviews} className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium field-label mb-1">Confirm password</label>
                      <input
                        type="password"
                        placeholder="Confirm your password to delete all reviews"
                        value={wipePassword}
                        onChange={(e) => setWipePassword(e.target.value)}
                        required
                        className="input-field"
                      />
                    </div>
                    {wipeError && <p className="text-red-400 text-sm">{wipeError}</p>}
                    <div className="flex gap-3">
                      <button
                        type="submit"
                        disabled={wiping}
                        className="text-sm font-semibold text-white bg-red-500 rounded-lg py-2.5 px-6 hover:bg-red-600"
                      >
                        {wiping ? 'Deleting...' : 'Permanently delete all reviews'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setConfirmingWipe(false);
                          setWipePassword('');
                          setWipeError('');
                        }}
                        className="btn-outline text-sm py-2.5 px-6 rounded-lg"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}

            {activeTab === 'danger' && (
              <div className="panel-card p-6" style={{ borderColor: 'rgba(239, 68, 68, 0.3)' }}>
                <h2 className="text-lg font-semibold text-red-400">Delete account</h2>
                <p className="text-gray-500 text-xs mt-1 mb-4">
                  This permanently deletes your account. This cannot be undone.
                </p>

                {!confirmingDelete ? (
                  <button
                    onClick={() => setConfirmingDelete(true)}
                    className="text-sm font-semibold text-red-400 border border-red-500/30 rounded-lg py-2.5 px-6 hover:bg-red-500/10"
                  >
                    Delete my account
                  </button>
                ) : (
                  <form onSubmit={handleDelete} className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium field-label mb-1">Confirm password</label>
                      <input
                        type="password"
                        placeholder="Confirm your password to delete"
                        value={deletePassword}
                        onChange={(e) => setDeletePassword(e.target.value)}
                        required
                        className="input-field"
                      />
                    </div>
                    {deleteError && <p className="text-red-400 text-sm">{deleteError}</p>}
                    <div className="flex gap-3">
                      <button
                        type="submit"
                        disabled={deleting}
                        className="text-sm font-semibold text-white bg-red-500 rounded-lg py-2.5 px-6 hover:bg-red-600"
                      >
                        {deleting ? 'Deleting...' : 'Permanently delete'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setConfirmingDelete(false);
                          setDeletePassword('');
                          setDeleteError('');
                        }}
                        className="btn-outline text-sm py-2.5 px-6 rounded-lg"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
