import { expect, test } from "./fixtures";

test("renders a list of open tabs", async ({ page, extensionId }) => {
  await page.goto(`chrome-extension://${extensionId}/sidepanel.html`);

  const items = page.locator("[data-tab]");
  await expect(items.first()).toBeVisible();
  expect(await items.count()).toBeGreaterThan(0);
});

test("displays tab titles", async ({ context, page, extensionId }) => {
  const newPage = await context.newPage();
  await newPage.goto("data:text/html,<title>Test Tab Title</title>");
  await newPage.waitForLoadState("domcontentloaded");

  await page.goto(`chrome-extension://${extensionId}/sidepanel.html`);

  await expect(page.locator("[data-tab-title]", { hasText: "Test Tab Title" })).toBeVisible();

  await newPage.close();
});

test("displays tab URL below title", async ({ context, page, extensionId }) => {
  const newPage = await context.newPage();
  await newPage.goto("data:text/html,<title>URL Display Test</title>");
  await newPage.waitForLoadState("domcontentloaded");

  await page.goto(`chrome-extension://${extensionId}/sidepanel.html`);

  const item = page.locator("[data-tab]", { hasText: "URL Display Test" });
  await expect(item).toBeVisible();
  await expect(item.locator("[data-tab-url]")).toBeVisible();
  await expect(item.locator("[data-tab-url]")).toContainText("data:text/html");

  await newPage.close();
});

test("closes a tab via the × button", async ({ context, page, extensionId }) => {
  const newPage = await context.newPage();
  await newPage.goto("data:text/html,<title>Tab To Close</title>");
  await newPage.waitForLoadState("domcontentloaded");

  await page.goto(`chrome-extension://${extensionId}/sidepanel.html`);

  const itemToClose = page.locator("[data-tab]", { hasText: "Tab To Close" });
  await expect(itemToClose).toBeVisible();

  const countBefore = await page.locator("[data-tab]").count();

  await itemToClose.locator("[data-tab-close]").click();

  await expect(page.locator("[data-tab]")).toHaveCount(countBefore - 1);
  await expect(itemToClose).not.toBeVisible();
});

test("per-tab copy button visible on hover", async ({ context, page, extensionId }) => {
  const newPage = await context.newPage();
  await newPage.goto("data:text/html,<title>Hover Copy Test</title>");
  await newPage.waitForLoadState("domcontentloaded");

  await page.goto(`chrome-extension://${extensionId}/sidepanel.html`);

  const item = page.locator("[data-tab]", { hasText: "Hover Copy Test" });
  await expect(item).toBeVisible();

  const copyBtn = item.locator("[data-tab-copy]");
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

  const item = page.locator("[data-tab]", { hasText: "Copy Me" });
  await item.hover();

  const copyBtn = item.locator("[data-tab-copy]");
  await copyBtn.click();

  await expect(copyBtn).toHaveAttribute("data-copied", "true");
  await expect(copyBtn).toHaveText("\u2713");

  await newPage.close();
});

test("bulk action bar hidden when nothing selected", async ({ page, extensionId }) => {
  await page.goto(`chrome-extension://${extensionId}/sidepanel.html`);
  await expect(page.locator("[data-tab]").first()).toBeVisible();
  await expect(page.locator("[data-bulk-bar]")).not.toBeInViewport();
});

test("batch copy with selection sets data-copied attribute", async ({ context, page, extensionId }) => {
  const pageA = await context.newPage();
  await pageA.goto("data:text/html,<title>Link A</title>");
  await pageA.waitForLoadState("domcontentloaded");

  const pageB = await context.newPage();
  await pageB.goto("data:text/html,<title>Link B</title>");
  await pageB.waitForLoadState("domcontentloaded");

  await page.goto(`chrome-extension://${extensionId}/sidepanel.html`);

  await expect(page.locator("[data-tab]", { hasText: "Link A" })).toBeVisible();
  await expect(page.locator("[data-tab]", { hasText: "Link B" })).toBeVisible();

  await page.locator("[data-tab]", { hasText: "Link A" }).locator("[data-tab-checkbox]").click();
  await page.locator("[data-tab]", { hasText: "Link B" }).locator("[data-tab-checkbox]").click();

  const copyBtn = page.locator("[data-copy-selected]");
  await expect(copyBtn).toBeVisible();
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

  await expect(page.locator("[data-tab]", { hasText: "Alpha" })).toBeVisible();
  await expect(page.locator("[data-tab]", { hasText: "Bravo" })).toBeVisible();
  await expect(page.locator("[data-tab]", { hasText: "Charlie" })).toBeVisible();

  await page.locator("[data-tab]", { hasText: "Alpha" }).locator("[data-tab-checkbox]").click();
  await page.locator("[data-tab]", { hasText: "Charlie" }).locator("[data-tab-checkbox]").click();

  await expect(page.locator("[data-selected-count]")).toHaveText("2 selected");

  const countBefore = await page.locator("[data-tab]").count();

  await page.locator("[data-close-selected]").click();

  await expect(page.locator("[data-tab]")).toHaveCount(countBefore - 2);
  await expect(page.locator("[data-tab]", { hasText: "Bravo" })).toBeVisible();
  await expect(page.locator("[data-tab]", { hasText: "Alpha" })).not.toBeVisible();
  await expect(page.locator("[data-tab]", { hasText: "Charlie" })).not.toBeVisible();
});

