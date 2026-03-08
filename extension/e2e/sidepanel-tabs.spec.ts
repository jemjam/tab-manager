import { expect, test } from "./fixtures";

test("renders a list of open tabs", async ({ page, extensionId }) => {
  await page.goto(`chrome-extension://${extensionId}/sidepanel.html`);

  const items = page.locator(".tab-item");
  await expect(items.first()).toBeVisible();
  expect(await items.count()).toBeGreaterThan(0);
});

test("displays tab titles", async ({ context, page, extensionId }) => {
  const newPage = await context.newPage();
  await newPage.goto("data:text/html,<title>Test Tab Title</title>");
  await newPage.waitForLoadState("domcontentloaded");

  await page.goto(`chrome-extension://${extensionId}/sidepanel.html`);

  await expect(page.locator(".tab-title", { hasText: "Test Tab Title" })).toBeVisible();

  await newPage.close();
});

test("closes a tab via the × button", async ({ context, page, extensionId }) => {
  const newPage = await context.newPage();
  await newPage.goto("data:text/html,<title>Tab To Close</title>");
  await newPage.waitForLoadState("domcontentloaded");

  await page.goto(`chrome-extension://${extensionId}/sidepanel.html`);

  const itemToClose = page.locator(".tab-item", { hasText: "Tab To Close" });
  await expect(itemToClose).toBeVisible();

  const countBefore = await page.locator(".tab-item").count();

  await itemToClose.locator(".tab-close").click();

  await expect(page.locator(".tab-item")).toHaveCount(countBefore - 1);
  await expect(itemToClose).not.toBeVisible();
});

test("selects and closes multiple tabs at once", async ({ context, page, extensionId }) => {
  const pageAlpha = await context.newPage();
  await pageAlpha.goto("data:text/html,<title>Alpha</title>");
  await pageAlpha.waitForLoadState("domcontentloaded");

  const pageBravo = await context.newPage();
  await pageBravo.goto("data:text/html,<title>Bravo</title>");
  await pageBravo.waitForLoadState("domcontentloaded");

  const pageCharlie = await context.newPage();
  await pageCharlie.goto("data:text/html,<title>Charlie</title>");
  await pageCharlie.waitForLoadState("domcontentloaded");

  await page.goto(`chrome-extension://${extensionId}/sidepanel.html`);

  await expect(page.locator(".tab-item", { hasText: "Alpha" })).toBeVisible();
  await expect(page.locator(".tab-item", { hasText: "Bravo" })).toBeVisible();
  await expect(page.locator(".tab-item", { hasText: "Charlie" })).toBeVisible();

  await page.locator(".tab-item", { hasText: "Alpha" }).locator(".tab-checkbox").click();
  await page.locator(".tab-item", { hasText: "Charlie" }).locator(".tab-checkbox").click();

  await expect(page.locator(".selected-count")).toHaveText("2 selected");

  const countBefore = await page.locator(".tab-item").count();

  await page.locator(".close-selected").click();

  await expect(page.locator(".tab-item")).toHaveCount(countBefore - 2);
  await expect(page.locator(".tab-item", { hasText: "Bravo" })).toBeVisible();
  await expect(page.locator(".tab-item", { hasText: "Alpha" })).not.toBeVisible();
  await expect(page.locator(".tab-item", { hasText: "Charlie" })).not.toBeVisible();
});
