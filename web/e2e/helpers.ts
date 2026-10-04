import { expect, type Page } from "@playwright/test";

const AI = "http://localhost:8000";

/** Opens a real room on the AI service and puts this browser in it. */
export async function joinNewRoom(page: Page, name = "Ama"): Promise<string> {
  const res = await page.request.post(`${AI}/rooms`);
  const { code } = (await res.json()) as { code: string };
  await page.goto("/");
  await page.evaluate(
    ([room, n]) => {
      localStorage.clear();
      localStorage.setItem("maso_room", room);
      localStorage.setItem("maso_name", n);
    },
    [code, name],
  );
  return code;
}

/** Waits until the service has the Whisper model loaded. */
export async function whisperReady(page: Page) {
  await expect
    .poll(async () => (await (await page.request.get(`${AI}/health`)).json()).whisper.status, { timeout: 120_000 })
    .toBe("ready");
}

export async function gemmaStatus(page: Page): Promise<string> {
  return (await (await page.request.get(`${AI}/health`)).json()).gemma.status;
}

/** Pages are designed to fit one laptop screen without scrolling. */
export async function expectNoPageScroll(page: Page) {
  const { scroll, height, width, inner } = await page.evaluate(() => ({
    scroll: document.documentElement.scrollHeight,
    height: innerHeight,
    width: document.documentElement.scrollWidth,
    inner: innerWidth,
  }));
  expect(width, "no sideways scroll").toBeLessThanOrEqual(inner + 1);
  if (inner >= 800) expect(scroll, "fits on one screen").toBeLessThanOrEqual(height + 1);
}

/** Sends a typed message through the real room and waits for the room to echo it back. */
export async function typeReply(page: Page, text: string) {
  await page.getByLabel("Type a message").fill(text);
  await page.keyboard.press("Enter");
  await expect(page.locator("#caption")).toContainText(text);
}

/** Opens the room screen and waits until this browser is connected to the room. */
export async function enterRoom(page: Page) {
  await page.goto("/room");
  await expect(page.locator("#liveState")).toHaveText(/in room$/);
}
