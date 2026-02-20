import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';

/* ─── Types ─────────────────────────────────────────────────── */
interface StatItem {
  value: number;
  suffix: string;
  label: string;
}

interface StepItem {
  num: string;
  icon: string;
  title: string;
  desc: string;
}

interface FeatureItem {
  icon: string;
  color: string;
  title: string;
  desc: string;
}

/* ─── Data ──────────────────────────────────────────────────── */
const STATS: StatItem[] = [
  { value: 98, suffix: '%', label: 'Rutas exitosas' },
  { value: 3, suffix: 's', label: 'Segundos de cálculo' },
  { value: 500, suffix: '+', label: 'Obras registradas' },
  { value: 24, suffix: '/7', label: 'Horas de cobertura' },
];

const STEPS: StepItem[] = [
  { num: '01', icon: '📍', title: 'Detecta tu ubicación', desc: 'La app obtiene tu posición GPS en tiempo real para calcular la ruta más eficiente desde donde estás.' },
  { num: '02', icon: '🚧', title: 'Identifica la obra', desc: 'Escanea el QR de la obra o ábrela por enlace. El sistema carga su ubicación y estado automáticamente.' },
  { num: '03', icon: '🗺️', title: 'Genera el desvío', desc: 'RutaFix calcula la ruta óptima evitando el bloqueo, respetando calles reales y sentido del tráfico.' },
  { num: '04', icon: '📲', title: 'Comparte con un QR', desc: 'El administrador genera un QR único por obra. Los conductores lo escanean y acceden a la ruta al instante.' },
];

const FEATURES: FeatureItem[] = [
  { icon: '🗺️', color: 'rgba(249,115,22,.13)', title: 'Mapa interactivo', desc: 'Visualización en tiempo real con OpenStreetMap. Coloca obras y desvíos con un simple clic.' },
  { icon: '📡', color: 'rgba(34,211,238,.10)', title: 'Rutas inteligentes', desc: 'OpenRouteService calcula desvíos que respetan calles, sentidos y distancias reales.' },
  { icon: '📱', color: 'rgba(74,222,128,.10)', title: 'QR instantáneo', desc: 'Genera un código QR único por obra. Un escaneo lleva a los conductores a su ruta.' },
  { icon: '🏗️', color: 'rgba(249,115,22,.13)', title: 'Panel de administración', desc: 'Agrega obras con título, descripción y fotos. Gestiona todos los desvíos desde un solo lugar.' },
  { icon: '📸', color: 'rgba(34,211,238,.10)', title: 'Galería de fotos', desc: 'Adjunta imágenes de la obra para que los conductores reconozcan fácilmente el lugar.' },
  { icon: '⚡', color: 'rgba(74,222,128,.10)', title: 'Respuesta en segundos', desc: 'Backend en Supabase y motor optimizado para entregar la ruta de desvío en menos de 3 s.' },
];

