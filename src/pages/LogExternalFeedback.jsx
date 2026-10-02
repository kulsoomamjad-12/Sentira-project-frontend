import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  getForms,
  getFeedback,
  getSocialImportSources,
  createSocialImportSource,
  updateSocialImportSource,
  deleteSocialImportSource,
  runSocialImportSourceNow,
} from '../services/api';
import TopNav from '../components/TopNav';
import SentimentBadge from '../components/SentimentBadge';
import UrgencyBadge from '../components/UrgencyBadge';
import { LoadingState } from '../components/Spinner';

const SOCIAL_PLATFORMS = [
  { value: 'instagram', label: 'Instagram' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'linkedin', label: 'LinkedIn' },
];

const PLATFORM_LABEL = Object.fromEntries(SOCIAL_PLATFORMS.map((p) => [p.value, p.label]));

export default function LogExternalFeedback() {
  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(true);

  const [allFeedback, setAllFeedback] = useState([]);
  const [loadingFeedback, setLoadingFeedback] = useState(true);

  // --- Import from social media (Apify) ---
  const [socialFormId, setSocialFormId] = useState('');
  const [platform, setPlatform] = useState('instagram');
  const [postUrl, setPostUrl] = useState('');
  const [autoRecheck, setAutoRecheck] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState('');
  const [importResult, setImportResult] = useState(null);

  const [sources, setSources] = useState([]);
  const [loadingSources, setLoadingSources] = useState(true);
  const [runningSourceId, setRunningSourceId] = useState('');
  const [deletingSourceId, setDeletingSourceId] = useState('');

  const loadFeedback = () => {
    setLoadingFeedback(true);
    getFeedback()
      .then((res) => setAllFeedback(res.data.feedback))
      .finally(() => setLoadingFeedback(false));
  };

  const loadSources = () => {
    setLoadingSources(true);
    getSocialImportSources()
      .then((res) => setSources(res.data.sources))
      .finally(() => setLoadingSources(false));
  };

  useEffect(() => {
    getForms()
      .then((res) => {
        setForms(res.data.forms);
        if (res.data.forms.length) setSocialFormId(res.data.forms[0]._id);
      })
      .finally(() => setLoading(false));
    loadFeedback();
    loadSources();
  }, []);

  const handleImport = async (e) => {
    e.preventDefault();
    setImportError('');
    setImportResult(null);
    setImporting(true);
    try {
      const created = await createSocialImportSource({
        formId: socialFormId,
        platform,
        url: postUrl,
        isActive: autoRecheck,
      });
      const ran = await runSocialImportSourceNow(created.data.source._id);
      setImportResult(ran.data.result);
      setPostUrl('');
      loadSources();
      loadFeedback();
    } catch (err) {
      setImportError(err.response?.data?.message || 'Failed to fetch comments');
    } finally {
      setImporting(false);
    }
  };

  const handleToggleAuto = async (source) => {
    try {
      const res = await updateSocialImportSource(source._id, { isActive: !source.isActive });
      setSources((prev) => prev.map((s) => (s._id === source._id ? res.data.source : s)));
    } catch {
      // Non-critical — the toggle just visually stays as-is; no need for a
      // dedicated error state for this one small action.
    }
  };

  const handleRunSourceNow = async (sourceId) => {
    setRunningSourceId(sourceId);
    try {
      const res = await runSocialImportSourceNow(sourceId);
      setSources((prev) => prev.map((s) => (s._id === sourceId ? res.data.source : s)));
      loadFeedback();
    } catch {
      // The backend persists lastRunStatus/lastRunError on the source even
      // when the request itself comes back as an error — reload to show it.
      loadSources();
    } finally {
      setRunningSourceId('');
    }
  };

  const handleDeleteSource = async (id) => {
    setDeletingSourceId(id);
    try {
      await deleteSocialImportSource(id);
      setSources((prev) => prev.filter((s) => s._id !== id));
    } finally {
      setDeletingSourceId('');
    }
  };

  return (
    <div className="space-background-2 relative min-h-screen overflow-hidden pb-20">
      <div className="glow-orb w-[600px] h-[600px] -top-64 left-1/2 -translate-x-1/2" />

      <div className="relative z-10 pt-20">
        <TopNav />

        <div className="text-center max-w-2xl mx-auto mt-16 mb-12 px-4">
          <h1 className="text-3xl sm:text-4xl font-semibold text-white mb-2">
            Import reviews from <span className="accent-italic text-accent-light">social media</span>
          </h1>
          <p className="text-gray-400 text-sm">
            Paste a post's link and its comments are fetched and run through the same AI analysis as every other
            review.
          </p>
        </div>

        <div className="max-w-2xl mx-auto px-4">
          {loading ? (
            <LoadingState className="py-10" />
          ) : forms.length === 0 ? (
            <div className="panel-card p-6 text-center">
              <p className="text-gray-400 text-sm">
                You need a feedback form before importing reviews.{' '}
                <Link to="/dashboard/forms" className="text-accent-light font-medium hover:underline">
                  Create one first
                </Link>
                .
              </p>
            </div>
          ) : (
            <div className="panel-card p-6">
              <p className="text-xs text-gray-500 mb-4">
                Requires an Apify account connected on the backend (see <code>APIFY_TOKEN</code> in{' '}
                <code>backend/.env</code>) — until then this returns a clear "not configured yet" error.
              </p>
              <form onSubmit={handleImport} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium field-label mb-1">Platform</label>
                    <select value={platform} onChange={(e) => setPlatform(e.target.value)} className="input-field">
                      {SOCIAL_PLATFORMS.map((p) => (
                        <option key={p.value} value={p.value}>
                          {p.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium field-label mb-1">Attach to form</label>
                    <select
                      value={socialFormId}
                      onChange={(e) => setSocialFormId(e.target.value)}
                      className="input-field"
                    >
                      {forms.map((f) => (
                        <option key={f._id} value={f._id}>
                          {f.title}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium field-label mb-1">Post URL</label>
                  <input
                    placeholder="e.g. https://www.instagram.com/p/..."
                    value={postUrl}
                    onChange={(e) => setPostUrl(e.target.value)}
                    required
                    className="input-field"
                  />
                </div>
                <label className="flex items-center gap-1.5 text-xs text-gray-400">
                  <input type="checkbox" checked={autoRecheck} onChange={(e) => setAutoRecheck(e.target.checked)} />
                  Automatically re-check this link for new comments (about once an hour)
                </label>

                {importError && <p className="text-red-400 text-sm">{importError}</p>}
                {importResult && (
                  <p className="text-accent-light text-sm">
                    Fetched {importResult.fetched} comment{importResult.fetched === 1 ? '' : 's'} — imported{' '}
                    {importResult.imported} new, skipped {importResult.skipped} already seen.
                  </p>
                )}
                <button type="submit" disabled={importing} className="btn-primary w-full py-3 rounded-lg font-medium">
                  {importing ? 'Fetching...' : 'Fetch & analyze'}
                </button>
              </form>

              {(loadingSources || sources.length > 0) && (
                <div className="mt-5 pt-4 border-t border-base-border">
                  <h3 className="text-xs font-medium field-label mb-2">Saved links</h3>
                  {loadingSources ? (
                    <LoadingState className="py-4" />
                  ) : (
                    <div className="space-y-2">
                      {sources.map((source) => (
                        <div key={source._id} className="panel-card p-3" style={{ background: 'rgba(255,255,255,0.03)' }}>
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-xs text-gray-300 flex items-center gap-2">
                                <span className="badge-chip">{PLATFORM_LABEL[source.platform] || source.platform}</span>
                                <span className="truncate">{source.url}</span>
                              </p>
                              <p className="text-[11px] text-gray-500 mt-1">
                                {source.lastRunAt ? (
                                  <>
                                    Last run {new Date(source.lastRunAt).toLocaleString()} —{' '}
                                    {source.lastRunStatus === 'error' ? (
                                      <span className="text-red-400">{source.lastRunError}</span>
                                    ) : (
                                      <span>{source.lastImportedCount} new comment{source.lastImportedCount === 1 ? '' : 's'}</span>
                                    )}
                                  </>
                                ) : (
                                  'Never run yet'
                                )}
                              </p>
                            </div>
                            <button
                              onClick={() => handleDeleteSource(source._id)}
                              disabled={deletingSourceId === source._id}
                              title="Delete saved link"
                              className="w-6 h-6 shrink-0 flex items-center justify-center rounded-full text-red-400 border border-red-500/30 hover:bg-red-500/10"
                            >
                              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6h16z" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            </button>
                          </div>
                          <div className="flex items-center justify-between mt-2">
                            <label className="flex items-center gap-1.5 text-[11px] text-gray-400">
                              <input
                                type="checkbox"
                                checked={source.isActive}
                                onChange={() => handleToggleAuto(source)}
                              />
                              Auto re-check
                            </label>
                            <button
                              onClick={() => handleRunSourceNow(source._id)}
                              disabled={runningSourceId === source._id}
                              className="btn-outline text-[11px] py-1 px-3"
                            >
                              {runningSourceId === source._id ? 'Running...' : 'Run now'}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="max-w-4xl mx-auto px-4 mt-10">
          <div className="panel-card p-6">
            <h2 className="font-semibold text-white text-sm mb-4">All reviews</h2>
            {loadingFeedback ? (
              <LoadingState className="py-8" />
            ) : allFeedback.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-8">No reviews yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left text-gray-500 border-b border-base-border">
                      <th className="pb-2 pr-3 font-medium">Customer</th>
                      <th className="pb-2 pr-3 font-medium">Comment</th>
                      <th className="pb-2 pr-3 font-medium">Sentiment</th>
                      <th className="pb-2 pr-3 font-medium">Urgency</th>
                      <th className="pb-2 font-medium">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allFeedback.map((item) => (
                      <tr key={item._id} className="border-b border-base-border last:border-b-0">
                        <td className="py-2.5 pr-3 text-gray-300 whitespace-nowrap">{item.customerName || 'Anonymous'}</td>
                        <td className="py-2.5 pr-3 text-gray-400 max-w-xs truncate">{item.comment}</td>
                        <td className="py-2.5 pr-3">
                          <SentimentBadge sentiment={item.aiAnalysis?.sentiment} />
                        </td>
                        <td className="py-2.5 pr-3">
                          <UrgencyBadge urgency={item.aiAnalysis?.urgency} />
                        </td>
                        <td className="py-2.5 text-gray-500 whitespace-nowrap">
                          {new Date(item.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
