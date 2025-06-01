import { useState, useEffect, useCallback } from 'react';

interface CacheOptions {
  ttl?: number; // Time to live in milliseconds
  staleWhileRevalidate?: boolean;
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  isStale: boolean;
}

const cache = new Map<string, CacheEntry<any>>();

export function useCachedFetch<T>(
  url: string,
  options: RequestInit = {},
  cacheOptions: CacheOptions = {}
) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const {
    ttl = 5 * 60 * 1000, // 5 minutes par défaut
    staleWhileRevalidate = true
  } = cacheOptions;

  const fetchData = useCallback(async (force = false) => {
    const cacheKey = `${url}-${JSON.stringify(options)}`;
    const cachedEntry = cache.get(cacheKey);
    const now = Date.now();

    // Si les données sont en cache et valides, on les utilise
    if (
      !force &&
      cachedEntry &&
      now - cachedEntry.timestamp < ttl &&
      !cachedEntry.isStale
    ) {
      setData(cachedEntry.data);
      setIsLoading(false);
      return;
    }

    // Si les données sont en cache mais périmées et que staleWhileRevalidate est activé
    if (
      !force &&
      cachedEntry &&
      staleWhileRevalidate &&
      now - cachedEntry.timestamp < ttl * 2
    ) {
      setData(cachedEntry.data);
      setIsLoading(true);
    }

    try {
      const response = await fetch(url, options);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const newData = await response.json();

      // Mise à jour du cache
      cache.set(cacheKey, {
        data: newData,
        timestamp: now,
        isStale: false
      });

      setData(newData);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e : new Error('Une erreur est survenue'));
      // Si on a des données en cache, on les garde même en cas d'erreur
      if (!cachedEntry) {
        setData(null);
      }
    } finally {
      setIsLoading(false);
    }
  }, [url, options, ttl, staleWhileRevalidate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const invalidateCache = useCallback(() => {
    const cacheKey = `${url}-${JSON.stringify(options)}`;
    cache.delete(cacheKey);
  }, [url, options]);

  const refresh = useCallback(() => {
    fetchData(true);
  }, [fetchData]);

  return {
    data,
    error,
    isLoading,
    refresh,
    invalidateCache
  };
} 