import { useEffect, useState } from "react";
import { browser, Browser } from "wxt/browser";

const FALLBACK_ICON =
  "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'><rect width='16' height='16' rx='2' fill='%23ccc'/></svg>";

function App() {
  const [tabs, setTabs] = useState<Browser.tabs.Tab[]>([]);

  useEffect(() => {
    const refresh = () => {
      browser.tabs.query({}).then(setTabs);
    };

    refresh();

    browser.tabs.onCreated.addListener(refresh);
    browser.tabs.onRemoved.addListener(refresh);
    browser.tabs.onUpdated.addListener(refresh);

    return () => {
      browser.tabs.onCreated.removeListener(refresh);
      browser.tabs.onRemoved.removeListener(refresh);
      browser.tabs.onUpdated.removeListener(refresh);
    };
  }, []);

  const closeTab = (e: React.MouseEvent, tabId: number) => {
    e.stopPropagation();
    browser.tabs.remove(tabId);
  };

  const activateTab = (tab: Browser.tabs.Tab) => {
    if (tab.id != null) {
      browser.tabs.update(tab.id, { active: true });
      if (tab.windowId != null) {
        browser.windows.update(tab.windowId, { focused: true });
      }
    }
  };

  return (
    <ul className="tab-list">
      {tabs.map((tab) => (
        <li
          key={tab.id}
          className={`tab-item${tab.active ? " active" : ""}`}
          onClick={() => activateTab(tab)}
        >
          <img
            className="tab-favicon"
            src={tab.favIconUrl || FALLBACK_ICON}
            alt=""
            onError={(e) => {
              (e.target as HTMLImageElement).src = FALLBACK_ICON;
            }}
          />
          <span className="tab-title">{tab.title || tab.url}</span>
          {tab.id != null && (
            <button
              className="tab-close"
              onClick={(e) => closeTab(e, tab.id!)}
              aria-label={`Close ${tab.title}`}
            >
              ×
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}

export default App;
