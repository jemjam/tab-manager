import { expect, test } from "./fixtures";

test("renders a list of open tabs", async ({ page, extensionUrl }) => {
  await page.goto(`${extensionUrl}/tabs.html`);

  const items = page.locator("[data-tab]");
  await expect(items.first()).toBeVisible();
  expect(await items.count()).toBeGreaterThan(0);
});

test("displays tab titles", async ({ context, page, extensionUrl }) => {
  const newPage = await context.newPage();
  await newPage.goto("data:text/html,<title>Test Tab Title</title>");
  await newPage.waitForLoadState("domcontentloaded");

  await page.goto(`${extensionUrl}/tabs.html`);

  await expect(page.locator("[data-tab-title]", { hasText: "Test Tab Title" })).toBeVisible();

  await newPage.close();
});

test("displays tab URL below title", async ({ context, page, extensionUrl }) => {
  const newPage = await context.newPage();
  await newPage.goto("data:text/html,<title>URL Display Test</title>");
  await newPage.waitForLoadState("domcontentloaded");

  await page.goto(`${extensionUrl}/tabs.html`);

  const item = page.locator("[data-tab]", { hasText: "URL Display Test" });
  await expect(item).toBeVisible();
  await expect(item.locator("[data-tab-url]")).toBeVisible();
  await expect(item.locator("[data-tab-url]")).toContainText("data:text/html");

  await newPage.close();
});

test("clicking a row toggles selection", async ({ context, page, extensionUrl }) => {
  const newPage = await context.newPage();
  await newPage.goto("data:text/html,<title>Click Select Test</title>");
  await newPage.waitForLoadState("domcontentloaded");

  await page.goto(`${extensionUrl}/tabs.html`);

  const item = page.locator("[data-tab]", { hasText: "Click Select Test" });
  await expect(item).toBeVisible();

  const checkbox = item.locator("[data-tab-checkbox]");
  await expect(checkbox).not.toBeChecked();

  await item.click();
  await expect(checkbox).toBeChecked();

  await item.click();
  await expect(checkbox).not.toBeChecked();

  await newPage.close();
});

test("clicking a row does not activate the tab", async ({ context, page, extensionUrl }) => {
  const newPage = await context.newPage();
  await newPage.goto("data:text/html,<title>No Activate Test</title>");
  await newPage.waitForLoadState("domcontentloaded");

  await page.goto(`${extensionUrl}/tabs.html`);

  const item = page.locator("[data-tab]", { hasText: "No Activate Test" });
  await expect(item).toBeVisible();

  // The extension tab should remain in the foreground after clicking a row
  await item.click();
  await expect(page.locator("[data-tab]", { hasText: "No Activate Test" })).toBeVisible();
  // We're still on the extension page
  expect(page.url()).toContain("tabs.html");

  await newPage.close();
});

test("context menu opens and has four actions", async ({ context, page, extensionUrl }) => {
  const newPage = await context.newPage();
  await newPage.goto("data:text/html,<title>Menu Test</title>");
  await newPage.waitForLoadState("domcontentloaded");

  await page.goto(`${extensionUrl}/tabs.html`);

  const item = page.locator("[data-tab]", { hasText: "Menu Test" });
  await expect(item).toBeVisible();

  await item.hover();
  await item.locator("[data-tab-menu]").click();

  const menu = item.locator("[data-context-menu]");
  await expect(menu).toBeVisible();
  await expect(menu.locator("[data-menu-focus]")).toHaveText("Focus tab");
  await expect(menu.locator("[data-menu-copy]")).toHaveText("Copy link");
  await expect(menu.locator("[data-menu-duplicate]")).toHaveText("Duplicate tab");
  await expect(menu.locator("[data-menu-close]")).toHaveText("Close tab");

  await newPage.close();
});

test("context menu closes a tab", async ({ context, page, extensionUrl }) => {
  const newPage = await context.newPage();
  await newPage.goto("data:text/html,<title>Menu Close Test</title>");
  await newPage.waitForLoadState("domcontentloaded");

  await page.goto(`${extensionUrl}/tabs.html`);

  const item = page.locator("[data-tab]", { hasText: "Menu Close Test" });
  await expect(item).toBeVisible();
  const countBefore = await page.locator("[data-tab]").count();

  await item.hover();
  await item.locator("[data-tab-menu]").click();
  await item.locator("[data-menu-close]").click();

  await expect(page.locator("[data-tab]")).toHaveCount(countBefore - 1);
  await expect(item).not.toBeVisible();
});

test("context menu duplicates a tab", async ({ context, page, extensionUrl }) => {
  const newPage = await context.newPage();
  await newPage.goto("data:text/html,<title>Menu Dup Test</title>");
  await newPage.waitForLoadState("domcontentloaded");

  await page.goto(`${extensionUrl}/tabs.html`);

  const item = page.locator("[data-tab]", { hasText: "Menu Dup Test" });
  await expect(item).toBeVisible();
  const countBefore = await page.locator("[data-tab]").count();

  await item.hover();
  await item.locator("[data-tab-menu]").click();
  await item.locator("[data-menu-duplicate]").click();

  await expect(page.locator("[data-tab]")).toHaveCount(countBefore + 1);
});

