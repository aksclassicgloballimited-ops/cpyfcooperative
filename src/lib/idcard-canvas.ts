import QRCode from "qrcode";

export type CardRenderData = {
  fullName: string;
  membershipNo: string;
  address: string;
  phone: string;
  nomineePhone: string;
  passportPhoto: string;
  status: "ACTIVE" | "EXPIRED" | "SUSPENDED" | "REVOKED";
  issueDate: string;
  expiryDate: string;
  verifyToken: string;
};

// CR80 card (85.6 x 54 mm) at 300 dpi.
export const CARD_W = 1012;
export const CARD_H = 638;
const PURPLE = "#6A11CB";
const DARK = "#4C1D95";
const YELLOW = "#FACC15";
const FONT = "Arial, Helvetica, sans-serif";

const fmt = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });

function loadImage(src: string) {
  return new Promise<HTMLImageElement | null>((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function wrap(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number, maxLines: number) {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) { lines.push(line); line = word; } else line = test;
  }
  if (line) lines.push(line);
  if (lines.length > maxLines) {
    lines.length = maxLines;
    let last = lines[maxLines - 1];
    while (ctx.measureText(`${last}…`).width > maxWidth && last.length > 1) last = last.slice(0, -1);
    lines[maxLines - 1] = `${last}…`;
  }
  lines.forEach((l, i) => ctx.fillText(l, x, y + i * lineHeight));
  return y + lines.length * lineHeight;
}

function fitText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, startSize: number, weight: string) {
  let size = startSize;
  do { ctx.font = `${weight} ${size}px ${FONT}`; size -= 2; } while (ctx.measureText(text).width > maxWidth && size > 18);
}

function newCanvas() {
  const canvas = document.createElement("canvas");
  canvas.width = CARD_W;
  canvas.height = CARD_H;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, CARD_W, CARD_H);
  return { canvas, ctx };
}

function header(ctx: CanvasRenderingContext2D, logo: HTMLImageElement | null, height: number, subtitle: string) {
  const gradient = ctx.createLinearGradient(0, 0, CARD_W, 0);
  gradient.addColorStop(0, DARK);
  gradient.addColorStop(1, PURPLE);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, CARD_W, height);
  const logoSize = height - 32;
  if (logo) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(24 + logoSize / 2, height / 2, logoSize / 2, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(logo, 24, 16, logoSize, logoSize);
    ctx.restore();
  }
  const x = 24 + logoSize + 22;
  ctx.fillStyle = "#ffffff";
  ctx.textBaseline = "alphabetic";
  ctx.font = `bold 34px ${FONT}`;
  ctx.fillText("CIRCLE OF PROSPEROUS YOUTH", x, height / 2 - 6);
  ctx.fillStyle = YELLOW;
  ctx.font = `bold 28px ${FONT}`;
  ctx.fillText("INTEREST-FREE COOPERATIVE SOCIETY", x, height / 2 + 28);
  ctx.fillStyle = "#e9d5ff";
  ctx.font = `bold 20px ${FONT}`;
  ctx.fillText(subtitle, x, height / 2 + 58);
}

