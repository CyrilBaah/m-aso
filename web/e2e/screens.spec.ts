import { expect, test } from "@playwright/test";
import { expectNoPageScroll, joinNewRoom } from "./helpers";

test("every screen loads without errors, has a skip-link target and fits the screen", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await joinNewRoom(page);
  for (const path of ["/", "/start", "/create", "/join", "/consent", "/room", "/summary", "/complete"]) {
    await page.goto(path);
    await expect(page.locator("#main")).toBeAttached();
    await page.waitForTimeout(900); // entrance animations
    await expectNoPageScroll(page);
  }
  expect(errors).toEqual([]);
});

test("room screens explain themselves when you are not in a room", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.goto("/room");
  await expect(page.getByText("You’re not in a room yet.")).toBeVisible();
  await page.goto("/consent");
  await expect(page.getByText("You’re not in a room yet.")).toBeVisible();
});

test("join checks the code against the service", async ({ page }) => {
  await page.goto("/join?code=ZZZZ-999");
  await expect(page.locator("#joinStatus")).toContainText("No room with that code");
  const code = (await (await page.request.post("http://localhost:8000/rooms")).json()).code as string;
  await page.getByLabel("Room code").fill(code.toLowerCase().replace("-", ""));
  await expect(page.getByLabel("Room code")).toHaveValue(code);
  await expect(page.locator("#joinStatus")).toContainText("Room found");
  await page.getByRole("button", { name: "Join room" }).click();
  await expect(page).toHaveURL(/consent/);
  await expect(page.getByText(`Room ${code} open`)).toBeVisible();
});
