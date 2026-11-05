'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body style={{ backgroundColor: '#0B0B0B', color: '#ece8e3', margin: 0, fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', textAlign: 'center' }}>
          <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#f36d45', marginBottom: '16px' }} />
          <h1 style={{ fontSize: '32px', fontWeight: 600, letterSpacing: '-0.03em', margin: '0 0 12px 0' }}>
            System Encountered an Error
          </h1>
          <p style={{ fontSize: '14px', color: '#8e8883', maxWidth: '420px', lineHeight: 1.6, margin: '0 0 24px 0', fontFamily: 'monospace' }}>
            The application experienced an unexpected root-level issue. Click below to reload the application.
          </p>
          {error?.digest && (
            <p style={{ fontSize: '11px', color: '#666', fontFamily: 'monospace', margin: '0 0 24px 0' }}>
              Digest: {error.digest}
            </p>
          )}
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={() => reset()}
              style={{
                padding: '10px 20px',
                borderRadius: '8px',
                backgroundColor: '#f36d45',
                color: '#0B0B0B',
                border: 'none',
                fontWeight: 700,
                fontSize: '12px',
                cursor: 'pointer',
                fontFamily: 'monospace',
              }}
            >
              RETRY ↺
            </button>
            <button
              onClick={() => window.location.href = '/'}
              style={{
                padding: '10px 20px',
                borderRadius: '8px',
                backgroundColor: 'rgba(255,255,255,0.1)',
                color: '#ece8e3',
                border: '1px solid rgba(255,255,255,0.2)',
                fontWeight: 600,
                fontSize: '12px',
                cursor: 'pointer',
                fontFamily: 'monospace',
              }}
            >
              RETURN TO ROOT ↗
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}

