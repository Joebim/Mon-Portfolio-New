'use client';

export const dynamic = 'force-dynamic';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signInWithGoogle, signInWithEmail } from '../../../lib/firebase';
import { Arrow } from '../../../components/SiteNavigation';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const completeServerLogin = async (idToken: string) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Server session creation failed');
    }

    router.push('/admin');
    router.refresh();
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const user = await signInWithEmail(email, password);
      const idToken = await user.getIdToken();
      await completeServerLogin(idToken);
    } catch (err: unknown) {
      console.error('Email sign-in error:', err);
      const msg = err instanceof Error ? err.message : 'Invalid email or password';
      if (msg.includes('user-not-found') || msg.includes('wrong-password') || msg.includes('invalid-credential')) {
        setError('Invalid Firebase email or password');
      } else {
        setError(msg);
      }
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError(null);
    setGoogleLoading(true);

    try {
      const user = await signInWithGoogle();
      const idToken = await user.getIdToken();
      await completeServerLogin(idToken);
    } catch (err: unknown) {
      console.error('Google sign-in error:', err);
      const msg = err instanceof Error ? err.message : 'Google sign-in was cancelled';
      setError(msg);
      setGoogleLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#0B0B0B] text-paper flex flex-col justify-center items-center px-6 py-12">
      <div className="w-full max-w-[420px]">
        {/* Brand */}
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-white/10">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="grid w-8 h-8 place-items-center rounded-lg bg-ember -rotate-6">
              <img
                src="/joseph-logo-light.svg"
                alt="Joseph Logo"
                className="w-5 h-5 object-contain"
              />
            </span>
            <span className="font-mono text-[9px] font-bold tracking-[0.1em]">
              JOSEPH AKINWOLE®
            </span>
          </Link>
          <span className="font-mono text-[8px] text-[#8e8883] tracking-[0.1em]">
            FIREBASE AUTH
          </span>
        </div>

        {/* Card */}
        <div className="border border-white/13 rounded-2xl bg-[#111110] p-8 shadow-2xl">
          <h1 className="text-2xl font-medium tracking-[-0.04em] mb-2">
            Console sign in<span className="text-ember">.</span>
          </h1>
          <p className="text-[#8e8883] text-xs leading-relaxed mb-6 font-mono">
            Authenticate with your Firebase account to manage portfolio content, works, and blogs.
          </p>

          {error && (
            <div className="mb-6 p-3 rounded-lg border border-red-500/30 bg-red-500/10 text-red-300 text-xs font-mono">
              {error}
            </div>
          )}

          {/* Google Sign In Button */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={googleLoading || loading}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-lg bg-[#181614] border border-white/15 text-paper font-mono text-[9px] tracking-[0.08em] hover:bg-white/5 hover:border-white/25 transition-all cursor-pointer disabled:opacity-50"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            {googleLoading ? 'CONNECTING GOOGLE...' : 'SIGN IN WITH GOOGLE'}
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-white/10" />
            <span className="font-mono text-[7px] text-[#6e6760] tracking-[0.1em]">OR WITH EMAIL</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          <form onSubmit={handleEmailLogin} className="space-y-4">
            <div>
              <label className="block font-mono text-[8px] tracking-[0.1em] text-[#a7a09a] uppercase mb-2">
                Firebase Account Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@domain.com"
                className="w-full px-4 py-3 rounded-lg bg-[#181614] border border-white/13 text-paper font-sans text-sm focus:outline-none focus:border-ember transition-colors"
              />
            </div>

            <div>
              <label className="block font-mono text-[8px] tracking-[0.1em] text-[#a7a09a] uppercase mb-2">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 rounded-lg bg-[#181614] border border-white/13 text-paper font-sans text-sm focus:outline-none focus:border-ember transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={loading || googleLoading}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-lg bg-ember text-ink font-mono text-[9px] font-bold tracking-[0.12em] hover:bg-ember-soft transition-colors cursor-pointer disabled:opacity-50 mt-2"
            >
              {loading ? 'AUTHENTICATING...' : 'ENTER CONSOLE'}
              {!loading && <Arrow className="w-3 text-ink" />}
            </button>
          </form>
        </div>

        <div className="mt-8 text-center">
          <Link
            href="/"
            className="text-[#6e6760] hover:text-ember-soft font-mono text-[8px] tracking-[0.1em] transition-colors"
          >
            ← BACK TO PUBLIC PORTFOLIO
          </Link>
        </div>
      </div>
    </main>
  );
}