export async function renderCardSides(data: CardRenderData, origin: string) {
  const [logo, photo, qrImage] = await Promise.all([
    loadImage("/cpyf-logo.jpeg"),
    data.passportPhoto ? loadImage(data.passportPhoto) : Promise.resolve(null),
    QRCode.toDataURL(`${origin}/verify/card/${data.verifyToken}`, { margin: 1, width: 360, errorCorrectionLevel: "M", color: { dark: "#1d1731", light: "#ffffff" } }).then(loadImage),
  ]);

  // FRONT
  const front = newCanvas();
  const f = front.ctx;
  header(f, logo, 150, "MEMBERSHIP ID CARD");
  f.fillStyle = "#f5f3ff";
  f.fillRect(0, 150, CARD_W, CARD_H - 150);
  const px = 40, py = 182, pw = 232, ph = 290;
  f.fillStyle = "#ffffff";
  roundRect(f, px - 6, py - 6, pw + 12, ph + 12, 18);
  f.fill();
  f.save();
  roundRect(f, px, py, pw, ph, 14);
  f.clip();
  if (photo) {
    // cover-fit the passport photo
    const scale = Math.max(pw / photo.width, ph / photo.height);
    const w = photo.width * scale, h = photo.height * scale;
    f.drawImage(photo, px + (pw - w) / 2, py + (ph - h) / 2, w, h);
  } else {
    f.fillStyle = "#ddd6fe";
    f.fillRect(px, py, pw, ph);
  }
  f.restore();
  f.strokeStyle = PURPLE;
  f.lineWidth = 4;
  roundRect(f, px - 6, py - 6, pw + 12, ph + 12, 18);
  f.stroke();

  const tx = 312, tw = CARD_W - tx - 36;
  f.fillStyle = PURPLE;
  f.font = `bold 20px ${FONT}`;
  f.fillText("FULL NAME", tx, 196);
  f.fillStyle = "#1d1731";
  fitText(f, data.fullName.toUpperCase(), tw, 44, "bold");
  f.fillText(data.fullName.toUpperCase(), tx, 240);
  f.fillStyle = PURPLE;
  f.font = `bold 20px ${FONT}`;
  f.fillText("MEMBERSHIP ID", tx, 286);
  f.fillStyle = DARK;
  fitText(f, data.membershipNo, tw, 40, "bold");
  f.fillText(data.membershipNo, tx, 328);
  f.fillStyle = PURPLE;
  f.font = `bold 20px ${FONT}`;
  f.fillText("PHONE", tx, 374);
  f.fillStyle = "#1d1731";
  f.font = `bold 30px ${FONT}`;
  f.fillText(data.phone, tx, 408);
  f.fillStyle = PURPLE;
  f.font = `bold 20px ${FONT}`;
  f.fillText("ADDRESS", tx, 448);
  f.fillStyle = "#1d1731";
  f.font = `26px ${FONT}`;
  wrap(f, data.address, tx, 480, tw, 32, 2);

  // footer strip with dates
  f.fillStyle = DARK;
  f.fillRect(0, CARD_H - 92, CARD_W, 92);
  f.fillStyle = "#e9d5ff";
  f.font = `bold 18px ${FONT}`;
  f.fillText("ISSUED", 40, CARD_H - 58);
  f.fillText("EXPIRES", 300, CARD_H - 58);
  f.fillStyle = "#ffffff";
  f.font = `bold 30px ${FONT}`;
  f.fillText(fmt(data.issueDate), 40, CARD_H - 22);
  f.fillStyle = YELLOW;
  f.font = `bold 34px ${FONT}`;
  f.fillText(fmt(data.expiryDate), 300, CARD_H - 20);
  const badge = data.status === "ACTIVE" ? { text: "ACTIVE", bg: "#16a34a" } : data.status === "EXPIRED" ? { text: "EXPIRED", bg: "#d97706" } : data.status === "SUSPENDED" ? { text: "SUSPENDED", bg: "#ea580c" } : { text: "REVOKED", bg: "#dc2626" };
  f.font = `bold 26px ${FONT}`;
  const bw = f.measureText(badge.text).width + 44;
  f.fillStyle = badge.bg;
  roundRect(f, CARD_W - bw - 36, CARD_H - 70, bw, 48, 24);
  f.fill();
  f.fillStyle = "#ffffff";
  f.fillText(badge.text, CARD_W - bw - 14, CARD_H - 36);

  // BACK
  const back = newCanvas();
  const b = back.ctx;
  b.fillStyle = "#f5f3ff";
  b.fillRect(0, 0, CARD_W, CARD_H);
  header(b, logo, 120, "OFFICIAL MEMBER IDENTIFICATION");
  const qs = 330, qx = CARD_W - qs - 56, qy = 160;
  b.fillStyle = "#ffffff";
  roundRect(b, qx - 14, qy - 14, qs + 28, qs + 28, 18);
  b.fill();
  b.strokeStyle = PURPLE;
  b.lineWidth = 4;
  b.stroke();
  if (qrImage) b.drawImage(qrImage, qx, qy, qs, qs);
  b.textAlign = "center";
  b.fillStyle = DARK;
  b.font = `bold 24px ${FONT}`;
  b.fillText("SCAN TO VERIFY", qx + qs / 2, qy + qs + 50);
  b.fillStyle = data.status === "ACTIVE" ? "#16a34a" : "#dc2626";
  b.font = `bold 26px ${FONT}`;
  b.fillText(data.status === "ACTIVE" ? "VERIFIED MEMBER" : data.status, qx + qs / 2, qy + qs + 86);
  b.textAlign = "left";

  const bx = 48;
  b.fillStyle = PURPLE;
  b.font = `bold 20px ${FONT}`;
  b.fillText("NEXT OF KIN PHONE", bx, 180);
  b.fillStyle = "#1d1731";
  b.font = `bold 32px ${FONT}`;
  b.fillText(data.nomineePhone, bx, 220);
  b.fillStyle = PURPLE;
  b.font = `bold 20px ${FONT}`;
  b.fillText("MEMBERSHIP ID", bx, 282);
  b.fillStyle = DARK;
  b.font = `bold 32px ${FONT}`;
  b.fillText(data.membershipNo, bx, 322);
  b.fillStyle = PURPLE;
  b.font = `bold 20px ${FONT}`;
  b.fillText("VALID UNTIL", bx, 384);
  b.fillStyle = "#1d1731";
  b.font = `bold 32px ${FONT}`;
  b.fillText(fmt(data.expiryDate), bx, 424);
  b.fillStyle = "#475569";
  b.font = `22px ${FONT}`;
  wrap(b, "This card remains the property of CPYIF Interest-Free Cooperative Society and is not transferable. If found, please return it to the cooperative office.", bx, 490, 520, 30, 4);
  b.fillStyle = DARK;
  b.fillRect(0, CARD_H - 44, CARD_W, 44);
  b.fillStyle = "#e9d5ff";
  b.font = `bold 18px ${FONT}`;
  b.textAlign = "center";
  b.fillText("CIRCLE OF PROSPEROUS YOUTH INTEREST-FREE COOPERATIVE", CARD_W / 2, CARD_H - 15);
  b.textAlign = "left";
  return { front: front.canvas, back: back.canvas };
}

