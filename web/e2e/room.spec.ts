import { expect, test } from "@playwright/test";
import { enterRoom, joinNewRoom, typeReply } from "./helpers";

test.beforeEach(async ({ page }) => {
  await joinNewRoom(page);
  await enterRoom(page);
});

test("key details picked out of the conversation can be corrected, removed and restored", async ({ page }) => {
  await typeReply(page, "The client meeting moved to Thursday at 2 PM.");
  await typeReply(page, "I will send the agenda before then.");
  const details = page.locator("aside li.item");
  await expect(details).toHaveCount(2);

  await page.getByRole("button", { name: "Edit Thursday at 2 PM" }).click();
  await page.getByLabel("Key detail", { exact: true }).fill("Thursday at 3 PM");
  await page.keyboard.press("Enter");
  await expect(details.first()).toContainText("Thursday at 3 PM");
  await expect(details.first()).toContainText("Edited");
  await expect(page.getByRole("button", { name: "Edit Thursday at 3 PM" })).toBeFocused();

  await page.getByRole("button", { name: "Remove Thursday at 3 PM" }).click();
  await expect(details).toHaveCount(1);
  await page.getByRole("button", { name: "Undo" }).click();
  await expect(details).toHaveCount(2);
});

test("display settings apply and are remembered", async ({ page }) => {
  await page.locator("#display summary").click();
  await page.getByRole("radio", { name: "XL" }).check();
  await page.getByRole("switch", { name: "High contrast" }).click();
  const card = page.locator("#livecard");
  await expect(card).toHaveAttribute("data-size", "xl");
  await page.reload();
  await expect(card).toHaveAttribute("data-size", "xl");
  await page.locator("#display summary").click();
  await expect(page.getByRole("switch", { name: "High contrast" })).toHaveAttribute("aria-checked", "true");
  await page.locator("h1").click();
  await expect(page.locator("#display")).not.toHaveAttribute("open");
});

test("the room says so plainly when the service is unreachable", async ({ page }) => {
  await page.routeWebSocket(/\/rooms\/.*\/ws/, (ws) => ws.close());
  await page.reload();
  await expect(page.locator("#liveState")).toHaveText("Connecting…");
  await page.getByRole("button", { name: "Start listening" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "isn’t reachable" })).toBeVisible();
  await page.getByLabel("Type a reply").fill("Hello?");
  await page.keyboard.press("Enter");
  await expect(page.locator("#replyNotice")).toContainText("Not sent");
  await expect(page.getByLabel("Type a reply")).toHaveValue("Hello?");
});
