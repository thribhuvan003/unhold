import Link from 'next/link';

// Global 404 for paths that never reach a locale segment (so there is no root
// layout / i18n provider around it). Localized 404s live in app/[locale]/not-found.tsx.
// Kept minimal and self-contained, mirroring global-error.tsx.
export default function GlobalNotFound() {
  return (
    <html lang="en">
      <body
        style={{
          fontFamily: 'system-ui, -apple-system, sans-serif',
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
          textAlign: 'center',
          background: '#faf9f6',
          color: '#1c1b19',
        }}
      >
        <div style={{ maxWidth: 380 }}>
          <h1 style={{ fontSize: 22, margin: '0 0 8px' }}>We couldn’t find that page</h1>
          <p style={{ fontSize: 14, lineHeight: 1.6, color: '#5c6169', margin: 0 }}>
            The link may be old. Your case is safe.
          </p>
          <Link
            href="/"
            style={{
              display: 'inline-block',
              marginTop: 16,
              minHeight: 48,
              lineHeight: '48px',
              padding: '0 24px',
              borderRadius: 10,
              background: '#2b7dad',
              color: '#fff',
              fontSize: 15,
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            Go to home
          </Link>
        </div>
      </body>
    </html>
  );
}
