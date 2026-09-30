/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useCallback, useEffect, useState } from "react";

export function useJson<T>(url: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!url) return;
    setLoading(true);
    try {
      const response = await fetch(url);
      const json = await response.json();
      if (!response.ok) {
        setError(json.error ?? "Request failed");
        setData(json);
      } else {
        setError(null);
        setData(json as T);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setLoading(false);
    }
  }, [url]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { data, error, loading, reload, setData };
}

export async function postJson<T>(url: string, body?: unknown): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : "{}",
  });
  const json = (await response.json()) as T & { error?: string };
  if (!response.ok) {
    const error = new Error(json.error ?? "Request failed") as Error & { status: number; payload: unknown };
    error.status = response.status;
    error.payload = json;
    throw error;
  }
  return json;
}

