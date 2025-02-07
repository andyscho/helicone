import { Result } from "./index";
const MAX_CACHE_AGE = 60 * 60 * 24 * 365; // 365 days
const DEFAULT_CACHE_AGE = 60 * 60 * 24 * 7; // 7 days
export interface CacheSettings {
  shouldSaveToCache: boolean;
  shouldReadFromCache: boolean;
  cacheControl: string;
}

function buildCacheControl(cacheControl: string): string {
  const sMaxAge = cacheControl.match(/s-maxage=(\d+)/)?.[1];
  const maxAge = cacheControl.match(/max-age=(\d+)/)?.[1];

  if (sMaxAge || maxAge) {
    let sMaxAgeInSeconds = 0;
    try {
      sMaxAgeInSeconds = sMaxAge
        ? parseInt(sMaxAge)
        : maxAge
        ? parseInt(maxAge)
        : 0;
    } catch (e) {
      console.error("Error parsing s-maxage or max-age", e);
    }
    if (sMaxAgeInSeconds > MAX_CACHE_AGE) {
      return `public, max-age=${MAX_CACHE_AGE}`;
    }
    return `public, max-age=${sMaxAgeInSeconds}`;
  } else {
    return `public, max-age=${DEFAULT_CACHE_AGE}`;
  }
}

interface CacheHeaders {
  cacheEnabled: boolean;
  cacheSave: boolean;
  cacheRead: boolean;
}

function getCacheState(headers: Headers): CacheHeaders {
  return {
    cacheEnabled:
      (headers.get("Helicone-Cache-Enabled") ?? "").toLowerCase() === "true",
    cacheSave:
      (headers.get("Helicone-Cache-Save") ?? "").toLowerCase() === "true",
    cacheRead:
      (headers.get("Helicone-Cache-Read") ?? "").toLowerCase() === "true",
  };
}

export function getCacheSettings(
  headers: Headers
): Result<CacheSettings, string> {
  const cacheHeaders = getCacheState(headers);

  const shouldSaveToCache = cacheHeaders.cacheEnabled || cacheHeaders.cacheSave;
  const shouldReadFromCache =
    cacheHeaders.cacheEnabled || cacheHeaders.cacheRead;

  const cacheControl = buildCacheControl(headers.get("Cache-Control") ?? "");

  return {
    error: null,
    data: {
      shouldReadFromCache,
      shouldSaveToCache,
      cacheControl,
    },
  };
}
