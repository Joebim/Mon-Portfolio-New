'use client';

const EVENT_NAME = 'admin:data-updated';
const CHANNEL_NAME = 'admin-realtime';

/**
 * Broadcasts a lightweight signal so the Admin Dashboard and Automation views
 * refresh silently in real time after any mutation, across components and tabs.
 */
export function notifyAdminDataUpdated(source = 'admin') {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: { source, at: Date.now() } }));
  if ('BroadcastChannel' in window) {
    try {
      const channel = new BroadcastChannel(CHANNEL_NAME);
      channel.postMessage({ source, at: Date.now() });
      channel.close();
    } catch {
      // Ignore BroadcastChannel errors in restricted contexts
    }
  }
}

/**
 * Subscribes to real-time admin data update signals. Returns an unsubscribe cleanup.
 */
export function subscribeAdminDataUpdated(onUpdate: () => void): () => void {
  if (typeof window === 'undefined') return () => {};

  const handleWindowEvent = () => onUpdate();
  window.addEventListener(EVENT_NAME, handleWindowEvent);

  let channel: BroadcastChannel | null = null;
  if ('BroadcastChannel' in window) {
    try {
      channel = new BroadcastChannel(CHANNEL_NAME);
      channel.onmessage = () => onUpdate();
    } catch {
      channel = null;
    }
  }

  return () => {
    window.removeEventListener(EVENT_NAME, handleWindowEvent);
    if (channel) {
      channel.close();
    }
  };
}
