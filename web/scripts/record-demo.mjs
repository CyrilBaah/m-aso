/* Records a real m’aso conversation between two browsers, side by side, with sound.

   Ama's microphone is Chrome's fake device playing speech made with macOS `say`. Everything
   else is real: the room, consent, faster-whisper captions, typing, Show on screen and the
   Gemma summary. The same speech file is mixed into the video from the moment Ama starts
   listening, so you hear what Kofi reads.

   Needs both services running (scripts/dev.sh), Chrome, ffmpeg and macOS `say`.
   Run from web/:  node scripts/record-demo.mjs   →  ../demo/maso-demo.mp4 */

import { chromium } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const BASE = "http://localhost:3000";
const AI = "http://localhost:8000";
const OLLAMA = process.env.OLLAMA_URL ?? "http://localhost:11434";
const OUT = resolve("../demo");
const SIZE = { width: 1280, height: 720 };
const VOICE = process.env.DEMO_VOICE ?? "Samantha";

const LINES = [
  "Hi Kofi, thanks for joining.",
  "The client meeting has moved to Thursday at two PM.",
  "I will send the agenda before the meeting.",
];

const run = (cmd, args) => execFileSync(cmd, args, { stdio: ["ignore", "ignore", "inherit"] });
const pause = (ms) => new Promise((r) => setTimeout(r, ms));

/** Sentences with gaps between them, so each one becomes its own caption. */
function speech(dir) {
  const parts = LINES.map((line, i) => {
    const aiff = join(dir, `l${i}.aiff`);
    run("say", ["-v", VOICE, "-r", "165", "-o", aiff, line]);
    const wav = join(dir, `l${i}.wav`);
    run("ffmpeg", ["-loglevel", "error", "-y", "-i", aiff, "-af", "apad=pad_dur=2.2", "-ar", "48000", "-ac", "1", wav]);
    return wav;
  });
  const list = join(dir, "list.txt");
  execFileSync("sh", ["-c", `printf "file '%s'\\n" ${parts.map((p) => `"${p}"`).join(" ")} > "${list}"`]);
  const out = join(dir, "speech.wav");
  run("ffmpeg", ["-loglevel", "error", "-y", "-f", "concat", "-safe", "0", "-i", list, "-c", "copy", out]);
  return out;
}

async function type(locator, text) {
  await locator.click();
  await locator.pressSequentially(text, { delay: 55 });
}

