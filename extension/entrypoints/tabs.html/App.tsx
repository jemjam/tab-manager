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

function Highlight({ text, term }: { text: string; term: string }) {
  if (!term) return <>{text}</>;
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const parts = text.split(new RegExp(`(${escaped})`, "gi"));
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === term.toLowerCase() ? (
          <mark key={i} className="bg-highlight text-inherit">
            {part}
          </mark>
        ) : (
          part
        ),
      )}
    </>
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

function useFocusTrap(
  ref: React.RefObject<HTMLElement | null>,
  triggerRef: React.RefObject<HTMLElement | null>,
  onClose: () => void,
) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const buttons = el.querySelectorAll<HTMLElement>("button:not([disabled])");
    if (buttons.length) buttons[0].focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        triggerRef.current?.focus();
        onCloseRef.current();
        return;
      }
      if (e.key !== "Tab" || !buttons.length) return;
      const first = buttons[0];
      const last = buttons[buttons.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    el.addEventListener("keydown", handleKeyDown);
    return () => el.removeEventListener("keydown", handleKeyDown);
  }, [ref, triggerRef]);
}

function ContextMenu({
  tab,
  triggerRef,
  onClose,
  onCopied,
  onFilterDomain,
}: {
  tab: Tab;
  triggerRef: React.RefObject<HTMLElement | null>;
  onClose: () => void;
  onCopied: (tabId: number) => void;
  onFilterDomain: (domain: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  useFocusTrap(ref, triggerRef, onClose);

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

  const filterDomain = () => {
    const host = tabHost(tab);
    if (host) onFilterDomain(host);
    onClose();
  };

  const host = tabHost(tab);

  const closeTab = () => {
    browser.tabs.remove(tab.id).catch(() => {});
    onClose();
  };

  return (
    <div
      ref={ref}
      role="menu"
      data-context-menu
      onClick={(e) => e.stopPropagation()}
      className="absolute right-0 top-full z-30 mt-1 min-w-[140px] rounded border border-border bg-surface py-1 shadow-lg"
    >
      <button
        role="menuitem"
        data-menu-focus
        className="w-full cursor-pointer px-3 py-1.5 text-left text-[11px] hover:bg-hover focus:bg-hover focus:outline-none"
        onClick={focusTab}
      >
        Focus tab
      </button>
      <button
        role="menuitem"
        data-menu-copy
        className="w-full cursor-pointer px-3 py-1.5 text-left text-[11px] hover:bg-hover focus:bg-hover focus:outline-none"
        onClick={copyLink}
      >
        Copy link
      </button>
      <button
        role="menuitem"
        data-menu-duplicate
        className="w-full cursor-pointer px-3 py-1.5 text-left text-[11px] hover:bg-hover focus:bg-hover focus:outline-none"
        onClick={duplicateTab}
      >
        Duplicate tab
      </button>
      {host && (
        <button
          role="menuitem"
          data-menu-filter-domain
          className="w-full cursor-pointer px-3 py-1.5 text-left text-[11px] hover:bg-hover focus:bg-hover focus:outline-none"
          onClick={filterDomain}
        >
          Filter on this domain
        </button>
      )}
      <button
        role="menuitem"
        data-menu-close
        className="w-full cursor-pointer px-3 py-1.5 text-left text-[11px] text-danger hover:bg-hover focus:bg-hover focus:outline-none"
        onClick={closeTab}
      >
        Close tab
      </button>
    </div>
  );
}

function BulkMenu({
  triggerRef,
  onClose,
  onCopy,
  onCloseTabs,
  copied,
  disabled,
}: {
  triggerRef: React.RefObject<HTMLElement | null>;
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

  useFocusTrap(ref, triggerRef, onClose);

  return (
    <div
      ref={ref}
      role="menu"
      data-bulk-menu
      className="absolute right-0 top-full z-30 mt-1 min-w-[140px] rounded border border-border bg-surface py-1 shadow-lg"
    >
      <button
        role="menuitem"
        data-copy-selected
        data-copied={copied ? "true" : undefined}
        disabled={disabled}
        className={clsx(
          "w-full px-3 py-1.5 text-left text-[11px]",
          disabled ? "cursor-default opacity-40" : "cursor-pointer hover:bg-hover focus:bg-hover focus:outline-none",
        )}
        onClick={onCopy}
      >
        {copied ? "\u2713 Copied" : "Copy Links"}
      </button>
      <button
        role="menuitem"
        data-close-selected
        disabled={disabled}
        className={clsx(
          "w-full px-3 py-1.5 text-left text-[11px] text-danger",
          disabled ? "cursor-default opacity-40" : "cursor-pointer hover:bg-hover focus:bg-hover focus:outline-none",
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
  const [filterInput, setFilterInput] = useState("");
  const [filter, setFilter] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const updateFilter = useCallback((value: string) => {
    setFilterInput(value);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setFilter(value), 100);
  }, []);
  useEffect(() => () => clearTimeout(debounceRef.current), []);
  const [copiedTabId, setCopiedTabId] = useState<number | null>(null);
  const copiedTabTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [bulkCopied, triggerBulkCopied] = useCopied();
  const [menuTabId, setMenuTabId] = useState<number | null>(null);
  const [bulkMenuOpen, setBulkMenuOpen] = useState(false);
  const filterRef = useRef<HTMLInputElement>(null);
  const selectAllRef = useRef<HTMLInputElement>(null);
  const selectionAnchor = useRef<number | null>(null);
  const bulkMenuBtnRef = useRef<HTMLButtonElement>(null);
  const tabMenuBtnRefs = useRef(new Map<number, HTMLButtonElement>());

  useEffect(() => () => clearTimeout(copiedTabTimer.current), []);

  const focusTab = (tab: Tab) => {
    browser.tabs.update(tab.id, { active: true });
    if (tab.windowId != null)
      browser.windows.update(tab.windowId, { focused: true });
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "/" && document.activeElement !== filterRef.current) {
        e.preventDefault();
        filterRef.current?.focus();
      }
      if (e.key === "Escape" && document.activeElement === filterRef.current) {
        updateFilter("");
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
      <div className="shrink-0 bg-surface">
        <div className="px-3 pb-2 pt-1">
          <div className="relative">
            <input
              ref={filterRef}
              type="text"
              placeholder="Filter terms"
              value={filterInput}
              onChange={(e) => updateFilter(e.target.value)}
              data-filter
              className="h-7 w-full rounded-[3px] border border-input-border bg-transparent px-2 pr-6 text-[11px] leading-none outline-none placeholder:text-muted focus:border-accent"
            />
            {filter && (
              <button
                data-filter-clear
                className="absolute right-1 top-1/2 flex size-5 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border-none bg-transparent text-base text-danger hover:text-danger"
                onClick={() => updateFilter("")}
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
              {filter
                ? `${filteredTabs.length} of ${tabs.length} tabs`
                : `All ${tabs.length} tabs`}
            </span>
            <div className="flex-1" />
            {hasSelection ? (
              <button
                data-selected-count
                data-clear-selected
                aria-label="Clear selection"
                className="cursor-pointer border-none bg-transparent p-0 text-[11px] text-accent hover:underline"
                onClick={() => setSelectedTabs(new Set())}
              >
                {selectedTabs.size} Selected
              </button>
            ) : (
              <span data-selected-count className="text-[11px] text-muted opacity-50">
                0 selected
              </span>
            )}
            <div className="relative shrink-0">
              <button
                ref={bulkMenuBtnRef}
                data-bulk-menu-button
                aria-label="Bulk actions"
                disabled={!hasSelection}
                className={clsx(
                  "flex size-6 items-center justify-center rounded border-none bg-transparent text-base font-bold leading-none",
                  hasSelection
                    ? "cursor-pointer text-muted hover:bg-hover hover:text-on-surface"
                    : "cursor-default text-muted opacity-40",
                )}
                onMouseDown={(e) => e.stopPropagation()}
                onClick={() => hasSelection && setBulkMenuOpen((v) => !v)}
              >
                ⋮
              </button>
              {bulkMenuOpen && (
                <BulkMenu
                  triggerRef={bulkMenuBtnRef}
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

      <ul className="flex flex-1 flex-col overflow-y-auto rounded-md border border-border">
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
              "group flex min-h-16 items-center gap-3 border-b border-border px-3 py-3 hover:bg-hover",
              tab.active && "bg-accent-subtle",
              selectedTabs.has(tab.id) &&
                "bg-accent-subtle shadow-[inset_3px_0_0_var(--color-accent)]",
            )}
            onDoubleClick={() => focusTab(tab)}
            onClick={(e) => {
              if (e.ctrlKey || e.metaKey) {
                e.preventDefault();
                toggleSelect(tab.id);
                selectionAnchor.current = tab.id;
              } else if (e.shiftKey) {
                e.preventDefault();
                const anchorId = selectionAnchor.current;
                if (anchorId == null) {
                  toggleSelect(tab.id);
                  selectionAnchor.current = tab.id;
                  return;
                }
                const anchorIdx = filteredTabs.findIndex((t) => t.id === anchorId);
                if (anchorIdx === -1) {
                  toggleSelect(tab.id);
                  selectionAnchor.current = tab.id;
                  return;
                }
                const clickIdx = filteredTabs.findIndex((t) => t.id === tab.id);
                const start = Math.min(anchorIdx, clickIdx);
                const end = Math.max(anchorIdx, clickIdx);
                setSelectedTabs((prev) => {
                  const next = new Set(prev);
                  for (let i = start; i <= end; i++) {
                    if (i === anchorIdx) continue;
                    const id = filteredTabs[i].id;
                    if (next.has(id)) next.delete(id);
                    else next.add(id);
                  }
                  return next;
                });
              }
            }}
          >
            <div
              className="relative -m-2 flex shrink-0 cursor-pointer items-center justify-center p-2"
              onClick={(e) => e.stopPropagation()}
              onDoubleClick={(e) => e.stopPropagation()}
            >
              <Favicon
                tab={tab}
                className={clsx(
                  "size-4",
                  selectedTabs.has(tab.id)
                    ? "invisible"
                    : "group-hover:invisible group-focus-within:invisible",
                )}
              />
              <input
                type="checkbox"
                data-tab-checkbox
                aria-label={`Select ${tab.title || tab.url}`}
                className={clsx(
                  "absolute size-4 cursor-pointer accent-accent",
                  selectedTabs.has(tab.id)
                    ? "opacity-100"
                    : "opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus:opacity-100",
                )}
                checked={selectedTabs.has(tab.id)}
                onChange={() => toggleSelect(tab.id)}
              />
            </div>
            <div className="min-w-0 flex-1">
              <div
                data-tab-title
                className="truncate text-[13px] font-medium leading-tight text-on-surface"
              >
                <Highlight text={tab.title || tab.url || ""} term={filter} />
              </div>
              {tab.url && (
                <div
                  data-tab-url
                  className="mt-0.5 truncate text-[11px] leading-tight text-muted"
                >
                  <Highlight text={tab.url} term={filter} />
                </div>
              )}
            </div>
            <div className="relative shrink-0">
              <button
                ref={(el) => {
                  if (el) tabMenuBtnRefs.current.set(tab.id, el);
                  else tabMenuBtnRefs.current.delete(tab.id);
                }}
                data-tab-menu
                className="flex size-6 cursor-pointer items-center justify-center rounded border-none bg-transparent text-base font-bold leading-none text-muted opacity-0 hover:bg-hover hover:text-on-surface focus:opacity-100 group-hover:opacity-100 group-focus-within:opacity-100"
                onMouseDown={(e) => e.stopPropagation()}
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
                  triggerRef={{ current: tabMenuBtnRefs.current.get(tab.id) ?? null }}
                  onClose={() => setMenuTabId(null)}
                  onCopied={handleCopied}
                  onFilterDomain={updateFilter}
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
