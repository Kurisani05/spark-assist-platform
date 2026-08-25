import { useCallback, useEffect, useState } from "react";

import {
  defaultPreferences,
  loadItems,
  loadPreferences,
  savePreferences,
  seedSampleDataOnce,
  type Preferences,
  type StoredItem,
} from "@/lib/storage";

export function applyTheme(theme: "light" | "dark") {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("dark", theme === "dark");
}

/** Reactive list of locally stored items. Empty during SSR, hydrates on the client. */
export function useItems() {
  const [items, setItems] = useState<StoredItem[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    seedSampleDataOnce();
    setItems(loadItems());
    setReady(true);
    const sync = () => setItems(loadItems());
    window.addEventListener("aips:items-changed", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("aips:items-changed", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return { items, ready, refresh: useCallback(() => setItems(loadItems()), []) };
}

export function usePreferences() {
  const [prefs, setPrefs] = useState<Preferences>(defaultPreferences);

  useEffect(() => {
    const stored = loadPreferences();
    setPrefs(stored);
    applyTheme(stored.theme);
    const sync = () => {
      const next = loadPreferences();
      setPrefs(next);
      applyTheme(next.theme);
    };
    window.addEventListener("aips:prefs-changed", sync);
    return () => window.removeEventListener("aips:prefs-changed", sync);
  }, []);

  const update = useCallback((patch: Partial<Preferences>) => {
    const next = { ...loadPreferences(), ...patch };
    savePreferences(next);
    setPrefs(next);
    applyTheme(next.theme);
  }, []);

  return { prefs, update };
}