async function main() {
  const health = await fetch(`${AI}/health`).then((r) => r.json()).catch(() => null);
  if (health?.whisper?.status !== "ready") throw new Error("Start the services first (scripts/dev.sh) and wait for Whisper to load.");
  if (health?.gemma?.status !== "ready") console.warn("Gemma is not ready: the summary will show the fallback.");
  // Load Gemma now so the summary doesn't wait on a cold model.
  await fetch(`${OLLAMA}/api/generate`, { method: "POST", body: JSON.stringify({ model: health?.gemma?.model, keep_alive: "15m" }) }).catch(() => {});

  const work = mkdtempSync(join(tmpdir(), "maso-demo-"));
  const wav = speech(work);
  const fakeMic = ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"];
  const amaBrowser = await chromium.launch({ channel: "chrome", args: [...fakeMic, `--use-file-for-fake-audio-capture=${wav}%noloop`] });
  const kofiBrowser = await chromium.launch({ channel: "chrome", args: fakeMic });
  const video = (name) => ({ dir: join(work, name), size: SIZE });
  const amaCtx = await amaBrowser.newContext({ viewport: SIZE, permissions: ["microphone"], recordVideo: video("ama") });
  const ama = await amaCtx.newPage();
  const tAma = Date.now();
  const kofiCtx = await kofiBrowser.newContext({ viewport: SIZE, recordVideo: video("kofi") });
  const kofi = await kofiCtx.newPage();
  const tKofi = Date.now();
  // Hide the Next.js dev tools button.
  const hideDevTools = () => {
    const style = () => document.head.append(Object.assign(document.createElement("style"), { textContent: "nextjs-portal{display:none!important}" }));
    if (document.head) style();
    else document.addEventListener("DOMContentLoaded", style);
  };
  await amaCtx.addInitScript(hideDevTools);
  await kofiCtx.addInitScript(hideDevTools);
  ama.setDefaultTimeout(60_000);
  kofi.setDefaultTimeout(60_000);

  // Ama opens a room and shares the code
  await ama.goto(`${BASE}/create`);
  await ama.locator(".roomcode").filter({ hasText: /^[A-Z]{4}-\d{3}$/ }).waitFor();
  const code = (await ama.locator(".roomcode").textContent()).trim();
  await kofi.goto(`${BASE}/`);
  await pause(4000);

  // Kofi types the code and joins
  await kofi.goto(`${BASE}/join`);
  await pause(1200);
  await type(kofi.locator("#code"), code.replace("-", ""));
  await kofi.getByText("Room found").waitFor();
  await pause(2000);
  await kofi.getByRole("button", { name: "Join room" }).click();
  await ama.getByText("Your teammate has joined").waitFor();
  await pause(1200);

  // Both name themselves and agree
  await ama.getByRole("link", { name: "Continue to consent" }).click();
  await type(ama.getByLabel("Your name, shown next to your captions"), "Ama");
  await type(kofi.getByLabel("Your name, shown next to your captions"), "Kofi");
  await ama.getByText("You’re both here.").waitFor();
  await pause(3000);
  await ama.getByRole("button", { name: "I agree, start captions" }).click();
  await pause(1500);
  await kofi.getByRole("button", { name: "I agree, start captions" }).click();
  await ama.locator("#liveState").filter({ hasText: "2 in room" }).waitFor();
  await pause(1500);

  // Ama speaks; Kofi reads the captions
  await ama.getByRole("button", { name: "Start listening" }).click();
  const tMic = Date.now();
  await kofi.locator("#livecard").filter({ hasText: /agenda/i }).waitFor({ timeout: 90_000 });
  await pause(2500);
  await ama.getByRole("button", { name: "Stop listening" }).click();

  // Kofi replies by typing
  await type(kofi.getByLabel("Type a message"), "Thanks. I'll prepare the budget slides by Wednesday.");
  await kofi.keyboard.press("Enter");
  await ama.locator("#livecard").filter({ hasText: "budget" }).waitFor();
  await pause(2500);

  // Ama turns the screen around: Show on screen
  await ama.getByRole("button", { name: "Show on screen" }).click();
  await type(ama.getByLabel("Message to show"), "Great, thank you Kofi!");
  await pause(2500);
  await ama.getByRole("button", { name: "Done" }).click();
  await kofi.locator("#livecard").filter({ hasText: "Great, thank you" }).waitFor();
  await pause(2500);

  // Ama ends the conversation; Gemma writes the summary
  await ama.getByRole("link", { name: "End conversation" }).click();
  await ama.getByText(/Written by|No AI summary this time/).waitFor({ timeout: 180_000 });
  await pause(3000);
  // Scroll through what Gemma wrote
  const list = ama.locator("ul.summary");
  for (let i = 0; i < 6; i++) {
    await list.evaluate((el) => el.scrollBy({ top: 70, behavior: "smooth" }));
    await pause(900);
  }
  await pause(3000);
  const tEnd = Date.now();

  const amaVideo = ama.video();
  const kofiVideo = kofi.video();
  await amaCtx.close();
  await kofiCtx.close();
  await amaBrowser.close();
  await kofiBrowser.close();
  const amaWebm = await amaVideo.path();
  const kofiWebm = await kofiVideo.path();

  // Ama left, Kofi right, aligned in time; speech starts when Ama started listening.
  mkdirSync(OUT, { recursive: true });
  const kofiLate = ((tKofi - tAma) / 1000).toFixed(3);
  const micAt = Math.max(0, tMic - tAma);
  const length = ((tEnd - tAma) / 1000).toFixed(3);
  const out = join(OUT, "maso-demo.mp4");
  run("ffmpeg", [
    "-loglevel", "error", "-y",
    "-i", amaWebm, "-i", kofiWebm, "-i", wav,
    "-filter_complex",
    `[0:v]setpts=PTS-STARTPTS[a];` +
      `[1:v]setpts=PTS-STARTPTS,tpad=start_duration=${kofiLate}:start_mode=clone[k];` +
      `[a][k]hstack=inputs=2,fps=30,format=yuv420p[v];[2:a]adelay=${micAt}|${micAt},apad[s]`,
    "-map", "[v]", "-map", "[s]",
    "-t", length,
    "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-c:a", "aac", "-b:a", "160k", "-movflags", "+faststart",
    out,
  ]);
  console.log(`Saved ${out}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
