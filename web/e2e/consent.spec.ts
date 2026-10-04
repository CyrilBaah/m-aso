import { expect, test } from "@playwright/test";

test("captions wait until both people have agreed", async ({ browser, baseURL }) => {
  const ama = await (await browser.newContext({ baseURL })).newPage();
  const kofi = await (await browser.newContext({ baseURL })).newPage();

  await ama.goto("/create");
  await expect(ama.locator(".roomcode")).toHaveText(/^[A-Z]{4}-\d{3}$/);
  const code = (await ama.locator(".roomcode").textContent())!;
  await ama.getByRole("link", { name: "Continue to consent" }).click();
  await ama.getByLabel("Your name, shown next to your captions").fill("Ama");

  await kofi.goto(`/join?code=${code}`);
  await kofi.getByRole("button", { name: "Join room" }).click();
  await expect(kofi).toHaveURL(/consent/, { timeout: 20_000 });
  await kofi.getByLabel("Your name, shown next to your captions").fill("Kofi");

  // Ama agrees first; Kofi's screen shows it
  await ama.getByRole("button", { name: "I agree, start captions" }).click();
  await expect(kofi.getByLabel("In the room")).toContainText("Ama · agreed");

  // In the room, Ama is told captions are waiting for Kofi
  await expect(ama.locator("#liveState")).toHaveText("Waiting for Kofi to agree");
  await ama.getByRole("button", { name: "Start listening" }).click();
  await expect(ama.getByRole("alert").filter({ hasText: "Waiting for Kofi" })).toBeVisible();

  // Kofi agrees: the room is ready
  await kofi.getByRole("button", { name: "I agree, start captions" }).click();
  await expect(ama.locator("#liveState")).toHaveText("2 in room");
  await expect(kofi.locator("#consentNote")).toHaveCount(0);
});

test("someone who skipped consent is pointed back to it", async ({ page }) => {
  const code = (await (await page.request.post("http://localhost:8000/rooms")).json()).code as string;
  await page.goto(`/join?code=${code}`);
  await page.getByRole("button", { name: "Join room" }).click();
  await expect(page).toHaveURL(/consent/);
  await page.goto("/room");
  await expect(page.locator("#consentNote")).toContainText("You haven’t agreed to captions yet.");
  await expect(page.locator("#liveState")).toHaveText("Waiting for you to agree");
});
