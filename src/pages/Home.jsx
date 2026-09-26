import React from 'react';
import { Link } from 'react-router-dom';
import logoIcon from '../assets/logos/logo-icon.png';
import sentimentHuman from '../assets/sentiment human.png';
import ThemeToggle from '../components/ThemeToggle';

const FEATURES = [
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path
          d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
    title: 'Sentiment AI',
    description: 'Classifies every response as positive, neutral, or negative — instantly.',
    detail:
      "Every submission also gets an emotion read (delighted to frustrated), an intensity score, auto-tagged topics, and a one-sentence summary — so you know what matters without reading the raw text.",
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    title: 'Real-time Alerts',
    description: 'Get notified the moment a critical review comes in — no page reload needed.',
    detail:
      'Live updates push straight to your notification bell — critical and high-urgency reviews are flagged the instant they arrive, and every ticket update shows up for the right people as it happens.',
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M20 6 9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    title: 'Action Center',
    description: 'Turn feedback into tickets and track them through to resolution.',
    detail:
      'Assign a ticket to a team member and track it from open to in-progress to resolved, with resolution notes kept alongside — so nothing that needs fixing gets lost.',
  },
];

export default function Home() {
  const isLoggedIn = !!localStorage.getItem('token');

  return (
    <div className="space-background relative min-h-screen overflow-hidden">
      <div className="glow-orb w-[500px] h-[500px] -top-40 -left-40" />
      <div className="glow-orb w-[400px] h-[400px] top-1/3 -right-32" />

      <div className="relative z-10">
        {/* Nav — fixed (not sticky): the space-background wrapper above has
            overflow-hidden for the glow-orb decorations, which silently
            breaks position:sticky (its nearest scrolling ancestor becomes
            that non-scrolling box instead of the viewport). fixed is
            positioned relative to the viewport regardless, so it stays
            pinned in place the whole way down the page. */}
        <div className="fixed top-4 left-0 right-0 z-20 flex justify-center px-4">
          <nav className="pill-nav flex items-center justify-between gap-4 w-full max-w-4xl px-5 py-2.5">
            <Link to="/" className="flex items-center gap-2">
              <img src={logoIcon} alt="Sentira" className="w-6 h-6 rounded-md object-contain" />
              <span className="font-semibold text-sm text-white">sentira</span>
            </Link>
            <div className="flex items-center gap-3">
              <ThemeToggle />
              {isLoggedIn ? (
                <Link to="/dashboard" className="btn-primary text-xs py-2 px-5">
                  Go to Dashboard
                </Link>
              ) : (
                <>
                  <Link to="/login" className="text-xs font-medium text-gray-300 hover:text-white">
                    Log in
                  </Link>
                  <Link to="/register" className="btn-primary text-xs py-2 px-5">
                    Get Started
                  </Link>
                </>
              )}
            </div>
          </nav>
        </div>

        {/* Hero */}
        <div className="max-w-6xl mx-auto px-4 pt-20 pb-16 grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-12 items-center">
          <div>
            <h1 className="text-5xl sm:text-6xl font-bold text-white leading-tight mb-6">
              KNOW HOW <span className="accent-italic text-accent-light">customers</span> FEEL
            </h1>
            <p className="text-gray-400 text-base leading-relaxed mb-8 max-w-md">
              Instantly decode the sentiment behind any text.
              <br />
              Gain deeper understanding of your audience's feelings.
            </p>
            {!isLoggedIn && (
              <div className="flex items-center gap-4">
                <Link
                  to="/register"
                  className="btn-primary inline-flex items-center gap-2 py-3 px-7 rounded-full font-medium"
                >
                  Get Started
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </Link>
              </div>
            )}
          </div>

          {/* Hero image */}
          <div className="lg:ml-auto">
            <img
              src={sentimentHuman}
              alt="Illustration of a human head surrounded by detected emotions"
              className="w-full max-w-md rounded-2xl shadow-card"
            />
          </div>
        </div>

        {/* Feature row */}
        <div className="max-w-6xl mx-auto px-4 pb-24">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {FEATURES.map((f) => (
              <div key={f.title} className="group flex items-start gap-3 cursor-default">
                <div className="icon-circle shrink-0">{f.icon}</div>
                <div>
                  <p className="font-semibold text-white text-sm">{f.title}</p>
                  <p className="text-gray-500 text-xs mt-1">{f.description}</p>
                  <p className="text-gray-500 text-xs mt-1.5 max-h-0 opacity-0 overflow-hidden transition-all duration-300 ease-out group-hover:max-h-24 group-hover:opacity-100">
                    {f.detail}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
