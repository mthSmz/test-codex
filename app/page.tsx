import { headers } from 'next/headers';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function resolveOrigin() {
  const hdrs = headers();
  const forwardedProto = hdrs.get('x-forwarded-proto');
  const host = hdrs.get('host');
  if (host) {
    const proto = forwardedProto ?? (host.includes('localhost') || host.startsWith('127.') ? 'http' : 'https');
    return `${proto}://${host}`;
  }

  return process.env.NEXT_PUBLIC_SITE_URL ?? process.env.NEXT_PUBLIC_BASE_URL ?? '';
}

export default async function Home() {
  const origin = resolveOrigin();
  const res = origin
    ? await fetch(`${origin}/api/poems/latest`, { cache: 'no-store' })
    : undefined;
  const poem = res?.ok ? await res.json() : null;

  return (
    <main style={{ maxWidth: 720, margin: '64px auto', padding: 24 }}>
      <h1 style={{ fontSize: 42, marginBottom: 24 }}>Poème du jour</h1>
      {poem?.html ? (
        <article dangerouslySetInnerHTML={{ __html: poem.html }} />
      ) : (
        <p style={{ opacity: 0.7 }}>Pas encore de poème disponible.</p>
      )}
    </main>
  );
}
