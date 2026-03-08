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

test("per-tab copy button visible on hover", async ({ context, page, extensionId }) => {
  const newPage = await context.newPage();
  await newPage.goto("data:text/html,<title>Hover Copy Test</title>");
  await newPage.waitForLoadState("domcontentloaded");

  await page.goto(`chrome-extension://${extensionId}/sidepanel.html`);

  const item = page.locator(".tab-item", { hasText: "Hover Copy Test" });
  await expect(item).toBeVisible();

  const copyBtn = item.locator(".tab-copy");
  await expect(copyBtn).toHaveCSS("opacity", "0");

  await item.hover();
  await expect(copyBtn).not.toHaveCSS("opacity", "0");

  await newPage.close();
});

test("per-tab copy button sets data-copied attribute", async ({ context, page, extensionId }) => {
  const newPage = await context.newPage();
  await newPage.goto("data:text/html,<title>Copy Me</title>");
  await newPage.waitForLoadState("domcontentloaded");

  await page.goto(`chrome-extension://${extensionId}/sidepanel.html`);

  const item = page.locator(".tab-item", { hasText: "Copy Me" });
  await item.hover();

  const copyBtn = item.locator(".tab-copy");
  await copyBtn.click();

  await expect(copyBtn).toHaveAttribute("data-copied", "true");
  await expect(copyBtn).toHaveText("\u2713");

  await newPage.close();
});

test("batch copy button disabled when nothing selected", async ({ page, extensionId }) => {
  await page.goto(`chrome-extension://${extensionId}/sidepanel.html`);
  await expect(page.locator(".copy-selected")).toBeDisabled();
});

test("batch copy with selection sets data-copied attribute", async ({ context, page, extensionId }) => {
  const pageA = await context.newPage();
  await pageA.goto("data:text/html,<title>Link A</title>");
  await pageA.waitForLoadState("domcontentloaded");

  const pageB = await context.newPage();
  await pageB.goto("data:text/html,<title>Link B</title>");
  await pageB.waitForLoadState("domcontentloaded");

  await page.goto(`chrome-extension://${extensionId}/sidepanel.html`);

  await expect(page.locator(".tab-item", { hasText: "Link A" })).toBeVisible();
  await expect(page.locator(".tab-item", { hasText: "Link B" })).toBeVisible();

  await page.locator(".tab-item", { hasText: "Link A" }).locator(".tab-checkbox").click();
  await page.locator(".tab-item", { hasText: "Link B" }).locator(".tab-checkbox").click();

  const copyBtn = page.locator(".copy-selected");
  await expect(copyBtn).toBeEnabled();
  await copyBtn.click();

  await expect(copyBtn).toHaveAttribute("data-copied", "true");

  await pageA.close();
  await pageB.close();
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
