import { expect, test } from "@playwright/test";
import { enterRoom, joinNewRoom } from "./helpers";

test("show on screen fills the screen with big text and adds the message to the room", async ({ page }) => {
  await joinNewRoom(page);
  await enterRoom(page);
  await page.getByRole("button", { name: "Show on screen" }).click();
  const board = page.getByRole("dialog", { name: "Show on screen" });
  await expect(board).toBeVisible();
  const box = page.getByLabel("Message to show");
  await expect(box).toBeFocused();
  await box.fill("Standup moved to 10:30");
  const { size, short } = await box.evaluate((el) => ({ size: parseFloat(getComputedStyle(el).fontSize), short: Math.min(innerWidth, innerHeight) }));
  expect(size, "short messages are huge: over a tenth of the screen").toBeGreaterThan(short / 10);
  await page.screenshot({ path: test.info().outputPath("board.png") });

  await page.getByRole("button", { name: "Done" }).click();
  await expect(board).toBeHidden();
  await expect(page.getByRole("button", { name: "Show on screen" })).toBeFocused();
  await expect(page.locator("#caption")).toContainText("Standup moved to 10:30");
  await expect(page.locator("#caption")).toContainText("You · typed");
  await expect(page.locator("aside li.item b").filter({ hasText: "10:30" })).toBeVisible();

  // Esc closes too, and sends what was typed
  await page.getByRole("button", { name: "Show on screen" }).click();
  await page.getByLabel("Message to show").fill("Thank you");
  await page.keyboard.press("Escape");
  await expect(board).toBeHidden();
  await expect(page.locator("#caption")).toContainText("Thank you");
});
