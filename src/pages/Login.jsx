import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { loginUser } from '../services/api';
import logoIcon from '../assets/logos/logo-icon.png';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const res = await loginUser({ email, password });
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    }
  };

  return (
    <div className="space-background relative min-h-screen flex items-center justify-center overflow-hidden px-6 py-10 sm:px-10">
      {/* Background glow effects */}
      <div className="glow-orb w-[500px] h-[500px] -top-40 -left-40" />
      <div className="glow-orb w-[400px] h-[400px] -bottom-40 -right-32" />

      {/* Main split container */}
      <div className="auth-card relative z-10 w-full max-w-3xl grid grid-cols-1 md:grid-cols-2 shadow-2xl rounded-2xl overflow-hidden border border-white/10">

        {/* Left Side: Branding & Info */}
        <div className="auth-card-panel p-6 md:p-8 flex flex-col justify-between relative border-b md:border-b-0 md:border-r border-white/10">
          <div className="flex items-center gap-2">
            <img src={logoIcon} alt="Sentira" className="w-7 h-7 rounded-md object-contain" />
            <span className="font-semibold text-white tracking-wide">sentira</span>
          </div>

          <div className="my-auto py-8">
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">Let's Get Started</h1>
            <p className="text-sm text-gray-300 leading-relaxed">
              Log in to access your dashboard, monitor sentiment analytics, and manage your account seamlessly.
            </p>
          </div>

          <div className="text-xs text-gray-400">
            © {new Date().getFullYear()} Sentira. All rights reserved.
          </div>
        </div>

        {/* Right Side: Form & Actions */}
        <div className="auth-card-panel p-6 md:p-8 flex flex-col justify-between relative">
          <div>
            <h2 className="text-2xl font-semibold text-white mb-6">Log in</h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium field-label mb-1">Your Email</label>
                <input
                  type="email"
                  autoComplete="username"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="auth-input w-full rounded-lg px-4 py-2.5 text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium field-label mb-1">Password</label>
                <input
                  type="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="auth-input w-full rounded-lg px-4 py-2.5 text-white focus:outline-none"
                />
              </div>

              {error && <p className="text-red-400 text-sm">{error}</p>}

              <button type="submit" className="btn-primary w-full py-3 rounded-lg font-medium transition-all mt-2">
                Log in
              </button>
            </form>
          </div>

          <div className="mt-8 text-center">
            <p className="text-sm text-gray-300">
              No account?{' '}
              <Link to="/register" className="text-accent-light font-medium hover:underline">
                Register
              </Link>
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}