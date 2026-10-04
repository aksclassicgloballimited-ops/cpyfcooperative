'use client';

import { useEffect, useState } from 'react';

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

export default function PwaSetup() {
  const [installEvent, setInstallEvent] = useState<InstallEvent | null>(null);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      navigator.serviceWorker.register('/sw.js').catch(() => undefined);
    }
    setDismissed(localStorage.getItem('cpyif_install_dismissed') === '1');
    const handler = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as InstallEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  if (!installEvent || dismissed) return null;

  return (
    <div className="fixed inset-x-3 bottom-3 z-[60] flex items-center gap-3 rounded-2xl bg-[#1d1234] p-3 text-white shadow-2xl sm:left-auto sm:max-w-sm">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/icons/icon-192.png" alt="" className="h-10 w-10 rounded-full" />
      <p className="flex-1 text-sm font-semibold">Install the CPYIF app on your phone</p>
      <button
        type="button"
        onClick={async () => { await installEvent.prompt(); setInstallEvent(null); }}
        className="rounded-full bg-[#FACC15] px-4 py-1.5 text-sm font-bold text-[#1d1731]"
      >
        Install
      </button>
      <button
        type="button"
        aria-label="Dismiss"
        onClick={() => { localStorage.setItem('cpyif_install_dismissed', '1'); setDismissed(true); }}
        className="px-1 text-lg leading-none text-white/70"
      >
        &times;
      </button>
    </div>
  );
}
