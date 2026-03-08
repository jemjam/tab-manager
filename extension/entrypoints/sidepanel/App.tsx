import { useEffect, useRef, useState } from "react";
import { browser, Browser } from "wxt/browser";

const FALLBACK_ICON =
  "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'><rect width='16' height='16' rx='2' fill='%23ccc'/></svg>";

function App() {
  const [tabs, setTabs] = useState<Browser.tabs.Tab[]>([]);
  const [selectedTabs, setSelectedTabs] = useState<Set<number>>(new Set());

  useEffect(() => {
    const refresh = () => {
      browser.tabs.query({}).then((newTabs) => {
        setTabs(newTabs);
        setSelectedTabs((prev) => {
          const validIds = new Set(newTabs.map((t) => t.id));
          const next = new Set([...prev].filter((id) => validIds.has(id)));
          return next.size === prev.size ? prev : next;
        });
      });
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

  const toggleSelect = (e: React.MouseEvent, tabId: number) => {
    e.stopPropagation();
    setSelectedTabs((prev) => {
      const next = new Set(prev);
      if (next.has(tabId)) next.delete(tabId);
      else next.add(tabId);
      return next;
    });
  };

  const allSelected = tabs.length > 0 && tabs.every((t) => t.id != null && selectedTabs.has(t.id));

  const toggleAll = () => {
    if (allSelected) {
      setSelectedTabs(new Set());
    } else {
      setSelectedTabs(new Set(tabs.map((t) => t.id).filter((id): id is number => id != null)));
    }
  };

  const closeSelected = () => {
    browser.tabs.remove([...selectedTabs]);
    setSelectedTabs(new Set());
  };

  const toMarkdownLink = (tab: Browser.tabs.Tab) =>
    `[${tab.title}](${tab.url})`;

  const copyLink = async (e: React.MouseEvent, tab: Browser.tabs.Tab, btn: HTMLButtonElement) => {
    e.stopPropagation();
    await navigator.clipboard.writeText(toMarkdownLink(tab));
    btn.dataset.copied = "true";
    btn.textContent = "\u2713";
    setTimeout(() => {
      btn.dataset.copied = "";
      btn.textContent = "\u29C9";
    }, 1000);
  };

  const copySelectedRef = useRef<HTMLButtonElement>(null);

  const copySelected = async () => {
    const text = tabs
      .filter((t) => t.id != null && selectedTabs.has(t.id))
      .map(toMarkdownLink)
      .join("\n");
    await navigator.clipboard.writeText(text);
    const btn = copySelectedRef.current;
    if (btn) {
      btn.dataset.copied = "true";
      btn.textContent = "\u2713 Copied";
      setTimeout(() => {
        btn.dataset.copied = "";
        btn.textContent = "Copy Links";
      }, 1000);
    }
  };

  return (
    <>
      <div className="tab-header">
        <button className="toggle-all" onClick={toggleAll}>
          {allSelected ? "Deselect All" : "Select All"}
        </button>
        <span className="selected-count">
          {selectedTabs.size > 0 ? `${selectedTabs.size} selected` : ""}
        </span>
        <button
          ref={copySelectedRef}
          className="copy-selected"
          disabled={selectedTabs.size === 0}
          onClick={copySelected}
        >
          Copy Links
        </button>
        <button
          className="close-selected"
          disabled={selectedTabs.size === 0}
          onClick={closeSelected}
        >
          Close Selected
        </button>
      </div>
      <ul className="tab-list">
        {tabs.map((tab) => (
          <li
            key={tab.id}
            className={`tab-item${tab.active ? " active" : ""}${tab.id != null && selectedTabs.has(tab.id) ? " selected" : ""}`}
            onClick={() => activateTab(tab)}
          >
            {tab.id != null && (
              <input
                type="checkbox"
                className="tab-checkbox"
                checked={selectedTabs.has(tab.id)}
                onClick={(e) => toggleSelect(e, tab.id!)}
                readOnly
              />
            )}
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
                className="tab-copy"
                onClick={(e) => copyLink(e, tab, e.currentTarget)}
                aria-label={`Copy link for ${tab.title}`}
              >
                ⧉
              </button>
            )}
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
    </>
  );
}

export default App;
