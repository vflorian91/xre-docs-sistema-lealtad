export default function ClientAuthHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <header className="modern-auth-header">
      <a className="xdoc-wordmark" href="/" aria-label="Zapateria XDOC, inicio">
        <span>Zapateria</span><strong>XDOC<span aria-hidden="true">.</span></strong>
      </a>
      <div className="auth-shoe-grid" aria-hidden="true">
        <img src="/images/editorial/court.webp" alt="" />
        <img src="/images/editorial/runner.png" alt="" />
        <img src="/images/editorial/classic.png" alt="" />
        <img src="/images/editorial/canvas.png" alt="" />
      </div>
      <p>Un clásico en cada paso.</p>
      <h1>{title}</h1>
      <span>{subtitle}</span>
    </header>
  );
}
