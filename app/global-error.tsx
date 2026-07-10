'use client';

// Catches failures in the root layout itself, so it must render its own
// <html>/<body> and cannot rely on app styles. Kept intentionally minimal.
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
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
          <h1 style={{ fontSize: 22, margin: '0 0 8px' }}>Something went wrong</h1>
          <p style={{ fontSize: 14, lineHeight: 1.6, color: '#5c6169', margin: 0 }}>
            Your case is safe — nothing was lost. Please try again in a moment.
          </p>
          <button
            onClick={reset}
            style={{
              marginTop: 16,
              minHeight: 48,
              padding: '0 24px',
              borderRadius: 10,
              border: 'none',
              background: '#2b7dad',
              color: '#fff',
              fontSize: 15,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
