// Squelettes affichés instantanément pendant que la page charge ses données.

function Block({ w, h, className }: { w?: number | string; h: number; className?: string }) {
  return <div className={`sk${className ? ` ${className}` : ""}`} style={{ width: w ?? "100%", height: h }} />;
}

function Hero({ title, sub, actions }: { title: number; sub: number; actions?: number }) {
  return (
    <div className="hero" aria-hidden>
      <div className="hero-text">
        <Block w={title} h={36} />
        <Block w={sub} h={16} />
      </div>
      {actions && <Block w={actions} h={36} />}
    </div>
  );
}

function Kpis({ n, dense }: { n: number; dense?: boolean }) {
  return (
    <div className={`card kpis${dense ? " dense" : ""}`} aria-hidden>
      {Array.from({ length: n }, (_, i) => (
        <div key={i} className="kpi">
          <Block w={120} h={14} />
          <Block w={110} h={dense ? 30 : 36} />
          <Block w={150} h={13} />
        </div>
      ))}
    </div>
  );
}

function Card({ h, title = 160 }: { h: number; title?: number }) {
  return (
    <div className="card" aria-hidden>
      <Block w={title} h={20} />
      <Block h={h} className="sk-gap sk-soft" />
    </div>
  );
}

export function SkeletonGlobal() {
  return (
    <div className="skeleton" role="status" aria-label="Chargement">
      <Hero title={260} sub={520} actions={300} />
      <Kpis n={4} />
      <Card h={250} title={180} />
      <Card h={150} title={260} />
      <div className="grid-2">
        <Card h={320} />
        <Card h={320} />
      </div>
    </div>
  );
}

export function SkeletonMensuel() {
  return (
    <div className="skeleton" role="status" aria-label="Chargement">
      <Hero title={240} sub={520} actions={620} />
      <Kpis n={5} dense />
      <Card h={120} title={200} />
      <div className="grid-2">
        <Card h={300} />
        <Card h={300} />
      </div>
    </div>
  );
}

export function SkeletonSimple() {
  return (
    <div className="skeleton" role="status" aria-label="Chargement">
      <Hero title={300} sub={480} />
      <Card h={420} title={240} />
    </div>
  );
}
