export const dynamic = 'force-dynamic';
export const revalidate = 0;

type LatestPoemResponse = {
  html?: unknown;
};

export default async function Home() {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL ?? ''}/api/poems/latest`, {
    cache: 'no-store',
  });
  const poem = res.ok ? ((await res.json()) as LatestPoemResponse | null) : null;
  const html = typeof poem?.html === 'string' ? poem.html : null;

  return (
    <main style={{ maxWidth: 720, margin: '64px auto', padding: 24 }}>
      <h1 style={{ fontSize: 42, marginBottom: 24 }}>Poème du jour</h1>
      {html ? (
        <article dangerouslySetInnerHTML={{ __html: html }} />
      ) : (
        <p style={{ opacity: 0.7 }}>Pas encore de poème disponible.</p>
      )}
    </main>
  );
}
