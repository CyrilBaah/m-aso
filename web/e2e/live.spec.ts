import { chromium, expect, test } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { whisperReady } from "./helpers";

/* Two real browsers in one real room. Ama's microphone is Chrome's fake device playing speech
   made with macOS `say`; it goes through faster-whisper and Kofi reads the caption. */

function speechWav(): string {
  const dir = mkdtempSync(join(tmpdir(), "maso-"));
  const wav = join(dir, "speech.wav");
  execFileSync("say", ["-o", join(dir, "s.aiff"), "Hi Kofi. The client meeting has moved to Thursday at two PM. I will send the agenda before the meeting."]);
  execFileSync("ffmpeg", ["-loglevel", "error", "-y", "-i", join(dir, "s.aiff"), "-af", "apad=pad_dur=3", "-ar", "48000", "-ac", "1", wav]);
  return wav;
}

test("create, join, consent and caption a live conversation between two people", async ({ page }) => {
  test.slow();
  await whisperReady(page);
  const base = "http://localhost:3000";
  const fakeMic = ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"];
  const amaBrowser = await chromium.launch({ channel: "chrome", args: [...fakeMic, `--use-file-for-fake-audio-capture=${speechWav()}%noloop`] });
  const kofiBrowser = await chromium.launch({ channel: "chrome", args: fakeMic });
  const viewport = { width: 1366, height: 768 };
  const ama = await (await amaBrowser.newContext({ permissions: ["microphone"], viewport })).newPage();
  const kofi = await (await kofiBrowser.newContext({ viewport })).newPage();

  // Ama opens a room
  await ama.goto(`${base}/create`);
  await expect(ama.locator(".roomcode")).toHaveText(/^[A-Z]{4}-\d{3}$/);
  const code = (await ama.locator(".roomcode").textContent())!;
  await expect(ama.getByText("Waiting for your teammate")).toBeVisible();

  // Kofi joins with the code; Ama sees him arrive
  await kofi.goto(`${base}/join?code=${code}`);
  await expect(kofi.locator("#joinStatus")).toContainText("1 person is already in the room");
  await kofi.getByRole("button", { name: "Join room" }).click();
  await expect(ama.getByText("Your teammate has joined")).toBeVisible();

  // Both name themselves and see each other on the consent screen
  await ama.getByRole("link", { name: "Continue to consent" }).click();
  await ama.getByLabel("Your name, shown next to your captions").fill("Ama");
  await kofi.getByLabel("Your name, shown next to your captions").fill("Kofi");
  await expect(ama.getByText("You’re both here.")).toBeVisible();
  await expect(ama.getByLabel("In the room")).toContainText("Kofi");
  await expect(kofi.getByLabel("In the room")).toContainText("Ama");
  await ama.getByRole("link", { name: "I agree, start captions" }).click();
  await kofi.getByRole("link", { name: "I agree, start captions" }).click();
  await expect(ama.locator("#liveState")).toHaveText("2 in room");

  // Ama speaks; Kofi reads it, labelled with her name, and the key details are picked out
  await ama.getByRole("button", { name: "Start listening" }).click();
  await expect(ama.locator("#headLive")).toHaveText("Captions on");
  await expect(kofi.locator("#livecard")).toContainText(/thursday/i, { timeout: 45_000 });
  await expect(kofi.locator("#livecard")).toContainText("Ama");
  await expect(kofi.locator("aside li.item b").filter({ hasText: /thursday/i })).toBeVisible();

  // Kofi replies by typing; Ama reads it
  await kofi.getByLabel("Type a message").fill("Thanks, I can follow that.");
  await kofi.keyboard.press("Enter");
  await expect(ama.locator("#livecard")).toContainText("Kofi · typed");
  await ama.getByRole("button", { name: "Stop listening" }).click();

  await amaBrowser.close();
  await kofiBrowser.close();
});
