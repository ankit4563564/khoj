"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import type { PortalData } from "@/lib/rvu/types";
const initial: PortalData = {
  user: null,
  reports: [],
  claims: [],
  matches: [],
  notifications: [],
  audit: [],
  registeredItems: [], activity: [], handovers: [], foundIds: [],
  pipeline: {found:0,matching:0,verification:0,returned:0},
  identityStats: {total:0,linked:0,pending:0},
  config: {
    google: false,
    vision: false,
    email: false,
    domains: ["rvu.edu.in"],
  },
  stats: { lost: 0, found: 0, returned: 0, custody: 0 },
};
type Result = {
  ok?: boolean;
  id?: string;
  developmentLink?: string;
  message?: string;
};
export async function api(
  action: string,
  values: Record<string, unknown> = {},
): Promise<Result> {
  const response = await fetch("/api/rvu", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, ...values }),
  });
  const data = await response.json();
  if (!response.ok)
    throw new Error(data.error || "Request failed. Please try again.");
  return data;
}
const Context = createContext<{
  data: PortalData;
  loading: boolean;
  error: string;
  refreshing: boolean;
  lastUpdated: number | null;
  offline: boolean;
  refresh: () => Promise<void>;
  act: (action: string, values?: Record<string, unknown>) => Promise<Result>;
  toast: (message: string) => void;
} | null>(null);
export function PortalProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState(initial),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const [refreshing,setRefreshing]=useState(false),[lastUpdated,setLastUpdated]=useState<number|null>(null),[offline,setOffline]=useState(false);
  const requestVersion=useRef(0);
  const refresh = useCallback(async () => {
    const version=++requestVersion.current;
    setRefreshing(true);
    try {
      const response = await fetch("/api/rvu", { cache: "no-store", signal: AbortSignal.timeout(10000) });
      const next = await response.json();
      if (!response.ok)
        throw new Error(next.error || "Unable to load reports.");
      if(version!==requestVersion.current)return;
      setData({...initial,...next});
      setError("");
      setOffline(false);setLastUpdated(Date.now());
    } catch (e) {
      if(version!==requestVersion.current)return;
      setError(e instanceof Error ? e.message : "Unable to connect.");
      setOffline(true);
    } finally {
      if(version===requestVersion.current){setLoading(false);setRefreshing(false);}
    }
  }, []);
  useEffect(() => {
    void refresh();
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, 15000);
    const onFocus = () => void refresh();
    const onOffline=()=>setOffline(true);
    window.addEventListener("focus", onFocus);
    window.addEventListener('online',onFocus);window.addEventListener('offline',onOffline);
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener('online',onFocus);window.removeEventListener('offline',onOffline);
      clearTimeout(timer.current);
    };
  }, [refresh]);
  const toast = useCallback((text: string) => {
    setMessage(text);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setMessage(""), 5000);
  }, []);
  const act = useCallback(
    async (action: string, values: Record<string, unknown> = {}) => {
      const result = await api(action, values);
      await refresh();
      return result;
    },
    [refresh],
  );
  return (
    <Context.Provider value={{ data, loading, error, refreshing,lastUpdated,offline,refresh, act, toast }}>
      {children}
      {message && (
        <div className="rv-toast" role="status">
          {message}
          <button
            aria-label="Dismiss notification"
            onClick={() => setMessage("")}
          >
            ×
          </button>
        </div>
      )}
    </Context.Provider>
  );
}
export function usePortal() {
  const context = useContext(Context);
  if (!context) throw new Error("PortalProvider missing");
  return context;
}
