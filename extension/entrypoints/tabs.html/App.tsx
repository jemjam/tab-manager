import { useCallback, useEffect, useRef, useState } from "react";
import { browser, Browser } from "wxt/browser";
import clsx from "clsx";

type Tab = Browser.tabs.Tab & { id: number };

const FALLBACK_ICON =
  "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'><rect width='16' height='16' rx='2' fill='%23ccc'/></svg>";

function useCopied(): [boolean, () => void] {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const trigger = useCallback(() => {
    setCopied(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 1000);
  }, []);

  useEffect(() => () => clearTimeout(timer.current), []);

  return [copied, trigger];
}

function App() {
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [selectedTabs, setSelectedTabs] = useState<Set<number>>(new Set());
  const [filter, setFilter] = useState("");
  const [copiedTabId, setCopiedTabId] = useState<number | null>(null);
  const copiedTabTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [bulkCopied, triggerBulkCopied] = useCopied();

  useEffect(() => () => clearTimeout(copiedTabTimer.current), []);

  useEffect(() => {
    const refresh = () => {
      browser.tabs.query({}).then((newTabs) => {
        const valid = newTabs.filter((t): t is Tab => t.id != null);
        setTabs(valid);
        setSelectedTabs((prev) => {
          const validIds = new Set(valid.map((t) => t.id));
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

  const activateTab = (tab: Tab) => {
    browser.tabs.update(tab.id, { active: true });
    if (tab.windowId != null) {
      browser.windows.update(tab.windowId, { focused: true });
    }
  };

  const toggleSelect = (e: React.MouseEvent, tabId: number) => {
    e.stopPropagation();
    const tab = tabs.find((t) => t.id === tabId);
    if (tab) console.log("Selected tab:", tab);
    setSelectedTabs((prev) => {
      const next = new Set(prev);
      if (next.has(tabId)) next.delete(tabId);
      else next.add(tabId);
      return next;
    });
  };

  const allSelected =
    filteredTabs.length > 0 &&
    filteredTabs.every((t) => selectedTabs.has(t.id));

  const toggleAll = () => {
    if (allSelected) {
      const filteredIds = new Set(filteredTabs.map((t) => t.id));
      setSelectedTabs(
        (prev) => new Set([...prev].filter((id) => !filteredIds.has(id))),
      );
    } else {
      const newIds = filteredTabs.map((t) => t.id);
      setSelectedTabs((prev) => new Set([...prev, ...newIds]));
    }
  };

  const closeSelected = () => {
    browser.tabs.remove([...selectedTabs]);
    setSelectedTabs(new Set());
  };

  const toMarkdownLink = (tab: Tab) => `[${tab.title}](${tab.url})`;

  const copyLink = async (e: React.MouseEvent, tab: Tab) => {
    e.stopPropagation();
    await navigator.clipboard.writeText(toMarkdownLink(tab));
    setCopiedTabId(tab.id);
    clearTimeout(copiedTabTimer.current);
    copiedTabTimer.current = setTimeout(() => setCopiedTabId(null), 1000);
  };

  const copySelected = async () => {
    const text = tabs
      .filter((t) => selectedTabs.has(t.id))
      .map(toMarkdownLink)
      .join("\n");
    await navigator.clipboard.writeText(text);
    triggerBulkCopied();
  };

  return (
    <>
      <div className="sticky top-0 z-10 flex items-center gap-2 border-b border-border bg-surface px-3 py-2">
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
          className="flex-1 rounded border border-border bg-transparent px-2 py-1 text-xs outline-none focus:border-accent"
        />
        <span
          data-tab-count
          className="shrink-0 text-xs text-muted"
        >
          {filteredTabs.length} tabs
        </span>
      </div>

      <ul
        className={clsx("flex flex-col", selectedTabs.size > 0 && "pt-12")}
      >
        {filteredTabs.map((tab) => (
          <li
            key={tab.id}
            data-tab
            className={clsx(
              "group flex cursor-pointer items-center gap-2 border-b border-border px-3 py-2 hover:bg-hover",
              tab.active && "bg-accent-subtle",
              selectedTabs.has(tab.id) && "bg-accent-subtler",
            )}
            onClick={() => activateTab(tab)}
          >
            <input
              type="checkbox"
              data-tab-checkbox
              className="shrink-0 cursor-pointer"
              checked={selectedTabs.has(tab.id)}
              onClick={(e) => toggleSelect(e, tab.id)}
              readOnly
            />
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
                  className="truncate text-[11px] text-muted"
                >
                  {tab.url}
                </div>
              )}
            </div>
            <button
              data-tab-copy
              data-copied={copiedTabId === tab.id ? "true" : undefined}
              className="flex shrink-0 cursor-pointer items-center justify-center rounded border-none bg-transparent text-sm opacity-0 size-5 group-hover:opacity-60 hover:!opacity-100 hover:bg-hover"
              onClick={(e) => copyLink(e, tab)}
              aria-label={`Copy link for ${tab.title}`}
            >
              {copiedTabId === tab.id ? "\u2713" : "\u29C9"}
            </button>
            <button
              data-tab-close
              className="flex shrink-0 cursor-pointer items-center justify-center rounded border-none bg-transparent text-sm opacity-0 size-5 group-hover:opacity-60 hover:!opacity-100 hover:bg-hover"
              onClick={(e) => closeTab(e, tab.id)}
              aria-label={`Close ${tab.title}`}
            >
              ×
            </button>
          </li>
        ))}
      </ul>

      <div
        data-bulk-bar
        className={clsx(
          "fixed inset-x-0 top-[37px] z-20 flex items-center gap-2 border-b border-border bg-surface px-3 py-2 shadow-lg transition-transform duration-200",
          selectedTabs.size > 0
            ? "translate-y-0 pointer-events-auto"
            : "-translate-y-[calc(100%+37px)] pointer-events-none",
        )}
      >
        <span
          data-selected-count
          className="flex-1 text-xs text-muted"
        >
          {selectedTabs.size} selected
        </span>
        <button
          data-copy-selected
          data-copied={bulkCopied ? "true" : undefined}
          className="cursor-pointer rounded border border-border bg-transparent px-2 py-1 text-xs"
          onClick={copySelected}
        >
          {bulkCopied ? "\u2713 Copied" : "Copy Links"}
        </button>
        <button
          data-close-selected
          className="cursor-pointer rounded border border-danger-border bg-transparent px-2 py-1 text-xs text-danger"
          onClick={closeSelected}
        >
          Close Selected
        </button>
      </div>
    </>
  );
}

export default App;
