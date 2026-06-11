import { useEffect, useState } from "react";
import { API_BASE_URL } from "../lib/api";

type Stats = { online: number; waiting: number; userCount: number };

export function useStats(intervalMs: number | null = null) {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await window.fetch(`${API_BASE_URL}/api/stats`);
        if (!res.ok) return;
        const data = (await res.json()) as Stats;
        if (!cancelled) setStats(data);
      } catch {
        // ignore — stats are non-critical
      }
    }

    load();
    if (intervalMs === null) return () => { cancelled = true; };
    const id = setInterval(load, intervalMs);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [intervalMs]);

  return stats;
}