/* ─── Animation keyframes (injected once) ──────────────────── */
const STYLES = `
  @keyframes rf-fadeDown  { from{opacity:0;transform:translateY(-22px)} to{opacity:1;transform:none} }
  @keyframes rf-fadeUp    { from{opacity:0;transform:translateY(28px)}  to{opacity:1;transform:none} }
  @keyframes rf-pulse     { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.45;transform:scale(1.45)} }
  @keyframes rf-drawRoute { to{stroke-dashoffset:0} }
  @keyframes rf-blink     { 0%,100%{opacity:1} 50%{opacity:.25} }
  @keyframes rf-wobble    { 0%,100%{transform:rotate(0deg)} 25%{transform:rotate(6deg)} 75%{transform:rotate(-6deg)} }
  @keyframes rf-dashMove  { to{stroke-dashoffset:-20} }
  @keyframes rf-shimmer   { from{background-position:200% center} to{background-position:-200% center} }

  .rf-fade-d0  { animation: rf-fadeDown .65s .00s ease both }
  .rf-fade-d1  { animation: rf-fadeDown .65s .10s ease both }
  .rf-fade-d2  { animation: rf-fadeDown .65s .20s ease both }
  .rf-fade-d3  { animation: rf-fadeDown .65s .30s ease both }
  .rf-fade-u   { animation: rf-fadeUp   .90s .50s ease both }

  .rf-pulse    { animation: rf-pulse 1.6s infinite }
  .rf-blink    { animation: rf-blink 1.3s ease infinite }
  .rf-wobble   { animation: rf-wobble 2.2s ease-in-out infinite; transform-origin:50% 100% }
  .rf-dash     { animation: rf-dashMove 1.3s linear infinite }
  .rf-route    { stroke-dasharray:700; stroke-dashoffset:700; animation: rf-drawRoute 2.2s .9s ease forwards }

  .rf-shimmer  {
    background: linear-gradient(90deg,#f97316,#fb923c,#fbbf24,#fb923c,#f97316);
    background-size: 200% auto;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    animation: rf-shimmer 4s linear infinite;
  }

  .rf-reveal { opacity:0; transform:translateY(26px); transition:opacity .7s ease,transform .7s ease }
  .rf-reveal.visible { opacity:1; transform:none }

  .rf-card-hover { transition:transform .25s ease,box-shadow .25s ease,border-color .25s ease }
  .rf-card-hover:hover { transform:translateY(-6px); box-shadow:0 16px 44px rgba(0,0,0,.45) }

  .rf-step-bar::before {
    content:''; position:absolute; top:0; left:0; right:0; height:3px;
    background:linear-gradient(90deg,#f97316,#fb923c);
    transform:scaleX(0); transform-origin:left; transition:transform .3s ease;
    border-radius:3px 3px 0 0;
  }
  .rf-step-bar:hover::before { transform:scaleX(1) }

  .rf-nav-shrink { padding-top:.55rem !important; padding-bottom:.55rem !important }
`;

/* ─── Counter hook ──────────────────────────────────────────── */
function useCounter(ref: React.RefObject<HTMLSpanElement | null>, target: number, suffix: string) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      obs.disconnect();
      const duration = 1600;
      const fps = 60;
      const steps = (duration / 1000) * fps;
      const increment = target / steps;
      let current = 0;
      const id = setInterval(() => {
        current = Math.min(current + increment, target);
        el.textContent = Math.floor(current) + suffix;
        if (current >= target) clearInterval(id);
      }, 1000 / fps);
    }, { threshold: 0.6 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [ref, target, suffix]);
}

/* ─── Scroll-reveal hook ────────────────────────────────────── */
function useReveal() {
  useEffect(() => {
    const els = document.querySelectorAll<HTMLElement>('.rf-reveal');
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((e, i) => {
        if (e.isIntersecting) {
          setTimeout(() => e.target.classList.add('visible'), i * 90);
          obs.unobserve(e.target);
        }
      });
    }, { threshold: 0.1 });
    els.forEach(el => obs.observe(el));
    return () => obs.disconnect();
  }, []);
}

/* ─── Sub-components ────────────────────────────────────────── */
function StatCounter({ value, suffix, label }: StatItem) {
  const ref = useRef<HTMLSpanElement>(null);
  useCounter(ref, value, suffix);
  return (
    <div className="rf-reveal rf-card-hover flex-1 min-w-[150px] max-w-[210px] rounded-2xl border border-white/7 bg-[#131e30] p-6 text-center">
      <span ref={ref} className="block text-4xl font-black text-orange-400">0</span>
      <span className="mt-1 block text-sm text-slate-400">{label}</span>
    </div>
  );
}

