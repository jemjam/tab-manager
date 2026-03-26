export default defineBackground(() => {
  const url = browser.runtime.getURL("/tabs.html");

  browser.action.onClicked.addListener(() => {
    browser.tabs.create({ url });
  });
});
