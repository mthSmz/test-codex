export const dynamic = "force-dynamic";
export const revalidate = 0;

interface LatestPoem {
  html: string;
  publishedAt?: string | null;
}

async function loadLatestPoem(): Promise<LatestPoem | null> {
  try {
    const res = await fetch("/api/poems/latest", { cache: "no-store" });
    if (!res.ok) {
      return null;
    }

    const poem = (await res.json()) as unknown;
    if (!poem || typeof poem !== "object") {
      return null;
    }

    const html =
      "html" in poem && typeof poem.html === "string" && poem.html.trim()
        ? poem.html
        : null;
    if (!html) {
      return null;
    }

    const publishedAt =
      "publishedAt" in poem && typeof poem.publishedAt === "string"
        ? poem.publishedAt
        : null;

    return { html, publishedAt };
  } catch {
    return null;
  }
}

export default async function Page() {
  const poem = await loadLatestPoem();

  if (!poem) {
    return (
      <main className="poem-wrapper">
        <p className="empty">Pas encore de poème disponible.</p>
      </main>
    );
  }

  return (
    <main className="poem-wrapper">
      <article
        className="poem"
        dangerouslySetInnerHTML={{ __html: poem.html }}
      />
      {poem.publishedAt ? (
        <p className="published-at">Publié le {poem.publishedAt}</p>
      ) : null}
    </main>
  );
}
