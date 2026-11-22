'use client';

import { useState } from 'react';
import CurvedInput from './CurvedInput';
import { Reveal } from './Reveal';
import { ProjectLabel } from './SiteNavigation';

export function NewsletterSection({ compact = false }: { compact?: boolean }) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleSubscribe = async (submittedValue: string) => {
    const trimmed = (submittedValue || email).trim().toLowerCase();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setStatus('error');
      setMessage('Please enter a valid email address.');
      return;
    }

    setStatus('loading');
    setMessage('');

    try {
      const res = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmed, source: 'frontend' }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Subscription failed.');
      }

      setStatus('success');
      setMessage(data.message || 'You are subscribed! New articles will arrive directly in your inbox.');
      setEmail('');
    } catch (err) {
      setStatus('error');
      setMessage(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    }
  };

  return (
    <div
      className={`w-full max-w-[calc(1512px+clamp(24px,6.4vw,105px)*2)] mx-auto px-[clamp(24px,6.4vw,105px)] max-sm:px-6 ${
        compact ? 'py-12' : 'pt-14 pb-20 max-sm:pt-8 max-sm:pb-12'
      }`}
    >
      <Reveal>
        <div className="relative overflow-hidden rounded-3xl border border-white/13 bg-[#11100f] p-8 sm:p-12 lg:p-14 shadow-[0_24px_80px_rgba(0,0,0,0.65)]">
          {/* Warm ambient glow */}
          <div
            className="pointer-events-none absolute -top-24 -right-24 h-80 w-80 rounded-full bg-[radial-gradient(circle,rgba(243,109,69,0.18),transparent_70%)]"
            aria-hidden="true"
          />
          <div
            className="pointer-events-none absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(180,213,121,0.08),transparent_70%)]"
            aria-hidden="true"
          />

          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-[1.05fr_0.95fr] items-center gap-8 lg:gap-12">
            <div>
              <ProjectLabel>NEWSLETTER DISPATCH</ProjectLabel>
              <h3 className="mt-4 text-[clamp(28px,3.6vw,48px)] font-medium leading-[0.98] tracking-[-0.06em] text-paper">
                Get new engineering notes{' '}
                <span className="text-[#8e8883]">
                  in your inbox<span className="text-ember-soft">.</span>
                </span>
              </h3>
              <p className="mt-3.5 max-w-[460px] text-[#aaa39e] text-xs sm:text-[13px] leading-[1.75]">
                Deep dives on frontend architecture, financial tooling, TypeScript patterns, and product engineering—sent
                whenever a new article ships. No spam, unsubscribe anytime.
              </p>
            </div>

            <div className="flex flex-col items-center lg:items-end justify-center w-full">
              <div className="w-full max-w-[480px]">
                <CurvedInput
                  value={email}
                  onChange={(val) => {
                    setEmail(val);
                    if (status !== 'idle') {
                      setStatus('idle');
                      setMessage('');
                    }
                  }}
                  onSubmit={handleSubscribe}
                  placeholder="you@domain.com"
                  buttonText={status === 'loading' ? 'Joining…' : 'Subscribe'}
                  type="email"
                  theme="dark"
                  bend={22}
                  height={62}
                  width="100%"
                  cornerRadius={18}
                  borderWidth={1.5}
                  fontSize={15}
                  backgroundColor="#181512"
                  textColor="#eeeae5"
                  placeholderColor="#7f7872"
                  borderColor="#332b26"
                  buttonColor="#f36d45"
                  buttonTextColor="#0b0b0b"
                  shadowSize="md"
                  disabled={status === 'loading'}
                  ariaLabel="Email address for newsletter subscription"
                />

                {message && (
                  <div
                    role="status"
                    className={`mt-3 text-center lg:text-right font-mono text-[10px] tracking-[0.04em] ${
                      status === 'success' ? 'text-[#b4d579]' : 'text-red-400'
                    }`}
                  >
                    {status === 'success' ? '✓ ' : '⚠ '}
                    {message}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </Reveal>
    </div>
  );
}

