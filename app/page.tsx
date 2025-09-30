export const dynamic = "force-dynamic";
export const revalidate = 0;

interface LatestPoemResponse {
  html?: unknown;
}

export default async function Page() {
  const res = await fetch("/api/poems/latest", { cache: "no-store" });
  const poem = res.ok ? ((await res.json()) as LatestPoemResponse | null) : null;
  const html = poem && typeof poem.html === "string" ? poem.html : null;

  if (!html) {
    return (
      <main className="poem-wrapper">
        <p className="empty">Pas encore de poème disponible.</p>
      </main>
    );
  }

  return (
    <main className="poem-wrapper">
      <article className="poem" dangerouslySetInnerHTML={{ __html: html }} />
    </main>
  );
}
