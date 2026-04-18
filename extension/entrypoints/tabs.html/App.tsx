import { useCallback, useEffect, useRef, useState } from "react";
import { browser, Browser } from "wxt/browser";
import clsx from "clsx";

type Tab = Browser.tabs.Tab & { id: number };

function tabHost(tab: Tab): string {
  if (!tab.url) return "";
  try {
    return new URL(tab.url).hostname;
  } catch {
    return "";
  }
}

function tabLetter(tab: Tab): string {
  const host = tabHost(tab);
  const source = host || tab.title || "?";
  const first = source.replace(/^www\./, "").trim().charAt(0);
  return (first || "?").toUpperCase();
}

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = Math.imul(h, 31) + s.charCodeAt(i);
  return h;
}

function tabColor(tab: Tab): string {
  const seed = tabHost(tab) || tab.title || String(tab.id);
  const hue = Math.abs(hashString(seed)) % 360;
  return `hsl(${hue} 55% 45%)`;
}

function Favicon({ tab, className }: { tab: Tab; className?: string }) {
  const [errored, setErrored] = useState(false);
  useEffect(() => setErrored(false), [tab.favIconUrl]);

  const hasIcon = !!tab.favIconUrl && !errored;
  if (hasIcon) {
    return (
      <img
        className={clsx("rounded-sm", className)}
        src={tab.favIconUrl}
        alt=""
        onError={() => setErrored(true)}
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      className={clsx(
        "flex items-center justify-center rounded-sm text-[10px] font-semibold leading-none text-white",
        className,
      )}
      style={{ background: tabColor(tab) }}
    >
      {tabLetter(tab)}
    </span>
  );
}

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

function ContextMenu({
  tab,
  onClose,
  onCopied,
}: {
  tab: Tab;
  onClose: () => void;
  onCopied: (tabId: number) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  const focusTab = () => {
    browser.tabs.update(tab.id, { active: true });
    if (tab.windowId != null)
      browser.windows.update(tab.windowId, { focused: true });
    onClose();
  };

  const copyLink = async () => {
    await navigator.clipboard.writeText(`[${tab.title}](${tab.url})`);
    onCopied(tab.id);
    onClose();
  };

  const duplicateTab = () => {
    browser.tabs.duplicate(tab.id);
    onClose();
  };

  const closeTab = () => {
    browser.tabs.remove(tab.id).catch(() => {});
    onClose();
  };

  return (
    <div
      ref={ref}
      data-context-menu
      className="absolute right-0 top-full z-30 mt-1 min-w-[140px] rounded border border-border bg-surface py-1 shadow-lg"
    >
      <button
        data-menu-focus
        className="w-full cursor-pointer px-3 py-1.5 text-left text-[11px] hover:bg-hover"
        onClick={focusTab}
      >
        Focus tab
      </button>
      <button
        data-menu-copy
        className="w-full cursor-pointer px-3 py-1.5 text-left text-[11px] hover:bg-hover"
        onClick={copyLink}
      >
        Copy link
      </button>
      <button
        data-menu-duplicate
        className="w-full cursor-pointer px-3 py-1.5 text-left text-[11px] hover:bg-hover"
        onClick={duplicateTab}
      >
        Duplicate tab
      </button>
      <button
        data-menu-close
        className="w-full cursor-pointer px-3 py-1.5 text-left text-[11px] text-danger hover:bg-hover"
        onClick={closeTab}
      >
        Close tab
      </button>
    </div>
  );
}

function BulkMenu({
  onClose,
  onCopy,
  onCloseTabs,
  copied,
  disabled,
}: {
  onClose: () => void;
  onCopy: () => void;
  onCloseTabs: () => void;
  copied: boolean;
  disabled: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  return (
    <div
      ref={ref}
      data-bulk-menu
      className="absolute right-0 top-full z-30 mt-1 min-w-[140px] rounded border border-border bg-surface py-1 shadow-lg"
    >
      <button
        data-copy-selected
        data-copied={copied ? "true" : undefined}
        disabled={disabled}
        className={clsx(
          "w-full px-3 py-1.5 text-left text-[11px]",
          disabled ? "cursor-default opacity-40" : "cursor-pointer hover:bg-hover",
        )}
        onClick={onCopy}
      >
        {copied ? "\u2713 Copied" : "Copy Links"}
      </button>
      <button
        data-close-selected
        disabled={disabled}
        className={clsx(
          "w-full px-3 py-1.5 text-left text-[11px] text-danger",
          disabled ? "cursor-default opacity-40" : "cursor-pointer hover:bg-hover",
        )}
        onClick={onCloseTabs}
      >
        Close Selected
      </button>
    </div>
  );
}

function App() {
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [selectedTabs, setSelectedTabs] = useState<Set<number>>(new Set());
  const [filter, setFilter] = useState("");
  const [copiedTabId, setCopiedTabId] = useState<number | null>(null);
  const copiedTabTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [bulkCopied, triggerBulkCopied] = useCopied();
  const [menuTabId, setMenuTabId] = useState<number | null>(null);
  const [bulkMenuOpen, setBulkMenuOpen] = useState(false);
  const filterRef = useRef<HTMLInputElement>(null);
  const selectAllRef = useRef<HTMLInputElement>(null);

  useEffect(() => () => clearTimeout(copiedTabTimer.current), []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "/" && document.activeElement !== filterRef.current) {
        e.preventDefault();
        filterRef.current?.focus();
      }
      if (e.key === "Escape" && document.activeElement === filterRef.current) {
        setFilter("");
        filterRef.current?.blur();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

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

  const toggleSelect = (tabId: number) => {
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
  const someSelected = filteredTabs.some((t) => selectedTabs.has(t.id));
  const indeterminate = someSelected && !allSelected;

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = indeterminate;
    }
  }, [indeterminate]);

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
    browser.tabs.remove([...selectedTabs]).catch(() => {});
    setSelectedTabs(new Set());
  };

  const toMarkdownLink = (tab: Tab) => `[${tab.title}](${tab.url})`;

  const handleCopied = (tabId: number) => {
    setCopiedTabId(tabId);
    clearTimeout(copiedTabTimer.current);
    copiedTabTimer.current = setTimeout(() => setCopiedTabId(null), 1000);
  };

  const copySelected = async () => {
    const selected = tabs.filter((t) => selectedTabs.has(t.id));
    const text =
      selected.length === 1
        ? toMarkdownLink(selected[0])
        : selected.map((t) => `- ${toMarkdownLink(t)}`).join("\n");
    await navigator.clipboard.writeText(text);
    triggerBulkCopied();
  };

  const hasSelection = selectedTabs.size > 0;

  return (
    <>
      <div className="sticky top-0 z-10 bg-surface px-3">
        <div className="border-b border-border px-3 pb-2 pt-3">
          <div className="relative">
            <input
              ref={filterRef}
              type="text"
              placeholder="Filter terms"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              data-filter
              className="h-7 w-full rounded-[3px] border border-input-border bg-transparent px-2 pr-6 text-[11px] leading-none outline-none placeholder:text-muted focus:border-accent"
            />
            {filter && (
              <button
                data-filter-clear
                className="absolute right-1 top-1/2 flex size-4 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border-none bg-transparent text-xs text-muted hover:text-on-surface"
                onClick={() => setFilter("")}
                aria-label="Clear filter"
              >
                ×
              </button>
            )}
          </div>

          <div
            data-bulk-bar
            className="mt-2 flex h-6 items-center gap-2"
          >
            <input
              ref={selectAllRef}
              type="checkbox"
              checked={allSelected}
              onChange={toggleAll}
              data-select-all
              className="size-4 shrink-0 cursor-pointer accent-accent"
            />
            <span data-tab-count className="text-[11px] text-muted">
              {filteredTabs.length} Tabs Visible
            </span>
            <div className="flex-1" />
            {hasSelection && (
              <button
                data-selected-count
                data-clear-selected
                className="cursor-pointer border-none bg-transparent p-0 text-[11px] text-accent hover:underline"
                onClick={() => setSelectedTabs(new Set())}
              >
                {selectedTabs.size} Selected
              </button>
            )}
            <div className="relative shrink-0">
              <button
                data-bulk-menu-button
                aria-label="Bulk actions"
                className="flex size-6 cursor-pointer items-center justify-center rounded border-none bg-transparent text-base font-bold leading-none text-muted hover:bg-hover hover:text-on-surface"
                onClick={() => setBulkMenuOpen((v) => !v)}
              >
                ⋮
              </button>
              {bulkMenuOpen && (
                <BulkMenu
                  onClose={() => setBulkMenuOpen(false)}
                  onCopy={() => {
                    copySelected();
                    setBulkMenuOpen(false);
                  }}
                  onCloseTabs={() => {
                    closeSelected();
                    setBulkMenuOpen(false);
                  }}
                  copied={bulkCopied}
                  disabled={!hasSelection}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      <ul className="flex flex-col px-3 pb-3">
        {filter && filteredTabs.length === 0 && (
          <li className="py-6 text-center text-[11px] text-muted">
            No tabs matching &ldquo;{filter}&rdquo;
          </li>
        )}
        {filteredTabs.map((tab) => (
          <li
            key={tab.id}
            data-tab
            className={clsx(
              "group flex min-h-16 cursor-pointer items-center gap-3 border-b border-border px-3 py-3 hover:bg-hover",
              tab.active && "bg-accent-subtle",
              selectedTabs.has(tab.id) &&
                "bg-accent-subtle shadow-[inset_3px_0_0_var(--color-accent)]",
            )}
            onClick={() => toggleSelect(tab.id)}
          >
            <span className="relative flex size-4 shrink-0 items-center justify-center">
              <Favicon
                tab={tab}
                className={clsx(
                  "size-4",
                  selectedTabs.has(tab.id)
                    ? "hidden"
                    : "flex group-hover:hidden",
                )}
              />
              <input
                type="checkbox"
                data-tab-checkbox
                className={clsx(
                  "size-4 cursor-pointer accent-accent",
                  selectedTabs.has(tab.id)
                    ? "block"
                    : "hidden group-hover:block",
                )}
                checked={selectedTabs.has(tab.id)}
                readOnly
              />
            </span>
            <div className="min-w-0 flex-1">
              <div
                data-tab-title
                className="truncate text-[13px] font-medium leading-tight text-on-surface"
              >
                {tab.title || tab.url}
              </div>
              {tab.url && (
                <div
                  data-tab-url
                  className="mt-0.5 truncate text-[11px] leading-tight text-muted"
                >
                  {tab.url}
                </div>
              )}
            </div>
            <div className="relative shrink-0">
              <button
                data-tab-menu
                className="flex size-6 cursor-pointer items-center justify-center rounded border-none bg-transparent text-base font-bold leading-none text-muted opacity-0 hover:bg-hover hover:text-on-surface group-hover:opacity-100"
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuTabId(menuTabId === tab.id ? null : tab.id);
                }}
                aria-label={`Actions for ${tab.title}`}
              >
                ⋮
              </button>
              {menuTabId === tab.id && (
                <ContextMenu
                  tab={tab}
                  onClose={() => setMenuTabId(null)}
                  onCopied={handleCopied}
                />
              )}
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}

export default App;
