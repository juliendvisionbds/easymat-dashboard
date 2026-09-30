// Squelettes affichés instantanément pendant que la page charge ses données.

function Block({ w, h, className }: { w?: number | string; h: number; className?: string }) {
  return <div className={`sk${className ? ` ${className}` : ""}`} style={{ width: w ?? "100%", height: h }} />;
}

function Hero({ title, sub }: { title: number; sub: number }) {
  return (
    <div className="hero" aria-hidden>
      <Block w={title} h={38} />
      <Block w={sub} h={18} className="sk-gap" />
    </div>
  );
}

function Kpis({ n }: { n: number }) {
  return (
    <div className="grid-kpi section" aria-hidden>
      {Array.from({ length: n }, (_, i) => (
        <div key={i} className="card kpi">
          <Block w={120} h={14} />
          <Block w={110} h={36} className="sk-gap" />
          <Block w={150} h={13} className="sk-gap-s" />
        </div>
      ))}
    </div>
  );
}

function Card({ h, title = 160 }: { h: number; title?: number }) {
  return (
    <div className="card section" aria-hidden>
      <Block w={title} h={20} />
      <Block h={h} className="sk-gap sk-soft" />
    </div>
  );
}

export function SkeletonGlobal() {
  return (
    <div className="skeleton" role="status" aria-label="Chargement">
      <Hero title={340} sub={560} />
      <Kpis n={4} />
      <Card h={150} title={260} />
      <Card h={210} title={180} />
      <div className="grid-2 section">
        <Card h={320} />
        <Card h={320} />
      </div>
    </div>
  );
}

export function SkeletonMensuel() {
  return (
    <div className="skeleton" role="status" aria-label="Chargement">
      <Hero title={260} sub={520} />
      <div className="chips" aria-hidden>
        {Array.from({ length: 12 }, (_, i) => <Block key={i} w={68} h={34} className="sk-pill" />)}
      </div>
      <Kpis n={5} />
      <Card h={120} title={200} />
      <div className="grid-2 section">
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
