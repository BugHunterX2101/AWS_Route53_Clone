"use client";
import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";

export interface Shortcut {
  key: string;
  description: string;
  action: () => void;
  disabled?: boolean;
}

interface KeyboardShortcutsContextType {
  registerShortcut: (id: string, shortcut: Shortcut) => void;
  unregisterShortcut: (id: string) => void;
  shortcuts: Record<string, Shortcut>;
  helpOpen: boolean;
  setHelpOpen: (open: boolean) => void;
}

const KeyboardShortcutsContext = createContext<KeyboardShortcutsContextType>({
  registerShortcut: () => {},
  unregisterShortcut: () => {},
  shortcuts: {},
  helpOpen: false,
  setHelpOpen: () => {},
});

export function KeyboardShortcutsProvider({ children }: { children: React.ReactNode }) {
  const [shortcuts, setShortcuts] = useState<Record<string, Shortcut>>({});
  const [helpOpen, setHelpOpen] = useState(false);
  const shortcutsRef = useRef<Record<string, Shortcut>>({});

  const registerShortcut = useCallback((id: string, shortcut: Shortcut) => {
    shortcutsRef.current = { ...shortcutsRef.current, [id]: shortcut };
    setShortcuts({ ...shortcutsRef.current });
  }, []);

  const unregisterShortcut = useCallback((id: string) => {
    const next = { ...shortcutsRef.current };
    delete next[id];
    shortcutsRef.current = next;
    setShortcuts({ ...next });
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Never fire shortcuts when user is typing in an input/textarea/select
      const target = e.target as HTMLElement;
      const tag = target?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select" || target?.isContentEditable) {
        return;
      }
      // Never fire if a modal is open (has [role="dialog"])
      // unless it's the help modal itself (Escape should still work)
      const modalOpen = !!document.querySelector("[role='dialog']");

      if (e.key === "?" && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setHelpOpen((prev) => !prev);
        return;
      }

      if (e.key === "Escape") {
        setHelpOpen(false);
        return;
      }

      // Don't fire other shortcuts when any modal is open
      if (modalOpen) return;

      // Fire registered shortcuts
      for (const shortcut of Object.values(shortcutsRef.current)) {
        if (shortcut.disabled) continue;
        if (e.key === shortcut.key && !e.ctrlKey && !e.metaKey && !e.altKey) {
          e.preventDefault();
          shortcut.action();
          return;
        }
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <KeyboardShortcutsContext.Provider
      value={{ registerShortcut, unregisterShortcut, shortcuts, helpOpen, setHelpOpen }}
    >
      {children}
    </KeyboardShortcutsContext.Provider>
  );
}

export function useKeyboardShortcuts() {
  return useContext(KeyboardShortcutsContext);
}
