import { test } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import ffmpegPath from "ffmpeg-static";
import { getClipSlice, CLIP_SECONDS } from "../game-clip";

// Pogodi Pesmu anti-cheat: only the playable snippet may leave the server, and
// it must not carry the song's metadata (the title is the answer).
test("clip slice is ~CLIP_SECONDS long and carries no ID3/title metadata", { skip: !ffmpegPath }, async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "clip-test-"));
  const src = path.join(dir, "song.mp3");
  execFileSync(ffmpegPath!, ["-y", "-hide_banner", "-loglevel", "error", "-f", "lavfi", "-i", "sine=frequency=440:duration=10",
    "-metadata", "title=Tajna Pesma", "-metadata", "artist=Neko", "-c:a", "libmp3lame", src]);
  assert.ok(fs.readFileSync(src).includes("Tajna Pesma"), "fixture should contain the title");

  const server = http.createServer((_q, r) => { r.setHeader("Content-Type", "audio/mpeg"); fs.createReadStream(src).pipe(r); });
  await new Promise<void>(res => server.listen(0, res));
  const port = (server.address() as any).port;
  try {
    const slice = await getClipSlice(`http://127.0.0.1:${port}/song.mp3`, 3);
    assert.ok(!slice.includes("Tajna Pesma"), "title leaked into the slice");
    assert.ok(!slice.includes("Neko"), "artist leaked into the slice");
    assert.notEqual(slice.subarray(0, 3).toString(), "ID3", "slice starts with an ID3 tag");

    const out = path.join(dir, "slice.mp3");
    fs.writeFileSync(out, slice);
    let info = "";
    try { execFileSync(ffmpegPath!, ["-hide_banner", "-i", out], { stdio: "pipe" }); } catch (e: any) { info = String(e.stderr); }
    const m = info.match(/Duration: (\d+):(\d+):([\d.]+)/);
    assert.ok(m, "could not read slice duration");
    const secs = Number(m![1]) * 3600 + Number(m![2]) * 60 + Number(m![3]);
    assert.ok(Math.abs(secs - CLIP_SECONDS) < 0.2, `slice is ${secs}s, expected ~${CLIP_SECONDS}s`);
    // far smaller than the full song
    assert.ok(slice.length < fs.statSync(src).size / 3);
  } finally {
    server.close();
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
