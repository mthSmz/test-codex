"use client";

import { useEffect, useMemo, useState } from "react";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const STORAGE_KEY = "lastPoemHtml";

interface LatestPoem {
  html: string;
  publishedAt?: string;
}

function readCachedPoem(): LatestPoem | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return { html: raw };
  } catch {
    return null;
  }
}

function writeCachedPoem(html: string) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, html);
  } catch {
    // Ignore persistence errors (quota, privacy mode, ...)
  }
}

export default function Page() {
  const [poem, setPoem] = useState<LatestPoem | null>(null);
  const [isFallback, setIsFallback] = useState(false);
  const [empty, setEmpty] = useState(false);

  useEffect(() => {
    const cachedAtStart = readCachedPoem();
    if (cachedAtStart) {
      setPoem(cachedAtStart);
      setIsFallback(true);
    }

    let cancelled = false;

    const loadPoem = async () => {
      try {
        const response = await fetch("/api/poems/latest", {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error(`fetch_failed:${response.status}`);
        }

        const payload: LatestPoem | null = await response.json();

        if (cancelled) return;

        if (!payload || typeof payload.html !== "string" || !payload.html.trim()) {
          const cachedFallback = readCachedPoem();
          setEmpty(!cachedFallback);
          setIsFallback(Boolean(cachedFallback));
          setPoem(cachedFallback);
          return;
        }

        setPoem(payload);
        setIsFallback(false);
        setEmpty(false);
        writeCachedPoem(payload.html);
      } catch (error) {
        if (cancelled) return;
        const cachedFallback = readCachedPoem();
        if (cachedFallback) {
          setPoem(cachedFallback);
          setIsFallback(true);
          setEmpty(false);
        } else {
          setEmpty(true);
          setPoem(null);
        }
      }
    };

    loadPoem();

    return () => {
      cancelled = true;
    };
  }, []);

  const publishedAt = useMemo(() => poem?.publishedAt ?? null, [poem]);

  return (
    <main className="poem-wrapper">
      {poem ? (
        <article
          className="poem"
          dangerouslySetInnerHTML={{ __html: poem.html }}
        />
      ) : null}

      {!poem && empty ? (
        <p className="empty">Pas encore de poème disponible.</p>
      ) : null}

      {poem && isFallback ? (
        <p className="fallback-note">
          Affichage du dernier poème disponible en attendant la prochaine
          publication.
        </p>
      ) : null}

      {publishedAt ? (
        <p className="published-at">Publié le {publishedAt}</p>
      ) : null}
    </main>
  );
}
