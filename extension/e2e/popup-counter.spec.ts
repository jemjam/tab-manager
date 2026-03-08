import { expect, test } from "./fixtures";

test("popup counter increments on click", async ({ page, extensionId }) => {
  await page.goto(`chrome-extension://${extensionId}/popup.html`);

  const button = page.locator(".card button");
  await expect(button).toHaveText("count is 0");

  await button.click();
  await expect(button).toHaveText("count is 1");
});