/* ─── Main component ────────────────────────────────────────── */
export default function Home() {
  useReveal();

  /* Inject styles once */
  useEffect(() => {
    const id = 'rf-styles';
    if (document.getElementById(id)) return;
    const el = document.createElement('style');
    el.id = id;
    el.textContent = STYLES;
    document.head.appendChild(el);
  }, []);

  /* Navbar scroll-shrink */
  const navRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const onScroll = () => {
      navRef.current?.classList.toggle('rf-nav-shrink', window.scrollY > 60);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="bg-[#080c14] text-[#f0f4ff] font-sans overflow-x-hidden">

      {/* ── NAVBAR ─────────────────────────────────────────── */}
      <nav
        ref={navRef}
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between
                   px-6 py-4 border-b border-white/7 backdrop-blur-xl
                   bg-[rgba(8,12,20,0.72)] transition-all duration-300"
      >
        <a href="/" className="flex items-center gap-2 font-black text-xl tracking-tight no-underline text-[#f0f4ff]">
          <svg width="34" height="34" viewBox="0 0 34 34" fill="none">
            <rect width="34" height="34" rx="8" fill="#f97316" />
            <path d="M7 17 Q7 9 17 9 Q27 9 27 17" stroke="white" strokeWidth="2.5" fill="none" strokeLinecap="round" />
            <circle cx="7" cy="17" r="3" fill="white" />
            <circle cx="27" cy="17" r="3" fill="white" />
            <path d="M13 17 L17 13 L21 17" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Ruta<span className="text-orange-400">Fix</span>
        </a>

        <ul className="hidden md:flex gap-8 list-none m-0 p-0">
          {(['¿Cómo funciona?', 'Funcionalidades'] as const).map((t, i) => (
            <li key={i}>
              <a href={i === 0 ? '#como-funciona' : '#funcionalidades'}
                className="text-slate-400 hover:text-white text-sm font-medium transition-colors no-underline">
                {t}
              </a>
            </li>
          ))}
        </ul>

        <Link to="/admin"
          className="rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-semibold
                     text-sm px-4 py-2 no-underline transition-all hover:-translate-y-px
                     hover:shadow-[0_6px_24px_rgba(249,115,22,.45)]">
          Panel Admin
        </Link>
      </nav>

      {/* ── HERO ───────────────────────────────────────────── */}
      <section className="relative min-h-screen flex flex-col items-center justify-center
                          text-center px-4 pt-32 pb-16 overflow-hidden">
        {/* backgrounds */}
        <div className="pointer-events-none absolute inset-0"
          style={{ background: 'radial-gradient(ellipse 80% 55% at 50% 0%,rgba(249,115,22,.13),transparent 70%),radial-gradient(ellipse 55% 45% at 85% 80%,rgba(34,211,238,.08),transparent 60%)' }} />
        <div className="pointer-events-none absolute inset-0"
          style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.035) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.035) 1px,transparent 1px)', backgroundSize: '50px 50px', maskImage: 'radial-gradient(ellipse 70% 65% at 50% 40%,black 30%,transparent 100%)' }} />

        {/* badge */}
        <div className="rf-fade-d0 relative z-10 inline-flex items-center gap-2 rounded-full
                        border border-orange-500/30 bg-orange-500/10 text-orange-400
                        text-xs font-bold px-4 py-1.5 mb-6 uppercase tracking-widest">
          <span className="rf-pulse inline-block w-2 h-2 rounded-full bg-orange-400" />
          Rutas de desvío en tiempo real
        </div>

        {/* headline */}
        <h1 className="rf-fade-d1 relative z-10 text-5xl md:text-7xl font-black leading-[1.08]
                       tracking-tight max-w-3xl mb-6">
          Navega la ciudad<br />
          <span className="rf-shimmer">sin obstáculos</span>
        </h1>

        <p className="rf-fade-d2 relative z-10 text-slate-400 text-lg max-w-xl leading-relaxed mb-10">
          RutaFix detecta obras públicas en tu ciudad y calcula automáticamente
          la mejor ruta de desvío para que llegues a tu destino sin interrupciones.
        </p>

        {/* CTA buttons */}
        <div className="rf-fade-d3 relative z-10 flex flex-wrap gap-3 justify-center mb-16">
          <Link to="/admin"
            className="flex items-center gap-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white
                       font-bold px-7 py-3.5 no-underline transition-all
                       hover:-translate-y-0.5 hover:shadow-[0_12px_32px_rgba(249,115,22,.5)]">
            🚀 Ir al panel Admin
          </Link>
          <a href="#como-funciona"
            className="rounded-xl border border-white/10 hover:border-cyan-400/40
                        hover:bg-cyan-400/5 text-white font-semibold px-7 py-3.5
                        no-underline transition-all">
            ¿Cómo funciona?
          </a>
        </div>

        {/* ── ANIMATED MAP DEMO ── */}
        <div className="rf-fade-u relative z-10 w-full max-w-3xl">
          <div className="rounded-2xl border border-white/7 overflow-hidden
                          shadow-[0_32px_80px_rgba(0,0,0,.7),0_0_0_1px_rgba(255,255,255,.04)]">
            {/* browser chrome */}
            <div className="flex items-center gap-2 px-4 py-3 bg-[#0e1623] border-b border-white/7">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
              <span className="w-2.5 h-2.5 rounded-full bg-green-400" />
              <span className="mx-3 flex-1 rounded-md bg-white/5 text-slate-500 text-xs px-3 py-1.5 text-left">
                rutafix.app/obra/av-principal-42
              </span>
            </div>

            {/* SVG map */}
            <svg viewBox="0 0 820 360" xmlns="http://www.w3.org/2000/svg" className="w-full block">
              <defs>
                <pattern id="g" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M40 0H0V40" fill="none" stroke="rgba(255,255,255,.04)" strokeWidth="1" />
                </pattern>
                <pattern id="diag" x="0" y="0" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                  <rect width="5" height="10" fill="rgba(244,63,94,.28)" />
                </pattern>
                <pattern id="warn" x="0" y="0" width="12" height="12" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                  <rect width="6" height="12" fill="rgba(251,191,36,.55)" />
                </pattern>
                <filter id="glow">
                  <feGaussianBlur stdDeviation="3" result="b" />
                  <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
              </defs>

              {/* bg + grid */}
              <rect width="820" height="360" fill="#0e1623" />
              <rect width="820" height="360" fill="url(#g)" />

              {/* city blocks */}
              {[[60, 55, 120, 85], [60, 175, 120, 95], [230, 55, 140, 115], [230, 220, 140, 95],
              [440, 55, 130, 80], [440, 215, 130, 105], [650, 55, 110, 115], [650, 225, 110, 95]]
                .map(([x, y, w, h], i) => (
                  <rect key={i} x={x} y={y} width={w} height={h} rx="4"
                    fill="#131e30" stroke="rgba(255,255,255,.05)" strokeWidth="1" />
                ))}

              {/* roads */}
              <rect x="0" y="150" width="820" height="20" fill="#182130" />
              <line x1="0" y1="160" x2="820" y2="160" stroke="rgba(255,210,50,.16)" strokeWidth="1.5" strokeDasharray="20 12" className="rf-dash" />
              {[195, 415, 630].map(x => (
                <rect key={x} x={x} y="0" width="20" height="360" fill="#182130" />
              ))}
              <line x1="205" y1="0" x2="205" y2="360" stroke="rgba(255,210,50,.16)" strokeWidth="1.5" strokeDasharray="20 12" className="rf-dash" />
              <line x1="425" y1="0" x2="425" y2="360" stroke="rgba(255,210,50,.16)" strokeWidth="1.5" strokeDasharray="20 12" className="rf-dash" />

              {/* obra zone */}
              <rect x="370" y="150" width="80" height="20" fill="url(#diag)" rx="2" />
              <rect x="370" y="165" width="88" height="8" rx="2" fill="#f43f5e" opacity=".85" />
              <rect x="370" y="165" width="88" height="8" rx="2" fill="url(#warn)" />

              {/* cone 1 */}
              <g className="rf-wobble">
                <polygon points="378,165 385,152 392,165" fill="#f97316" />
                <rect x="376" y="163" width="18" height="3" rx="1" fill="white" opacity=".7" />
              </g>
              {/* cone 2 */}
              <polygon points="448,165 455,152 462,165" fill="#f97316" />
              <rect x="446" y="163" width="18" height="3" rx="1" fill="white" opacity=".7" />

              {/* blocked overlay */}
              <rect x="415" y="150" width="60" height="20" fill="rgba(244,63,94,.15)" />

              {/* original blocked route */}
              <path d="M90 160 L415 160" stroke="rgba(249,115,22,.28)" strokeWidth="3"
                fill="none" strokeDasharray="8 6" />

              {/* detour route animated */}
              <path className="rf-route" filter="url(#glow)"
                d="M90 160 L205 160 L205 95 L425 95 L425 160 L640 160 L730 160"
                stroke="#4ade80" strokeWidth="3.5" fill="none"
                strokeLinecap="round" strokeLinejoin="round" />

              {/* start pin */}
              <circle cx="90" cy="160" r="9" fill="#22d3ee" opacity=".9" />
              <circle cx="90" cy="160" r="5" fill="white" />
              <circle cx="90" cy="160" r="18" fill="none" stroke="#22d3ee" strokeWidth="1.5" opacity=".4" className="rf-blink" />

              {/* end pin */}
              <g transform="translate(722,144)">
                <path d="M8 0C8 0 16 7 16 12A8 8 0 0 1 0 12C0 7 8 0 8 0Z" fill="#4ade80" />
                <circle cx="8" cy="12" r="3" fill="white" />
              </g>

              {/* labels */}
              <rect x="376" y="124" width="72" height="22" rx="5" fill="#f43f5e" opacity=".95" />
              <text x="412" y="139" textAnchor="middle" fill="white" fontSize="10" fontFamily="Inter,sans-serif" fontWeight="700">⚠ OBRA</text>

              <rect x="278" y="72" width="74" height="22" rx="5" fill="#4ade80" opacity=".92" />
              <text x="315" y="87" textAnchor="middle" fill="#0e1623" fontSize="10" fontFamily="Inter,sans-serif" fontWeight="700">DESVÍO ↗</text>

              {/* legend */}
              <rect x="16" y="300" width="205" height="48" rx="8" fill="rgba(13,22,36,.88)" stroke="rgba(255,255,255,.07)" strokeWidth="1" />
              <line x1="30" y1="318" x2="54" y2="318" stroke="#f97316" strokeWidth="2.5" strokeDasharray="5 3" />
              <text x="62" y="322" fill="#7b8fad" fontSize="10" fontFamily="Inter,sans-serif">Ruta bloqueada</text>
              <line x1="30" y1="336" x2="54" y2="336" stroke="#4ade80" strokeWidth="2.5" />
              <text x="62" y="340" fill="#7b8fad" fontSize="10" fontFamily="Inter,sans-serif">Ruta de desvío</text>
            </svg>
          </div>
        </div>
      </section>

      {/* ── STATS ──────────────────────────────────────────── */}
      <div className="relative flex flex-wrap justify-center gap-5 px-4 py-14">
        <div className="pointer-events-none absolute top-0 left-[10%] right-[10%] h-px bg-gradient-to-r from-transparent via-white/8 to-transparent" />
        {STATS.map(s => <StatCounter key={s.label} {...s} />)}
      </div>

      {/* ── HOW IT WORKS ───────────────────────────────────── */}
      <section id="como-funciona" className="px-4 py-20">
        <p className="text-center text-cyan-400 text-xs font-bold uppercase tracking-[.15em] mb-3">Proceso</p>
        <h2 className="text-center text-4xl md:text-5xl font-black tracking-tight mb-4">¿Cómo funciona?</h2>
        <p className="text-center text-slate-400 max-w-lg mx-auto leading-relaxed mb-14">
          Tres simples pasos y llegas a tu destino sin contratiempos.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 max-w-5xl mx-auto">
          {STEPS.map(s => (
            <div key={s.num}
              className="rf-reveal rf-card-hover rf-step-bar relative rounded-2xl border border-white/7
                            bg-[#131e30] p-6 overflow-hidden">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl
                              border border-orange-500/25 bg-orange-500/10
                              text-orange-400 font-black text-sm">
                {s.num}
              </div>
              <span className="text-2xl mb-2 block">{s.icon}</span>
              <h3 className="font-bold text-base mb-2">{s.title}</h3>
              <p className="text-slate-400 text-sm leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURES ───────────────────────────────────────── */}
      <section id="funcionalidades"
        className="px-4 py-20 bg-[#0e1623]">
        <p className="text-center text-cyan-400 text-xs font-bold uppercase tracking-[.15em] mb-3">Funcionalidades</p>
        <h2 className="text-center text-4xl md:text-5xl font-black tracking-tight mb-4">Todo lo que necesitas</h2>
        <p className="text-center text-slate-400 max-w-lg mx-auto leading-relaxed mb-14">
          Una plataforma completa para gestionar desvíos viales de forma moderna y eficiente.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 max-w-5xl mx-auto">
          {FEATURES.map(f => (
            <div key={f.title}
              className="rf-reveal rf-card-hover rounded-2xl border border-white/7 bg-[#131e30] p-6">
              <div className="mb-4 flex h-12 w-12 items-center justify-center
                              rounded-xl text-2xl" style={{ background: f.color }}>
                {f.icon}
              </div>
              <h3 className="font-bold text-base mb-2">{f.title}</h3>
              <p className="text-slate-400 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ────────────────────────────────────────────── */}
      <section className="px-4 py-24 text-center">
        <div className="rf-reveal max-w-2xl mx-auto rounded-3xl border border-orange-500/20 p-14 relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg,rgba(249,115,22,.07),rgba(34,211,238,.04))' }}>
          <div className="pointer-events-none absolute inset-[-1px] rounded-3xl"
            style={{ background: 'linear-gradient(135deg,rgba(249,115,22,.12),transparent 60%)' }} />
          <p className="relative z-10 text-cyan-400 text-xs font-bold uppercase tracking-[.15em] mb-3">Empezar ahora</p>
          <h2 className="relative z-10 text-4xl md:text-5xl font-black tracking-tight mb-4">
            ¿Listo para gestionar<br />desvíos sin complicaciones?
          </h2>
          <p className="relative z-10 text-slate-400 leading-relaxed mb-8 max-w-md mx-auto">
            Regist ra tu primera obra en minutos. Sin instalaciones, sin filas.
          </p>
          <div className="relative z-10 flex flex-wrap gap-3 justify-center">
            <Link to="/admin"
              className="rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold
                         px-7 py-3.5 no-underline transition-all
                         hover:-translate-y-0.5 hover:shadow-[0_12px_32px_rgba(249,115,22,.5)]">
              🚀 Ir al panel Admin
            </Link>
            <a href="#como-funciona"
              className="rounded-xl border border-white/10 hover:border-cyan-400/40
                          hover:bg-cyan-400/5 text-white font-semibold px-7 py-3.5
                          no-underline transition-all">
              Ver cómo funciona
            </a>
          </div>
        </div>
      </section>

      {/* ── FOOTER ─────────────────────────────────────────── */}
      <footer className="border-t border-white/7 py-8 text-center text-slate-500 text-sm space-y-1">
        <p>© 2025 <strong className="text-slate-300">RutaFix</strong> — Gestión inteligente de desvíos por obras públicas.</p>
        <p className="text-xs">React · Vite · TypeScript · Tailwind · Leaflet · Supabase · OpenRouteService</p>
      </footer>

    </div>
  );
}
