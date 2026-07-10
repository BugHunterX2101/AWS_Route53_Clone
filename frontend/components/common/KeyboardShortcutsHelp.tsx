"use client";
import { useKeyboardShortcuts } from "@/context/KeyboardShortcutsContext";
import { X, Keyboard } from "lucide-react";

const STATIC_SHORTCUTS = [
  { key: "?", description: "Show/hide this help dialog" },
  { key: "Esc", description: "Close any open modal or dialog" },
  { key: "n", description: "Create a new hosted zone (on Hosted Zones page)" },
  { key: "r", description: "Refresh the current table" },
  { key: "c", description: "Create a new DNS record (on zone detail page)" },
];

export function KeyboardShortcutsHelp() {
  const { helpOpen, setHelpOpen } = useKeyboardShortcuts();

  if (!helpOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center"
        onClick={() => setHelpOpen(false)}
      >
        {/* Modal */}
        <div
          className="bg-white dark:bg-gray-900 rounded-lg shadow-aws-lg border border-gray-200 dark:border-gray-700 w-full max-w-md mx-4 animate-fade-in"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-label="Keyboard shortcuts"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <Keyboard className="w-5 h-5 text-aws-teal" />
              <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                Keyboard Shortcuts
              </h2>
            </div>
            <button
              onClick={() => setHelpOpen(false)}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Shortcuts list */}
          <div className="px-6 py-4">
            <table className="w-full">
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {STATIC_SHORTCUTS.map((s) => (
                  <tr key={s.key} className="py-2">
                    <td className="py-2.5 pr-6 w-16">
                      <kbd className="inline-flex items-center px-2 py-1 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-xs font-mono text-gray-700 dark:text-gray-300 shadow-sm">
                        {s.key}
                      </kbd>
                    </td>
                    <td className="py-2.5 text-sm text-gray-600 dark:text-gray-400">
                      {s.description}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-4 text-xs text-gray-400 dark:text-gray-500">
              Shortcuts are disabled while typing in input fields or when a dialog is open.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
