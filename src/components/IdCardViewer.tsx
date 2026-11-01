'use client';

import { useEffect, useRef, useState } from 'react';
import { buildCombinedJpeg, buildPdf, printCard, renderCardSides, saveBlob, type CardRenderData } from '@/lib/idcard-canvas';

export default function IdCardViewer({ card, filename }: { card: CardRenderData; filename: string }) {
  const sides = useRef<{ front: HTMLCanvasElement; back: HTMLCanvasElement } | null>(null);
  const [images, setImages] = useState<{ front: string; back: string } | null>(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    let cancelled = false;
    renderCardSides(card, window.location.origin).then((rendered) => {
      if (cancelled) return;
      sides.current = rendered;
      setImages({ front: rendered.front.toDataURL('image/jpeg', 0.92), back: rendered.back.toDataURL('image/jpeg', 0.92) });
    }).catch(() => setMessage('Unable to render the ID card'));
    return () => { cancelled = true; };
  }, [card]);

  const run = async (action: () => Promise<void> | void) => {
    if (!sides.current) return;
    try { setMessage(''); await action(); } catch { setMessage('Action failed. Please try again.'); }
  };

  return (
    <div>
      <div className="grid gap-4 md:grid-cols-2">
        {images ? (<>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={images.front} alt="ID card front" className="w-full rounded-2xl shadow-lg" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={images.back} alt="ID card back" className="w-full rounded-2xl shadow-lg" />
        </>) : <p className="rounded-xl bg-violet-50 p-6 text-sm text-slate-500 md:col-span-2">Preparing card preview...</p>}
      </div>
      <div className="mt-4 flex flex-wrap gap-3">
        <button type="button" disabled={!images} onClick={() => run(async () => saveBlob(await buildPdf(sides.current!.front, sides.current!.back), `${filename}.pdf`))} className="rounded-full bg-[#6A11CB] px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50">Download ID Card (PDF)</button>
        <button type="button" disabled={!images} onClick={() => run(async () => saveBlob(await buildCombinedJpeg(sides.current!.front, sides.current!.back), `${filename}.jpg`))} className="rounded-full border border-[#6A11CB] px-5 py-2.5 text-sm font-bold text-[#6A11CB] disabled:opacity-50">Download (JPEG)</button>
        <button type="button" disabled={!images} onClick={() => run(() => { if (!printCard(sides.current!.front, sides.current!.back)) setMessage('Allow pop-ups to print the card'); })} className="rounded-full border border-violet-300 px-5 py-2.5 text-sm font-bold text-[#4C1D95] disabled:opacity-50">Print ID Card</button>
      </div>
      {message && <p className="mt-3 text-sm font-semibold text-rose-700">{message}</p>}
    </div>
  );
}
