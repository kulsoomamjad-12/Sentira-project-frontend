import React, { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { registerUser } from '../services/api';
import logoIcon from '../assets/logos/logo-icon.png';

export default function Register() {
  const [searchParams] = useSearchParams();
  const inviteFromLink = searchParams.get('invite') || '';

  // Arriving via a shared company invite link means you're joining an
  // existing company, not starting a new one — default to Member in that
  // case instead of the plain page's default of Admin.
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: inviteFromLink ? 'member' : 'admin',
    inviteCode: inviteFromLink,
  });
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  // The pasted value might be the bare code or the full shared link
  // (".../register?invite=<code>") — pull just the code out either way.
  const extractInviteCode = (value) => {
    const trimmed = value.trim();
    try {
      const url = new URL(trimmed);
      return url.searchParams.get('invite') || trimmed;
    } catch {
      return trimmed;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const payload = { name: form.name, email: form.email, password: form.password, role: form.role };
      if (form.role === 'admin') {
        payload.companyName = `${form.name}'s Workspace`;
      } else {
        payload.inviteCode = extractInviteCode(form.inviteCode);
      }
      const res = await registerUser(payload);
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    }
  };

  return (
    <div className="space-background-2 relative min-h-screen flex items-center justify-center overflow-hidden px-6 py-10 sm:px-10">
      {/* Background glow effects */}
      <div className="glow-orb w-[500px] h-[500px] -top-40 -right-40" />
      <div className="glow-orb w-[400px] h-[400px] -bottom-40 -left-32" />

      {/* Main split container */}
      <div className="auth-card relative z-10 w-full max-w-2xl grid grid-cols-1 md:grid-cols-2 shadow-2xl rounded-2xl overflow-hidden border border-white/10">

        {/* Left Side: Branding & Info */}
        <div className="auth-card-panel p-5 md:p-7 flex flex-col justify-between relative border-b md:border-b-0 md:border-r border-white/10">
          <div className="flex items-center gap-2">
            <img src={logoIcon} alt="Sentira" className="w-7 h-7 rounded-md object-contain" />
            <span className="font-semibold text-white tracking-wide">sentira</span>
          </div>

          <div className="my-auto py-6">
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">Create your account</h1>
            <p className="text-sm text-gray-300 leading-relaxed">
              Sign up and start <span className="accent-italic text-accent-light">tracking customer sentiment</span> in minutes.
            </p>
          </div>

          <div className="text-xs text-gray-400">
            © {new Date().getFullYear()} Sentira. All rights reserved.
          </div>
        </div>

        {/* Right Side: Form & Actions */}
        <div className="auth-card-panel p-5 md:p-7 flex flex-col justify-between relative">
          <div>
            <h2 className="text-2xl font-semibold text-white mb-5">Register</h2>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-medium field-label mb-1">Your Name</label>
                <input
                  name="name"
                  autoComplete="name"
                  placeholder="Jane Doe"
                  value={form.name}
                  onChange={handleChange}
                  required
                  className="auth-input w-full rounded-lg px-4 py-2.5 text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium field-label mb-1">Your Email</label>
                <input
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="name@example.com"
                  value={form.email}
                  onChange={handleChange}
                  required
                  className="auth-input w-full rounded-lg px-4 py-2.5 text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium field-label mb-1">Password</label>
                <input
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={handleChange}
                  required
                  minLength={6}
                  className="auth-input w-full rounded-lg px-4 py-2.5 text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium field-label mb-1">Your Role</label>
                <select
                  name="role"
                  value={form.role}
                  onChange={handleChange}
                  className="auth-input w-full rounded-lg px-4 py-2.5 text-white focus:outline-none"
                >
                  <option value="admin">👑 Company Admin</option>
                  <option value="member">👨‍💼 Team Member / Resolver</option>
                </select>
                <p className="text-[11px] text-gray-500 mt-1">
                  {form.role === 'admin'
                    ? "This creates a new company workspace with you as its first user."
                    : "You're joining an existing company — you'll need the invite link/code from your admin below."}
                </p>
              </div>

              {form.role !== 'admin' && (
                <div>
                  <label className="block text-xs font-medium field-label mb-1">Company Invite Code</label>
                  <input
                    name="inviteCode"
                    placeholder="Paste the code or link your admin sent you"
                    value={form.inviteCode}
                    onChange={handleChange}
                    required
                    className="auth-input w-full rounded-lg px-4 py-2.5 text-white focus:outline-none"
                  />
                  <p className="text-[11px] text-gray-500 mt-1">
                    Every teammate at the same company uses this same code — ask your admin for it if you don't have
                    it (Team page → Company invite link).
                  </p>
                </div>
              )}

              {error && <p className="text-red-400 text-sm">{error}</p>}

              <button type="submit" className="btn-primary w-full py-3 rounded-lg font-medium transition-all mt-2">
                Register
              </button>
            </form>
          </div>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-300">
              Already have an account?{' '}
              <Link to="/login" className="text-accent-light font-medium hover:underline">
                Log in
              </Link>
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
