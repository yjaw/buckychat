import { useCallback, useEffect, useState } from "react";
import { API_BASE_URL } from "../lib/api";

type Stats = { online: number; waiting: number; userCount: number };

export function useStats(intervalMs: number | null = null) {
  const [stats, setStats] = useState<Stats | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await window.fetch(`${API_BASE_URL}/api/stats`);
      if (!res.ok) return;
      const data = (await res.json()) as Stats;
      setStats(data);
    } catch {
      // ignore — stats are non-critical
    }
  }, []);

  useEffect(() => {
    load();
    if (intervalMs === null) return;
    const id = setInterval(load, intervalMs);
    return () => clearInterval(id);
  }, [intervalMs, load]);

  return { stats, refresh: load };
}
