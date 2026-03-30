export default defineBackground(() => {
  const url = browser.runtime.getURL("/tabs.html");

  browser.action.onClicked.addListener(() => {
    browser.tabs.create({ url });
  });

  browser.contextMenus.create({
    id: "copy-link",
    title: "Copy link",
    contexts: ["action"],
  });

  browser.contextMenus.onClicked.addListener(async (info, tab) => {
    if (info.menuItemId !== "copy-link" || !tab?.id || !tab.url) return;

    await browser.scripting.executeScript({
      target: { tabId: tab.id },
      func: (text: string) => navigator.clipboard.writeText(text),
      args: [`[${tab.title}](${tab.url})`],
    });
  });
});