test("filters tabs by title", async ({ context, page, extensionId }) => {
  const newPage = await context.newPage();
  await newPage.goto("data:text/html,<title>Unique Filter Target</title>");
  await newPage.waitForLoadState("domcontentloaded");

  await page.goto(`chrome-extension://${extensionId}/sidepanel.html`);
  await expect(page.locator("[data-tab]", { hasText: "Unique Filter Target" })).toBeVisible();

  const countBefore = await page.locator("[data-tab]").count();
  expect(countBefore).toBeGreaterThan(1);

  await page.locator("[data-filter]").fill("Unique Filter Target");

  await expect(page.locator("[data-tab]")).toHaveCount(1);
  await expect(page.locator("[data-tab-title]", { hasText: "Unique Filter Target" })).toBeVisible();

  await newPage.close();
});

test("filters tabs by URL", async ({ context, page, extensionId }) => {
  const newPage = await context.newPage();
  await newPage.goto("data:text/html,<title>URL Filter Test</title>");
  await newPage.waitForLoadState("domcontentloaded");

  await page.goto(`chrome-extension://${extensionId}/sidepanel.html`);
  await expect(page.locator("[data-tab]", { hasText: "URL Filter Test" })).toBeVisible();

  await page.locator("[data-filter]").fill("data:text/html");

  const filtered = page.locator("[data-tab]");
  await expect(filtered.first()).toBeVisible();
  // All visible tabs should have URLs containing the filter text
  for (const url of await filtered.locator("[data-tab-url]").allTextContents()) {
    expect(url.toLowerCase()).toContain("data:text/html");
  }

  await newPage.close();
});

test("filter clears and shows all tabs", async ({ context, page, extensionId }) => {
  const newPage = await context.newPage();
  await newPage.goto("data:text/html,<title>Clear Filter Test</title>");
  await newPage.waitForLoadState("domcontentloaded");

  await page.goto(`chrome-extension://${extensionId}/sidepanel.html`);

  await expect(page.locator("[data-tab]", { hasText: "Clear Filter Test" })).toBeVisible();
  const countAll = await page.locator("[data-tab]").count();
  expect(countAll).toBeGreaterThan(1);

  await page.locator("[data-filter]").fill("Clear Filter Test");
  await expect(page.locator("[data-tab]")).toHaveCount(1);

  await page.locator("[data-filter]").clear();
  await expect(page.locator("[data-tab]")).toHaveCount(countAll);

  await newPage.close();
});

test("select all only affects filtered tabs", async ({ context, page, extensionId }) => {
  const pageA = await context.newPage();
  await pageA.goto("data:text/html,<title>FilterSelectA</title>");
  await pageA.waitForLoadState("domcontentloaded");

  const pageB = await context.newPage();
  await pageB.goto("data:text/html,<title>FilterSelectB</title>");
  await pageB.waitForLoadState("domcontentloaded");

  const pageC = await context.newPage();
  await pageC.goto("data:text/html,<title>Other Tab</title>");
  await pageC.waitForLoadState("domcontentloaded");

  await page.goto(`chrome-extension://${extensionId}/sidepanel.html`);

  await expect(page.locator("[data-tab]", { hasText: "FilterSelectA" })).toBeVisible();
  await expect(page.locator("[data-tab]", { hasText: "FilterSelectB" })).toBeVisible();

  await page.locator("[data-filter]").fill("FilterSelect");
  await expect(page.locator("[data-tab]")).toHaveCount(2);

  await page.locator("[data-select-all]").click();

  await expect(page.locator("[data-selected-count]")).toHaveText("2 selected");

  await pageA.close();
  await pageB.close();
  await pageC.close();
});
