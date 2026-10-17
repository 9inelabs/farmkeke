"use client";

// A tiny persisted store for browser-only state (cart, chosen area, cookie
// choices). Survives reloads, syncs across tabs, and renders the fallback
// on the server so there is no hydration mismatch.
import { useSyncExternalStore } from "react";

export type LocalStore<T> = {
  get: () => T;
  set: (next: T | ((prev: T) => T)) => void;
  subscribe: (listener: () => void) => () => void;
  use: () => T;
};

export function createLocalStore<T>(key: string, fallback: T): LocalStore<T> {
  let cache: T | undefined;
  const listeners = new Set<() => void>();

  const read = (): T => {
    if (cache !== undefined) return cache;
    try {
      const raw = window.localStorage.getItem(key);
      cache = raw ? (JSON.parse(raw) as T) : fallback;
    } catch {
      cache = fallback;
    }
    return cache;
  };

  const get = () => (typeof window === "undefined" ? fallback : read());

  const set = (next: T | ((prev: T) => T)) => {
    const value = typeof next === "function" ? (next as (p: T) => T)(get()) : next;
    cache = value;
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Private mode or storage full: keep working in memory.
    }
    listeners.forEach((l) => l());
  };

  const subscribe = (listener: () => void) => {
    listeners.add(listener);
    const onStorage = (e: StorageEvent) => {
      if (e.key === key) {
        cache = undefined;
        listener();
      }
    };
    window.addEventListener("storage", onStorage);
    return () => {
      listeners.delete(listener);
      window.removeEventListener("storage", onStorage);
    };
  };

  const use = () => useSyncExternalStore(subscribe, get, () => fallback);

  return { get, set, subscribe, use };
}

/** Same API, but in memory only (UI state that should not survive a reload). */
export function createMemoryStore<T>(initial: T): LocalStore<T> {
  let value = initial;
  const listeners = new Set<() => void>();
  const get = () => value;
  const set = (next: T | ((prev: T) => T)) => {
    value = typeof next === "function" ? (next as (p: T) => T)(value) : next;
    listeners.forEach((l) => l());
  };
  const subscribe = (listener: () => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  };
  const use = () => useSyncExternalStore(subscribe, get, () => initial);
  return { get, set, subscribe, use };
}
