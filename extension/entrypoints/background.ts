export default defineBackground(() => {
  const url = browser.runtime.getURL("/tabs.html");

  // Firefox exposes browser.sidebarAction (not typed by WXT)
  const sidebarAction = (browser as unknown as Record<string, unknown>)
    .sidebarAction as { open?: () => Promise<void> } | undefined;
  browser.action.onClicked.addListener(async (tab) => {
    if (browser.sidePanel && tab?.windowId) {
      await browser.sidePanel.open({ windowId: tab.windowId });
    } else if (sidebarAction?.open) {
      await sidebarAction.open();
    } else {
      browser.tabs.create({ url });
    }
  });

  browser.contextMenus.create({
    id: "copy-link",
    title: "Copy link",
    contexts: ["action"],
  });

  browser.contextMenus.create({
    id: "open-full-page",
    title: "Open full page",
    contexts: ["action"],
  });

  browser.contextMenus.onClicked.addListener(async (info, tab) => {
    if (info.menuItemId === "copy-link") {
      if (!tab?.id || !tab.url) return;
      await browser.scripting.executeScript({
        target: { tabId: tab.id },
        func: (text: string) => navigator.clipboard.writeText(text),
        args: [`[${tab.title}](${tab.url})`],
      });
    }

    if (info.menuItemId === "open-full-page") {
      browser.tabs.create({ url });
    }
  });
});
