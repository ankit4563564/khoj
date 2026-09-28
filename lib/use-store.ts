"use client";
import { useEffect, useState } from "react";
import { seed, type Store } from "./model";
const key = "khoj-demo-v1";
export function useStore() {
  const [data, setData] = useState<Store>(seed),
    [ready, setReady] = useState(false),
    [storageError, setStorageError] = useState("");
  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const d = JSON.parse(raw);
        if (
          d.version === 1 &&
          Array.isArray(d.items) &&
          Array.isArray(d.cases) &&
          Array.isArray(d.attempts)
        )
          setData(d);
      }
    } catch {
      setStorageError(
        "Saved demo data could not be read. This session starts with sample data.",
      );
    }
    setReady(true);
  }, []);
  useEffect(() => {
    if (ready)
      try {
        localStorage.setItem(key, JSON.stringify(data));
      } catch {
        setStorageError(
          "Browser storage is full or unavailable. Changes will last only for this session.",
        );
      }
  }, [data, ready]);
  return { data, setData, ready, storageError };
}