test("context menu closes on outside click", async ({ context, page, extensionUrl }) => {
  const newPage = await context.newPage();
  await newPage.goto("data:text/html,<title>Menu Outside Test</title>");
  await newPage.waitForLoadState("domcontentloaded");

  await page.goto(`${extensionUrl}/tabs.html`);

  const item = page.locator("[data-tab]", { hasText: "Menu Outside Test" });
  await expect(item).toBeVisible();

  await item.hover();
  await item.locator("[data-tab-menu]").click();
  await expect(item.locator("[data-context-menu]")).toBeVisible();

  // Click outside the menu
  await page.locator("[data-filter]").click();
  await expect(item.locator("[data-context-menu]")).not.toBeVisible();

  await newPage.close();
});

test("filter clear button appears and clears filter", async ({ context, page, extensionUrl }) => {
  const newPage = await context.newPage();
  await newPage.goto("data:text/html,<title>Filter Clear Test</title>");
  await newPage.waitForLoadState("domcontentloaded");

  await page.goto(`${extensionUrl}/tabs.html`);

  // Clear button not visible when filter is empty
  await expect(page.locator("[data-filter-clear]")).not.toBeVisible();

  const countAll = await page.locator("[data-tab]").count();
  expect(countAll).toBeGreaterThan(1);

  await page.locator("[data-filter]").fill("Filter Clear Test");
  await expect(page.locator("[data-tab]")).toHaveCount(1);

  // Clear button should now be visible
  await expect(page.locator("[data-filter-clear]")).toBeVisible();

  await page.locator("[data-filter-clear]").click();
  await expect(page.locator("[data-tab]")).toHaveCount(countAll);
  await expect(page.locator("[data-filter-clear]")).not.toBeVisible();

  await newPage.close();
});

test("bulk action bar always visible, menu items disabled when nothing selected", async ({ page, extensionUrl }) => {
  await page.goto(`${extensionUrl}/tabs.html`);
  await expect(page.locator("[data-tab]").first()).toBeVisible();

  // Bar is visible
  await expect(page.locator("[data-bulk-bar]")).toBeVisible();

  // Selected count element is hidden when nothing selected
  await expect(page.locator("[data-selected-count]")).not.toBeVisible();

  // Open the bulk menu — items are disabled
  await page.locator("[data-bulk-menu-button]").click();
  await expect(page.locator("[data-bulk-menu]")).toBeVisible();
  await expect(page.locator("[data-copy-selected]")).toBeDisabled();
  await expect(page.locator("[data-close-selected]")).toBeDisabled();
});

test("bulk action bar enables when tabs selected", async ({ context, page, extensionUrl }) => {
  const newPage = await context.newPage();
  await newPage.goto("data:text/html,<title>Bar Enable Test</title>");
  await newPage.waitForLoadState("domcontentloaded");

  await page.goto(`${extensionUrl}/tabs.html`);

  const item = page.locator("[data-tab]", { hasText: "Bar Enable Test" });
  await expect(item).toBeVisible();

  await item.click();

  await expect(page.locator("[data-selected-count]")).toHaveText("1 Selected");

  await page.locator("[data-bulk-menu-button]").click();
  await expect(page.locator("[data-copy-selected]")).toBeEnabled();
  await expect(page.locator("[data-close-selected]")).toBeEnabled();

  await newPage.close();
});

test("clear selected deselects all tabs", async ({ context, page, extensionUrl }) => {
  const newPage = await context.newPage();
  await newPage.goto("data:text/html,<title>Clear Select Test</title>");
  await newPage.waitForLoadState("domcontentloaded");

  await page.goto(`${extensionUrl}/tabs.html`);

  const item = page.locator("[data-tab]", { hasText: "Clear Select Test" });
  await expect(item).toBeVisible();

  await item.click();
  await expect(page.locator("[data-selected-count]")).toHaveText("1 Selected");

  await page.locator("[data-clear-selected]").click();
  await expect(page.locator("[data-selected-count]")).not.toBeVisible();
  await expect(item.locator("[data-tab-checkbox]")).not.toBeChecked();

  await newPage.close();
});

test("batch copy with selection sets data-copied attribute", async ({ context, page, extensionUrl }) => {
  const pageA = await context.newPage();
  await pageA.goto("data:text/html,<title>Link A</title>");
  await pageA.waitForLoadState("domcontentloaded");

  const pageB = await context.newPage();
  await pageB.goto("data:text/html,<title>Link B</title>");
  await pageB.waitForLoadState("domcontentloaded");

  await page.goto(`${extensionUrl}/tabs.html`);

  await expect(page.locator("[data-tab]", { hasText: "Link A" })).toBeVisible();
  await expect(page.locator("[data-tab]", { hasText: "Link B" })).toBeVisible();

  // Click rows to select (not checkboxes)
  await page.locator("[data-tab]", { hasText: "Link A" }).click();
  await page.locator("[data-tab]", { hasText: "Link B" }).click();

  await page.locator("[data-bulk-menu-button]").click();
  const copyBtn = page.locator("[data-copy-selected]");
  await expect(copyBtn).toBeEnabled();
  await copyBtn.click();

  // Menu closes after copy; reopen to inspect copied state
  await page.locator("[data-bulk-menu-button]").click();
  await expect(page.locator("[data-copy-selected]")).toHaveAttribute("data-copied", "true");

  await pageA.close();
  await pageB.close();
});