const toJpeg = (canvas: HTMLCanvasElement) => new Promise<Blob>((resolve, reject) => canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Unable to export card"))), "image/jpeg", 0.95));

export async function buildCombinedJpeg(front: HTMLCanvasElement, back: HTMLCanvasElement) {
  const gap = 40;
  const canvas = document.createElement("canvas");
  canvas.width = CARD_W + gap * 2;
  canvas.height = CARD_H * 2 + gap * 3;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(front, gap, gap);
  ctx.drawImage(back, gap, gap * 2 + CARD_H);
  return toJpeg(canvas);
}

// Minimal PDF writer: one A4 page with both card sides placed at their real size (85.6 x 54 mm).
export async function buildPdf(front: HTMLCanvasElement, back: HTMLCanvasElement) {
  const images = await Promise.all([front, back].map(async (canvas) => new Uint8Array(await (await toJpeg(canvas)).arrayBuffer())));
  const enc = new TextEncoder();
  const chunks: Uint8Array[] = [];
  const offsets: number[] = [];
  let length = 0;
  const push = (value: Uint8Array | string) => { const bytes = typeof value === "string" ? enc.encode(value) : value; chunks.push(bytes); length += bytes.length; };
  const object = (n: number, body: () => void) => { offsets[n] = length; push(`${n} 0 obj\n`); body(); push("\nendobj\n"); };
  const w = 242.65, h = 153.07, x = (595.28 - w) / 2;
  const content = `q ${w} 0 0 ${h} ${x.toFixed(2)} 600 cm /Im1 Do Q\nq ${w} 0 0 ${h} ${x.toFixed(2)} 400 cm /Im2 Do Q\n`;
  push("%PDF-1.4\n");
  object(1, () => push("<< /Type /Catalog /Pages 2 0 R >>"));
  object(2, () => push("<< /Type /Pages /Kids [3 0 R] /Count 1 >>"));
  object(3, () => push("<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Resources << /XObject << /Im1 5 0 R /Im2 6 0 R >> >> /Contents 4 0 R >>"));
  object(4, () => push(`<< /Length ${content.length} >>\nstream\n${content}endstream`));
  images.forEach((bytes, i) => object(5 + i, () => {
    push(`<< /Type /XObject /Subtype /Image /Width ${CARD_W} /Height ${CARD_H} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${bytes.length} >>\nstream\n`);
    push(bytes);
    push("\nendstream");
  }));
  const xref = length;
  push(`xref\n0 7\n0000000000 65535 f \n${offsets.slice(1).map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("")}`);
  push(`trailer\n<< /Size 7 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`);
  return new Blob(chunks as BlobPart[], { type: "application/pdf" });
}

export function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

export function printCard(front: HTMLCanvasElement, back: HTMLCanvasElement) {
  const win = window.open("", "_blank", "width=900,height=700");
  if (!win) return false;
  win.document.write(`<!doctype html><title>CPYIF ID Card</title><style>@page{size:A4;margin:15mm}body{margin:0;font-family:Arial}img{display:block;width:85.6mm;height:54mm;margin:0 auto 12mm}</style><img src="${front.toDataURL("image/jpeg", 0.95)}"><img src="${back.toDataURL("image/jpeg", 0.95)}">`);
  win.document.close();
  win.onload = () => { win.focus(); win.print(); };
  return true;
}
