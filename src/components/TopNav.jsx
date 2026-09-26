import React, { useEffect, useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import logoIcon from '../assets/logos/logo-icon.png';
import NotificationBell from './NotificationBell';

const NAV_LINKS = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/dashboard/forms', label: 'Forms' },
  { to: '/dashboard/action-center', label: 'Action Center' },
  { to: '/dashboard/log-feedback', label: 'Log Feedback' },
];

export default function TopNav() {
  const location = useLocation();
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  const initial = user?.name?.trim()?.[0]?.toUpperCase() || '?';
  const navLinks = user?.role === 'admin' ? [...NAV_LINKS, { to: '/dashboard/team', label: 'Team' }] : NAV_LINKS;

  const [mobileOpen, setMobileOpen] = useState(false);

  // Below md, links live in this dropdown instead of the pill — close it
  // whenever the route changes so it doesn't stay open after navigating.
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  return (
    <div className="fixed top-4 left-0 right-0 z-20 flex justify-center px-4">
      <div className="w-full max-w-4xl">
        <nav className="pill-nav flex items-center justify-between gap-4 px-5 py-2.5">
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <img src={logoIcon} alt="Sentira" className="w-6 h-6 rounded-md object-contain" />
            <span className="font-semibold text-sm text-white">sentira</span>
          </Link>
          <div className="hidden md:flex items-center gap-5 text-xs font-medium">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={location.pathname === link.to ? 'text-white' : 'text-gray-400 hover:text-gray-200'}
              >
                {link.label}
              </Link>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <NotificationBell />
            <Link
              to="/dashboard/account"
              title="Account settings"
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold text-white bg-gradient-to-br from-accent-light to-accent shrink-0 ${
                location.pathname === '/dashboard/account' ? 'ring-2 ring-accent-light' : ''
              }`}
            >
              {initial}
            </Link>
            <button
              onClick={() => setMobileOpen((prev) => !prev)}
              aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileOpen}
              className="md:hidden w-8 h-8 flex items-center justify-center rounded-full bg-white/5 border border-base-border hover:bg-white/10 shrink-0"
            >
              {mobileOpen ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 6h18M3 12h18M3 18h18" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </button>
          </div>
        </nav>

        {mobileOpen && (
          <div className="panel-card md:hidden mt-2 p-2 flex flex-col">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`px-4 py-2.5 rounded-xl text-sm font-medium ${
                  location.pathname === link.to ? 'text-white bg-white/5' : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