test("selects and closes multiple tabs at once", async ({ context, page, extensionUrl }) => {
  const pageAlpha = await context.newPage();
  await pageAlpha.goto("data:text/html,<title>Alpha</title>");
  await pageAlpha.waitForLoadState("domcontentloaded");

  const pageBravo = await context.newPage();
  await pageBravo.goto("data:text/html,<title>Bravo</title>");
  await pageBravo.waitForLoadState("domcontentloaded");

  const pageCharlie = await context.newPage();
  await pageCharlie.goto("data:text/html,<title>Charlie</title>");
  await pageCharlie.waitForLoadState("domcontentloaded");

  await page.goto(`${extensionUrl}/tabs.html`);

  await expect(page.locator("[data-tab]", { hasText: "Alpha" })).toBeVisible();
  await expect(page.locator("[data-tab]", { hasText: "Bravo" })).toBeVisible();
  await expect(page.locator("[data-tab]", { hasText: "Charlie" })).toBeVisible();

  // Click rows to select
  await page.locator("[data-tab]", { hasText: "Alpha" }).click();
  await page.locator("[data-tab]", { hasText: "Charlie" }).click();

  await expect(page.locator("[data-selected-count]")).toHaveText("2 Selected");

  const countBefore = await page.locator("[data-tab]").count();

  await page.locator("[data-bulk-menu-button]").click();
  await page.locator("[data-close-selected]").click();

  await expect(page.locator("[data-tab]")).toHaveCount(countBefore - 2);
  await expect(page.locator("[data-tab]", { hasText: "Bravo" })).toBeVisible();
  await expect(page.locator("[data-tab]", { hasText: "Alpha" })).not.toBeVisible();
  await expect(page.locator("[data-tab]", { hasText: "Charlie" })).not.toBeVisible();
});

test("filters tabs by title", async ({ context, page, extensionUrl }) => {
  const newPage = await context.newPage();
  await newPage.goto("data:text/html,<title>Unique Filter Target</title>");
  await newPage.waitForLoadState("domcontentloaded");

  await page.goto(`${extensionUrl}/tabs.html`);
  await expect(page.locator("[data-tab]", { hasText: "Unique Filter Target" })).toBeVisible();

  const countBefore = await page.locator("[data-tab]").count();
  expect(countBefore).toBeGreaterThan(1);

  await page.locator("[data-filter]").fill("Unique Filter Target");

  await expect(page.locator("[data-tab]")).toHaveCount(1);
  await expect(page.locator("[data-tab-title]", { hasText: "Unique Filter Target" })).toBeVisible();

  await newPage.close();
});

test("filters tabs by URL", async ({ context, page, extensionUrl }) => {
  const newPage = await context.newPage();
  await newPage.goto("data:text/html,<title>URL Filter Test</title>");
  await newPage.waitForLoadState("domcontentloaded");

  await page.goto(`${extensionUrl}/tabs.html`);
  await expect(page.locator("[data-tab]", { hasText: "URL Filter Test" })).toBeVisible();

  await page.locator("[data-filter]").fill("data:text/html");

  const filtered = page.locator("[data-tab]");
  await expect(filtered.first()).toBeVisible();
  for (const url of await filtered.locator("[data-tab-url]").allTextContents()) {
    expect(url.toLowerCase()).toContain("data:text/html");
  }

  await newPage.close();
});

test("select all only affects filtered tabs", async ({ context, page, extensionUrl }) => {
  const pageA = await context.newPage();
  await pageA.goto("data:text/html,<title>FilterSelectA</title>");
  await pageA.waitForLoadState("domcontentloaded");

  const pageB = await context.newPage();
  await pageB.goto("data:text/html,<title>FilterSelectB</title>");
  await pageB.waitForLoadState("domcontentloaded");

  const pageC = await context.newPage();
  await pageC.goto("data:text/html,<title>Other Tab</title>");
  await pageC.waitForLoadState("domcontentloaded");

  await page.goto(`${extensionUrl}/tabs.html`);

  await expect(page.locator("[data-tab]", { hasText: "FilterSelectA" })).toBeVisible();
  await expect(page.locator("[data-tab]", { hasText: "FilterSelectB" })).toBeVisible();

  await page.locator("[data-filter]").fill("FilterSelect");
  await expect(page.locator("[data-tab]")).toHaveCount(2);

  await page.locator("[data-select-all]").click();

  await expect(page.locator("[data-selected-count]")).toHaveText("2 Selected");

  await pageA.close();
  await pageB.close();
  await pageC.close();
});
