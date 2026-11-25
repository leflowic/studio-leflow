import { useState } from "react";
import { Share2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

// Wordle-style share for "Pogodi Pesmu": a 1080x1920 story image that shows the
// result, listens used and the streak - never the answer, so sharing can't
// spoil the day's song for anyone else. Same Web Share API + download fallback
// as the smart link story generator in pages/l.tsx.

type Props = {
  challengeNumber: number;
  correct: boolean;
  listensUsed: number;   // 1-3
  streak: number;
};

const BG = "#161718";       // anthracite
const OAK = "#c9a27a";
const TEXT = "#f3efe9";
const MUTED = "#9a958e";

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null); // card still works without the logo
    img.src = src;
  });
}

async function drawCard({ challengeNumber, correct, listensUsed, streak }: Props): Promise<Blob> {
  await document.fonts?.ready;
  const logo = await loadImage("/leflow-logo-white.png");
  const W = 1080, H = 1920;
  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  const ctx = c.getContext("2d")!;

  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, W, H);

  // Waveform motif (same bar heights as WaveDivider)
  const bars = [4, 10, 7, 16, 9, 22, 12, 28, 14, 22, 9, 16, 7, 10, 4].map(h => h * 5);
  const barW = 14, gap = 12;
  const totalW = bars.length * barW + (bars.length - 1) * gap;
  let x = (W - totalW) / 2;
  ctx.fillStyle = OAK;
  for (const h of bars) {
    ctx.globalAlpha = 0.55;
    ctx.beginPath();
    (ctx as any).roundRect ? (ctx as any).roundRect(x, 520 - h / 2, barW, h, 7) : ctx.rect(x, 520 - h / 2, barW, h);
    ctx.fill();
    x += barW + gap;
  }
  ctx.globalAlpha = 1;

  ctx.textAlign = "center";
  if (logo) {
    // White logo, same-origin file from client/public, so the canvas isn't tainted
    const lw = 190, lh = (logo.height / logo.width) * lw;
    ctx.drawImage(logo, (W - lw) / 2, 150, lw, lh);
  }
  ctx.fillStyle = MUTED;
  ctx.font = "600 40px Figtree, Inter, sans-serif";
  ctx.fillText("STUDIO LEFLOW", W / 2, logo ? 380 : 300);

  ctx.fillStyle = TEXT;
  ctx.font = "800 110px Figtree, Inter, sans-serif";
  ctx.fillText("Pogodi Pesmu", W / 2, 780);
  ctx.fillStyle = OAK;
  ctx.font = "700 72px Figtree, Inter, sans-serif";
  ctx.fillText(`#${challengeNumber}`, W / 2, 880);

  // Listens used: filled = used
  const dotR = 34, dotGap = 40;
  const dotsW = 3 * dotR * 2 + 2 * dotGap;
  let dx = (W - dotsW) / 2 + dotR;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.arc(dx, 1060, dotR, 0, Math.PI * 2);
    if (i < listensUsed) { ctx.fillStyle = correct ? OAK : "#6b6660"; ctx.fill(); }
    else { ctx.strokeStyle = "#3a3b3e"; ctx.lineWidth = 6; ctx.stroke(); }
    dx += dotR * 2 + dotGap;
  }

  ctx.fillStyle = TEXT;
  ctx.font = "700 76px Figtree, Inter, sans-serif";
  const headline = correct
    ? listensUsed <= 1 ? "Pogođeno iz prvog slušanja" : `Pogođeno posle ${listensUsed} slušanja`
    : "Danas nije pogođeno";
  // Wrap if too wide
  const words = headline.split(" ");
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > W - 160 && line) { lines.push(line); line = w; } else line = test;
  }
  lines.push(line);
  lines.forEach((l, i) => ctx.fillText(l, W / 2, 1240 + i * 92));

  if (streak > 1) {
    ctx.fillStyle = OAK;
    ctx.font = "600 56px Inter, sans-serif";
    ctx.fillText(`Niz: ${streak} dana zaredom`, W / 2, 1240 + lines.length * 92 + 70);
  }

  ctx.fillStyle = MUTED;
  ctx.font = "500 46px Inter, sans-serif";
  ctx.fillText("Igraj i ti: studioleflow.com/igra", W / 2, 1720);

  return new Promise((resolve, reject) => c.toBlob(b => (b ? resolve(b) : reject(new Error("canvas"))), "image/png"));
}

export function ShareResultButton(props: Props) {
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);

  const share = async () => {
    setBusy(true);
    try {
      const blob = await drawCard(props);
      const file = new File([blob], `pogodi-pesmu-${props.challengeNumber}.png`, { type: "image/png" });
      const text = `Pogodi Pesmu #${props.challengeNumber}: ${props.correct ? "pogodio/la sam" : "danas nisam pogodio/la"}. Igraj na studioleflow.com/igra`;
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], text });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url; a.download = file.name;
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        toast({ title: "Slika je sačuvana", description: "Okači je na story i označi @studioleflow." });
      }
    } catch (e: any) {
      if (e?.name !== "AbortError") toast({ title: "Deljenje nije uspelo", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button onClick={share} disabled={busy} variant="outline" className="gap-2">
      {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Share2 className="w-4 h-4" />}
      Podeli rezultat
    </Button>
  );
}
