import ffmpegPath from "ffmpeg-static";
import ffmpeg from "fluent-ffmpeg";
import { PassThrough, Readable } from "stream";

if (ffmpegPath) ffmpeg.setFfmpegPath(ffmpegPath);

// "Pogodi Pesmu" anti-cheat: the browser only ever receives the exact snippet
// it is allowed to hear - never the full song. The slice is re-encoded with all
// metadata dropped (ID3 tags on the uploaded MP3 can contain the title, i.e.
// the answer). Short fades avoid clicks at the cut points.
//
// One slice per challenge is cached in memory, so ffmpeg runs once per day
// (and once more after a deploy), not once per player.

export const CLIP_SECONDS = 1;

const cache = new Map<string, Buffer>();

export async function getClipSlice(clipUrl: string, startSeconds: number): Promise<Buffer> {
  const key = `${clipUrl}|${startSeconds}|${CLIP_SECONDS}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const upstream = await fetch(clipUrl);
  if (!upstream.ok) throw new Error(`Upstream ${upstream.status}`);
  const source = Buffer.from(await upstream.arrayBuffer());

  const slice = await new Promise<Buffer>((resolve, reject) => {
    const out = new PassThrough();
    const chunks: Buffer[] = [];
    out.on("data", c => chunks.push(c as Buffer));
    out.on("end", () => resolve(Buffer.concat(chunks)));
    out.on("error", reject);
    const fadeOutAt = Math.max(0, CLIP_SECONDS - 0.03);
    ffmpeg(Readable.from(source))
      .setStartTime(Math.max(0, startSeconds))
      .duration(CLIP_SECONDS)
      .noVideo()
      .audioCodec("libmp3lame")
      .audioBitrate(128)
      .audioChannels(2)
      .audioFilters([`afade=t=in:st=0:d=0.02`, `afade=t=out:st=${fadeOutAt}:d=0.03`])
      .outputOptions(["-map_metadata", "-1", "-id3v2_version", "0", "-write_xing", "0"])
      .format("mp3")
      .on("error", reject)
      .pipe(out, { end: true });
  });

  if (slice.length < 1000) throw new Error("Slice too short - clip start beyond the end of the song?");
  // today's slice plus a few archive (practice) slices; oldest entry goes first
  if (cache.size >= 12) cache.delete(cache.keys().next().value!);
  cache.set(key, slice);
  return slice;
}
