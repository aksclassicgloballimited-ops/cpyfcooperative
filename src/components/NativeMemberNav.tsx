'use client';

import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

async function saveDeviceToken(token: string) {
  const response = await fetch('/api/mobile/push', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, platform: Capacitor.getPlatform() }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Unable to enable notifications');
  localStorage.setItem('cpyif_push_token', token);
}

export async function disableMobilePush() {
  if (!Capacitor.isNativePlatform()) return;
  const token = localStorage.getItem('cpyif_push_token');
  try {
    if (token) {
      const response = await fetch('/api/mobile/push', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      if (!response.ok) throw new Error('Unable to unregister this device from CPYIF push notifications');
    }
  } catch (error) {
    console.error('Unable to unregister this device from CPYIF push notifications.', error);
  } finally {
    try {
      await PushNotifications.unregister();
    } catch (error) {
      console.error('Unable to unregister native push notifications.', error);
    }
    localStorage.removeItem('cpyif_push_token');
  }
}

async function registerDeviceForPush() {
  let registrationListener: { remove: () => Promise<void> } | undefined;
  let errorListener: { remove: () => Promise<void> } | undefined;
  let timeout: ReturnType<typeof setTimeout> | undefined;
  let resolveToken!: (token: string) => void;
  let rejectToken!: (error: Error) => void;
  const token = new Promise<string>((resolve, reject) => {
    resolveToken = resolve;
    rejectToken = reject;
  });
  try {
    if (Capacitor.getPlatform() === 'android') {
      await PushNotifications.createChannel({
        id: 'cpyif_updates',
        name: 'CPYIF updates',
        description: 'Savings, shares and membership updates',
        importance: 4,
        visibility: 1,
        sound: 'default',
        vibration: true,
      });
    }
    registrationListener = await PushNotifications.addListener('registration', (event) => resolveToken(event.value));
    errorListener = await PushNotifications.addListener('registrationError', (event) => rejectToken(new Error(event.error)));
    timeout = setTimeout(() => rejectToken(new Error('Push registration timed out. Please try again.')), 20000);
    await PushNotifications.register();
    await saveDeviceToken(await token);
  } finally {
    if (timeout) clearTimeout(timeout);
    registrationListener?.remove().catch((error) => console.error('Unable to remove push registration listener.', error));
    errorListener?.remove().catch((error) => console.error('Unable to remove push error listener.', error));
  }
}

export default function NativeMemberNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [isMember, setIsMember] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushMessage, setPushMessage] = useState('');

  useEffect(() => {
    if (!Capacitor.isNativePlatform() || !pathname.startsWith('/member')) {
      setIsMember(false);
      return;
    }

    let active = true;
    fetch('/api/auth/me', { cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) return null;
        const data = await response.json();
        return data.user?.role === 'MEMBER' ? data.user : null;
      })
      .then((user) => {
        if (active) setIsMember(Boolean(user));
      })
      .catch((error) => {
        console.error('Unable to check member session for mobile navigation.', error);
        if (active) setIsMember(false);
      });

    return () => {
      active = false;
    };
  }, [pathname]);

  useEffect(() => {
    if (!isMember || !Capacitor.isNativePlatform()) return;

    let active = true;
    let actionListener: { remove: () => Promise<void> } | undefined;
    document.body.style.paddingBottom = 'calc(4.5rem + env(safe-area-inset-bottom))';
    PushNotifications.addListener('pushNotificationActionPerformed', (event) => {
      const data = event.notification.data;
      const target = typeof data === 'object' && data !== null && 'path' in data ? data.path : undefined;
      if (typeof target === 'string' && target.startsWith('/') && !target.startsWith('//')) {
        router.push(target);
      }
    })
      .then((listener) => {
        actionListener = listener;
      })
      .catch((error) => console.error('Unable to listen for push notification actions.', error));

    PushNotifications.checkPermissions()
      .then((permission) => {
        if (permission.receive === 'granted') {
          registerDeviceForPush()
            .then(() => {
              if (active) setPushEnabled(true);
            })
            .catch((error) => {
              console.error('Unable to restore CPYIF push registration.', error);
              if (active) setPushMessage('Unable to connect this device to notifications. Tap Enable to retry.');
            });
        }
      })
      .catch((error) => console.error('Unable to check push notification permission.', error));

    return () => {
      active = false;
      document.body.style.paddingBottom = '';
      actionListener?.remove().catch((error) => console.error('Unable to remove push notification listener.', error));
    };
  }, [isMember, router]);

  const enablePush = async () => {
    setPushMessage('');
    try {
      let permission = await PushNotifications.checkPermissions();
      if (permission.receive !== 'granted') permission = await PushNotifications.requestPermissions();
      if (permission.receive !== 'granted') {
        setPushMessage('Notification permission was not granted. You can enable it in your phone settings.');
        return;
      }
      await registerDeviceForPush();
      setPushEnabled(true);
      setPushMessage('Push notifications are enabled on this device.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to enable notifications';
      setPushMessage(message);
      console.error('Unable to register CPYIF mobile push notifications.', error);
    }
  };

  if (!isMember) return null;

  const tabs = [
    { label: 'Home', href: '/member' },
    { label: 'Savings', href: '/member/savings' },
    { label: 'Shares', href: '/member/shares' },
    { label: 'Alerts', href: '/member/notifications' },
  ];

  return (
    <>
      {!pushEnabled && (
        <div className="fixed inset-x-3 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-[60] rounded-2xl bg-[#1d1234] p-4 text-white shadow-xl">
          <p className="text-sm font-bold">Stay updated with CPYIF</p>
          <p className="mt-1 text-xs text-violet-100">Allow notifications for savings, share and membership updates.</p>
          <button type="button" onClick={enablePush} className="mt-3 rounded-full bg-[#FACC15] px-4 py-2 text-sm font-bold text-[#1d1731]">
            Enable notifications
          </button>
          {pushMessage && <p role="status" className="mt-2 text-xs">{pushMessage}</p>}
        </div>
      )}
      {pushEnabled && pushMessage && (
        <p role="status" className="fixed inset-x-3 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-[60] rounded-xl bg-emerald-800 px-4 py-3 text-sm text-white shadow-lg">
          {pushMessage}
        </p>
      )}
      <nav aria-label="Member app navigation" className="fixed inset-x-0 bottom-0 z-50 border-t border-violet-200 bg-white/95 px-2 pb-[env(safe-area-inset-bottom)] pt-2 shadow-[0_-8px_24px_rgba(29,18,52,0.12)] backdrop-blur">
        <div className="mx-auto grid max-w-lg grid-cols-4">
          {tabs.map((tab) => {
            const selected = pathname === tab.href || (tab.href !== '/member' && pathname.startsWith(tab.href));
            return (
              <Link
                key={tab.href}
                href={tab.href}
                aria-current={selected ? 'page' : undefined}
                className={`flex min-h-12 items-center justify-center rounded-xl px-2 text-xs font-bold transition ${selected ? 'bg-violet-100 text-[#6A11CB]' : 'text-slate-600 hover:bg-violet-50'}`}
              >
                {tab.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
