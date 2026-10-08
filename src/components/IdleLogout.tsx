'use client';

import { useEffect } from 'react';

const ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'click'] as const;
const RENEW_EVERY_MS = 60 * 1000;

// Renews the session while the user is active and logs them out after the role's idle limit.
export default function IdleLogout() {
  useEffect(() => {
    let idleSeconds = 0;
    let isStaff = false;
    let lastActivity = Date.now();
    let lastRenew = 0;
    let started = false;
    let ticker: ReturnType<typeof setInterval> | undefined;
    let cancelled = false;

    const logout = async () => {
      if (ticker) clearInterval(ticker);
      ticker = undefined;
      started = false;
      await fetch('/api/auth/logout', { method: 'POST' }).catch(() => undefined);
      window.location.href = isStaff ? '/check/verify/admin_login?expired=1' : '/?expired=1#portal';
    };

    const renew = async () => {
      lastRenew = Date.now();
      const response = await fetch('/api/auth/refresh', { method: 'POST', cache: 'no-store' }).catch(() => null);
      if (cancelled || !response) return;
      if (response.status === 401) {
        // Visitor who is not logged in, or a session that already expired.
        if (started) logout();
        return;
      }
      const data = await response.json();
      idleSeconds = data.idleSeconds;
      isStaff = data.role !== 'MEMBER';
      started = true;
      if (!ticker) {
        ticker = setInterval(() => {
          if (Date.now() - lastActivity >= idleSeconds * 1000) logout();
        }, 5000);
      }
    };

    const onActivity = () => {
      lastActivity = Date.now();
      // Also picks up a login that happened after this page loaded.
      if (Date.now() - lastRenew > RENEW_EVERY_MS) renew();
    };

    renew();
    ACTIVITY_EVENTS.forEach((name) => window.addEventListener(name, onActivity, { passive: true }));
    return () => {
      cancelled = true;
      if (ticker) clearInterval(ticker);
      ACTIVITY_EVENTS.forEach((name) => window.removeEventListener(name, onActivity));
    };
  }, []);

  return null;
}