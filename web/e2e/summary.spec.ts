import { expect, test } from "@playwright/test";
import { enterRoom, gemmaStatus, joinNewRoom, typeReply } from "./helpers";

test("Gemma summarises the real conversation; rows are labelled, editable and kept", async ({ page }) => {
  test.slow();
  await joinNewRoom(page, "Kofi");
  await enterRoom(page);
  await typeReply(page, "The client meeting has moved to Thursday at 2 PM.");
  await typeReply(page, "I will send the agenda before the meeting.");
  await page.getByRole("link", { name: "End conversation" }).click();

  if ((await gemmaStatus(page)) !== "ready") {
    await expect(page.getByText("No AI summary this time.")).toBeVisible({ timeout: 30_000 });
    await expect(page.locator(".summary li").filter({ hasText: "Thursday at 2 PM" })).toBeVisible();
    test.info().annotations.push({ type: "note", description: "Gemma not installed; checked the explained fallback" });
    return;
  }
  await expect(page.getByText("Written by")).toBeVisible({ timeout: 120_000 });
  const rows = page.locator(".summary li");
  await expect(rows.filter({ hasText: /thursday/i }).first()).toBeVisible();
  await expect(rows.filter({ hasText: /agenda/i }).first()).toBeVisible();

  const first = rows.first();
  const label = (await first.locator("b").textContent())!.trim();
  await first.getByRole("button", { name: /^Edit / }).click();
  await page.getByLabel(label).fill("Corrected by a person.");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await page.reload();
  await expect(rows.first()).toContainText("Corrected by a person.");
  await expect(rows.first()).toContainText("Edited");
});

test("when Gemma can’t run, the page says why, keeps what was captured, and can retry", async ({ page }) => {
  let calls = 0;
  await page.route("**/rooms/*/summary", (route) =>
    route.request().method() !== "POST"
      ? route.continue()
      : ++calls === 1
      ? route.fulfill({ status: 503, json: { detail: "The gemma3:4b model is not installed. Run: ollama pull gemma3:4b" } })
      : route.fulfill({ json: { summary: { decisions: ["Retry worked"], action_items: [], key_dates: [], open_questions: [] } } }),
  );
  await joinNewRoom(page);
  await enterRoom(page);
  await typeReply(page, "See you tomorrow at 10:30.");
  await page.getByRole("link", { name: "End conversation" }).click();
  await expect(page.getByText("No AI summary this time.")).toBeVisible();
  await expect(page.getByText("ollama pull gemma3:4b")).toBeVisible();
  await expect(page.locator(".summary li").first()).toContainText("Tomorrow");
  await page.getByRole("button", { name: "Try Gemma again" }).click();
  await expect(page.locator(".summary li").first()).toContainText("Retry worked");
});

test("delete session removes the room from the service and this browser", async ({ page }) => {
  const code = await joinNewRoom(page);
  await enterRoom(page);
  await typeReply(page, "Hello.");
  await page.goto("/summary");
  await page.getByRole("link", { name: "Delete session" }).click();
  await expect(page.getByRole("status").filter({ hasText: "deleted" })).toBeVisible();
  const left = await page.evaluate(() => ["maso_reply", "maso_details", "maso_summary", "maso_transcript"].map((k) => localStorage.getItem(k)));
  expect(left).toEqual([null, null, null, null]);
  await expect.poll(async () => (await page.request.get(`http://localhost:8000/rooms/${code}`)).status()).toBe(404);
});
