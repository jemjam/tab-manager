import { useEffect, useRef, useState } from "react";
import { browser, Browser } from "wxt/browser";

const FALLBACK_ICON =
  "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'><rect width='16' height='16' rx='2' fill='%23ccc'/></svg>";

function App() {
  const [tabs, setTabs] = useState<Browser.tabs.Tab[]>([]);
  const [selectedTabs, setSelectedTabs] = useState<Set<number>>(new Set());
  const [filter, setFilter] = useState("");

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

  const filteredTabs = tabs.filter((tab) => {
    if (!filter) return true;
    const q = filter.toLowerCase();
    return (
      tab.title?.toLowerCase().includes(q) ||
      tab.url?.toLowerCase().includes(q)
    );
  });

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

  const allSelected =
    filteredTabs.length > 0 &&
    filteredTabs.every((t) => t.id != null && selectedTabs.has(t.id));

  const toggleAll = () => {
    if (allSelected) {
      const filteredIds = new Set(
        filteredTabs.map((t) => t.id).filter((id): id is number => id != null),
      );
      setSelectedTabs(
        (prev) => new Set([...prev].filter((id) => !filteredIds.has(id))),
      );
    } else {
      const newIds = filteredTabs
        .map((t) => t.id)
        .filter((id): id is number => id != null);
      setSelectedTabs((prev) => new Set([...prev, ...newIds]));
    }
  };

  const closeSelected = () => {
    browser.tabs.remove([...selectedTabs]);
    setSelectedTabs(new Set());
  };

  const toMarkdownLink = (tab: Browser.tabs.Tab) =>
    `[${tab.title}](${tab.url})`;

  const copyLink = async (
    e: React.MouseEvent,
    tab: Browser.tabs.Tab,
    btn: HTMLButtonElement,
  ) => {
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
      <div className="sticky top-0 z-10 flex items-center gap-2 border-b border-gray-200 bg-white px-3 py-2 dark:border-gray-700 dark:bg-gray-900">
        <input
          type="checkbox"
          checked={allSelected}
          onChange={toggleAll}
          data-select-all
          className="shrink-0 cursor-pointer"
        />
        <input
          type="text"
          placeholder="Filter tabs..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          data-filter
          className="flex-1 rounded border border-gray-300 bg-transparent px-2 py-1 text-xs outline-none focus:border-blue-400 dark:border-gray-600 dark:focus:border-blue-500"
        />
        <span
          data-tab-count
          className="shrink-0 text-xs text-gray-500 dark:text-gray-400"
        >
          {filteredTabs.length} tabs
        </span>
      </div>

      <ul
        className={`flex flex-col ${selectedTabs.size > 0 ? "pb-12" : ""}`}
      >
        {filteredTabs.map((tab) => (
          <li
            key={tab.id}
            data-tab
            className={`group flex cursor-pointer items-center gap-2 border-b border-gray-100 px-3 py-2 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800 ${
              tab.active ? "bg-blue-50 dark:bg-blue-950" : ""
            } ${
              tab.id != null && selectedTabs.has(tab.id)
                ? "bg-blue-50/50 dark:bg-blue-900/30"
                : ""
            }`}
            onClick={() => activateTab(tab)}
          >
            {tab.id != null && (
              <input
                type="checkbox"
                data-tab-checkbox
                className="shrink-0 cursor-pointer"
                checked={selectedTabs.has(tab.id)}
                onClick={(e) => toggleSelect(e, tab.id!)}
                readOnly
              />
            )}
            <img
              className="size-4 shrink-0 rounded-sm"
              src={tab.favIconUrl || FALLBACK_ICON}
              alt=""
              onError={(e) => {
                (e.target as HTMLImageElement).src = FALLBACK_ICON;
              }}
            />
            <div className="min-w-0 flex-1">
              <div data-tab-title className="truncate text-[13px]">
                {tab.title || tab.url}
              </div>
              {tab.url && (
                <div
                  data-tab-url
                  className="truncate text-[11px] text-gray-400 dark:text-gray-500"
                >
                  {tab.url}
                </div>
              )}
            </div>
            {tab.id != null && (
              <button
                data-tab-copy
                className="flex shrink-0 cursor-pointer items-center justify-center rounded border-none bg-transparent text-sm opacity-0 size-5 group-hover:opacity-60 hover:!opacity-100 hover:bg-black/10 dark:hover:bg-white/10"
                onClick={(e) => copyLink(e, tab, e.currentTarget)}
                aria-label={`Copy link for ${tab.title}`}
              >
                ⧉
              </button>
            )}
            {tab.id != null && (
              <button
                data-tab-close
                className="flex shrink-0 cursor-pointer items-center justify-center rounded border-none bg-transparent text-sm opacity-0 size-5 group-hover:opacity-60 hover:!opacity-100 hover:bg-black/10 dark:hover:bg-white/10"
                onClick={(e) => closeTab(e, tab.id!)}
                aria-label={`Close ${tab.title}`}
              >
                ×
              </button>
            )}
          </li>
        ))}
      </ul>

      <div
        data-bulk-bar
        className={`fixed inset-x-0 bottom-0 z-20 flex items-center gap-2 border-t border-gray-200 bg-white px-3 py-2 shadow-lg transition-transform duration-200 dark:border-gray-700 dark:bg-gray-900 ${
          selectedTabs.size > 0 ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <span
          data-selected-count
          className="flex-1 text-xs text-gray-500 dark:text-gray-400"
        >
          {selectedTabs.size} selected
        </span>
        <button
          ref={copySelectedRef}
          data-copy-selected
          className="cursor-pointer rounded border border-gray-300 bg-transparent px-2 py-1 text-xs dark:border-gray-600"
          onClick={copySelected}
        >
          Copy Links
        </button>
        <button
          data-close-selected
          className="cursor-pointer rounded border border-red-300 bg-transparent px-2 py-1 text-xs text-red-600 dark:border-red-800 dark:text-red-400"
          onClick={closeSelected}
        >
          Close Selected
        </button>
      </div>
    </>
  );
}

export default App;
