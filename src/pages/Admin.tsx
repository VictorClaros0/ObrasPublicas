import { useState, useCallback, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MapContainer, TileLayer, useMapEvents, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { QRCodeSVG } from 'qrcode.react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { Obra } from '../lib/supabase';

import 'leaflet/dist/leaflet.css';

/* ─── Styles ─────────────────────────────────────────────── */
const ADMIN_STYLES = `
  .rf-admin-input {
    width: 100%;
    background: rgba(255,255,255,0.05);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 10px;
    padding: 0.65rem 0.9rem;
    color: #f0f4ff;
    font-size: 0.9rem;
    outline: none;
    transition: border-color .2s, box-shadow .2s;
    font-family: inherit;
    resize: none;
  }
  .rf-admin-input::placeholder { color: #4b6080; }
  .rf-admin-input:focus {
    border-color: rgba(249,115,22,.6);
    box-shadow: 0 0 0 3px rgba(249,115,22,.12);
  }
  .leaflet-container { background: #0e1623 !important; }
  .leaflet-tile { filter: brightness(0.75) saturate(0.6) hue-rotate(195deg); }
  .leaflet-popup-content-wrapper {
    background: #131e30 !important;
    border: 1px solid rgba(255,255,255,0.1) !important;
    border-radius: 10px !important;
    color: #f0f4ff !important;
    box-shadow: 0 8px 32px rgba(0,0,0,.5) !important;
  }
  .leaflet-popup-tip { background: #131e30 !important; }
  .leaflet-popup-close-button { color: #7b8fad !important; }
`;

/* ─── Icons ─────────────────────────────────────────────── */
const defaultCenter: [number, number] = [-17.3935, -66.157];

const obraIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
});

const desvioIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
});

/* ─── Map resizer (fixes mobile blank map) ─────────────── */
function MapResizer() {
  const map = useMap();
  useEffect(() => {
    // Give the browser a tick to finish layout, then recalculate
    const id = setTimeout(() => map.invalidateSize(), 100);
    return () => clearTimeout(id);
  }, [map]);
  return null;
}

/* ─── Map click handler ─────────────────────────────────── */
function MapClickHandler({
  onObraClick, onDesvioClick, step,
}: {
  onObraClick: (lat: number, lng: number) => void;
  onDesvioClick: (lat: number, lng: number) => void;
  step: 'obra' | 'desvio' | 'done';
}) {
  useMapEvents({
    click(e: L.LeafletMouseEvent) {
      if (step === 'obra') onObraClick(e.latlng.lat, e.latlng.lng);
      else if (step === 'desvio') onDesvioClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

/* ─── Step indicator data ───────────────────────────────── */
const STEPS = [
  { key: 'obra', label: 'Clic en la obra', icon: '🚧' },
  { key: 'desvio', label: 'Clic en el desvío', icon: '↗️' },
  { key: 'done', label: 'Guardar', icon: '💾' },
] as const;

/* ─── Component ─────────────────────────────────────────── */
export default function Admin() {
  const [step, setStep] = useState<'obra' | 'desvio' | 'done'>('obra');
  const [obra, setObra] = useState<{ lat: number; lng: number } | null>(null);
  const [desvio, setDesvio] = useState<{ lat: number; lng: number } | null>(null);
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [fotos, setFotos] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [savedObra, setSavedObra] = useState<Obra | null>(null);

  /* inject styles once */
  useEffect(() => {
    const id = 'rf-admin-styles';
    if (document.getElementById(id)) return;
    const el = document.createElement('style');
    el.id = id;
    el.textContent = ADMIN_STYLES;
    document.head.appendChild(el);
  }, []);

  const handleObraClick = useCallback((lat: number, lng: number) => {
    setObra({ lat, lng }); setStep('desvio'); setError('');
  }, []);

  const handleDesvioClick = useCallback((lat: number, lng: number) => {
    setDesvio({ lat, lng }); setStep('done'); setError('');
  }, []);

  const handleReset = useCallback(() => {
    setObra(null); setDesvio(null); setStep('obra');
    setSavedObra(null); setError('');
  }, []);

  const handleSave = async () => {
    if (!obra || !desvio) { setError('Haz clic en el mapa: primero en la obra, luego en el desvío.'); return; }
    if (!titulo.trim()) { setError('Escribe un título para la obra.'); return; }
    setError(''); setSaving(true);
    try {
      const fotosArray = fotos.split(/[\n,]/).map(u => u.trim()).filter(Boolean);
      const { data, error: err } = await supabase
        .from('obras')
        .insert({
          titulo: titulo.trim(),
          descripcion: descripcion.trim() || null,
          lat_obra: obra.lat, lng_obra: obra.lng,
          lat_desvio: desvio.lat, lng_desvio: desvio.lng,
          fotos: fotosArray,
        })
        .select().single();
      if (err) throw err;
      setSavedObra(data as Obra);
    } catch (e: unknown) {
      const err = e as { message?: string; code?: string; details?: string; hint?: string };
      const msg = err?.message ?? (e instanceof Error ? e.message : String(e));
      if (typeof msg === 'string' && (msg.startsWith('http://') || msg.startsWith('https://'))) {
        setError('Error de conexión. Verifica que VITE_SUPABASE_URL en .env sea la URL de tu proyecto Supabase.');
      } else {
        const extra = [err?.code, err?.details, err?.hint].filter(Boolean).join(' · ');
        setError(extra ? `${msg} (${extra})` : msg || 'Error al guardar');
      }
    } finally {
      setSaving(false);
    }
  };

  const obraUrl = savedObra
    ? `${window.location.origin}${import.meta.env.BASE_URL}obra/${savedObra.id}`
    : '';

  const stepIndex = STEPS.findIndex(s => s.key === step);

  return (
    <div className="min-h-screen bg-[#080c14] text-[#f0f4ff] flex flex-col font-sans">

      {/* ── Banner configuración ── */}
      {!isSupabaseConfigured && (
        <div className="bg-rose-600/90 backdrop-blur text-white px-4 py-2.5 text-center text-sm font-medium border-b border-rose-500/50">
          ⚠️ Configura Supabase: edita{' '}
          <code className="bg-rose-800/60 px-1.5 py-0.5 rounded">.env</code> con tu{' '}
          <code className="bg-rose-800/60 px-1.5 py-0.5 rounded">VITE_SUPABASE_URL</code> y reinicia con{' '}
          <code className="bg-rose-800/60 px-1.5 py-0.5 rounded">npm run dev</code>.
        </div>
      )}

      {/* ── Navbar ── */}
      <nav className="flex items-center justify-between px-6 py-3.5 border-b border-white/7
                      bg-[rgba(8,12,20,0.85)] backdrop-blur-xl sticky top-0 z-50">
        <Link to="/" className="flex items-center gap-2 font-black text-lg tracking-tight no-underline text-[#f0f4ff]">
          <svg width="30" height="30" viewBox="0 0 34 34" fill="none">
            <rect width="34" height="34" rx="8" fill="#f97316" />
            <path d="M7 17 Q7 9 17 9 Q27 9 27 17" stroke="white" strokeWidth="2.5" fill="none" strokeLinecap="round" />
            <circle cx="7" cy="17" r="3" fill="white" />
            <circle cx="27" cy="17" r="3" fill="white" />
            <path d="M13 17 L17 13 L21 17" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Ruta<span className="text-orange-400">Fix</span>
        </Link>
        <div className="flex items-center gap-3">
          <span className="hidden sm:block text-slate-400 text-sm">Panel de Administración</span>
          <Link to="/" className="text-sm text-slate-400 hover:text-white transition-colors no-underline">
            ← Inicio
          </Link>
        </div>
      </nav>

      {/* ── Step indicator ── */}
      <div className="flex items-center justify-center gap-2 px-4 py-3 bg-[#0e1623] border-b border-white/7">
        {STEPS.map((s, i) => (
          <div key={s.key} className="flex items-center gap-2">
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all
              ${i === stepIndex
                ? 'bg-orange-500/20 border border-orange-500/50 text-orange-300'
                : i < stepIndex
                  ? 'bg-green-500/15 border border-green-500/30 text-green-400'
                  : 'bg-white/5 border border-white/10 text-slate-500'}`}>
              <span>{i < stepIndex ? '✓' : s.icon}</span>
              <span className="hidden sm:inline">{s.label}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`h-px w-6 hidden sm:block transition-all ${i < stepIndex ? 'bg-green-500/40' : 'bg-white/10'}`} />
            )}
          </div>
        ))}
      </div>

      {/* ── Main layout ── */}
      <div className="flex-1 flex flex-col lg:flex-row gap-4 p-4 max-w-7xl mx-auto w-full">

        {/* Map */}
        <div className="relative rounded-2xl overflow-hidden
                        border border-white/7 shadow-[0_8px_32px_rgba(0,0,0,.6)]
                        h-[55vw] min-h-[280px] max-h-[500px]
                        lg:h-auto lg:max-h-none lg:flex-1 lg:min-h-[540px]">
          {/* Map hint overlay */}
          {step !== 'done' && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[400]
                            flex items-center gap-2 px-3.5 py-2 rounded-full
                            bg-[rgba(8,12,20,0.85)] border border-white/15
                            backdrop-blur text-sm text-slate-300 shadow-lg pointer-events-none whitespace-nowrap">
              <span className="animate-pulse w-2 h-2 rounded-full bg-orange-400 inline-block" />
              {step === 'obra' && 'Haz clic donde inicia la obra'}
              {step === 'desvio' && 'Haz clic en el punto de desvío'}
            </div>
          )}
          <MapContainer center={defaultCenter} zoom={6} className="h-full w-full" scrollWheelZoom>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapResizer />
            <MapClickHandler step={step} onObraClick={handleObraClick} onDesvioClick={handleDesvioClick} />
            {obra && <Marker position={[obra.lat, obra.lng]} icon={obraIcon}><Popup>🚧 Inicio de la obra</Popup></Marker>}
            {desvio && <Marker position={[desvio.lat, desvio.lng]} icon={desvioIcon}><Popup>↗️ Punto de desvío</Popup></Marker>}
          </MapContainer>
        </div>

        {/* Sidebar */}
        <aside className="w-full lg:w-[360px] flex flex-col gap-4">

          {/* Form card */}
          <div className="rounded-2xl border border-white/7 bg-[#0e1623] p-5 space-y-4
                          shadow-[0_8px_32px_rgba(0,0,0,.4)]">
            <div>
              <h2 className="font-bold text-base text-[#f0f4ff]">Registrar obra</h2>
              <p className="text-slate-400 text-xs mt-0.5">
                {step === 'obra' && 'Paso 1: haz clic en el mapa donde inicia el tramo cerrado.'}
                {step === 'desvio' && 'Paso 2: haz clic donde termina el tramo (punto de desvío).'}
                {step === 'done' && 'Paso 3: completa los datos y guarda la obra.'}
              </p>
            </div>

            {/* Coordinates badges */}
            <div className="grid grid-cols-2 gap-2">
              <div className={`rounded-xl border p-2.5 text-xs transition-colors
                ${obra ? 'border-rose-500/30 bg-rose-500/8' : 'border-white/7 bg-white/3'}`}>
                <p className="text-slate-400 mb-0.5 font-medium">📍 Obra</p>
                {obra
                  ? <p className="font-mono text-rose-300">{obra.lat.toFixed(4)}, {obra.lng.toFixed(4)}</p>
                  : <p className="text-slate-600">Sin marcar</p>}
              </div>
              <div className={`rounded-xl border p-2.5 text-xs transition-colors
                ${desvio ? 'border-green-500/30 bg-green-500/8' : 'border-white/7 bg-white/3'}`}>
                <p className="text-slate-400 mb-0.5 font-medium">↗️ Desvío</p>
                {desvio
                  ? <p className="font-mono text-green-300">{desvio.lat.toFixed(4)}, {desvio.lng.toFixed(4)}</p>
                  : <p className="text-slate-600">Sin marcar</p>}
              </div>
            </div>

            <form onSubmit={e => e.preventDefault()} className="space-y-3">
              <input
                className="rf-admin-input"
                type="text"
                placeholder="Título de la obra *"
                value={titulo}
                onChange={e => setTitulo(e.target.value)}
              />
              <textarea
                className="rf-admin-input"
                placeholder="Descripción (opcional)"
                value={descripcion}
                onChange={e => setDescripcion(e.target.value)}
                rows={2}
              />
              <textarea
                className="rf-admin-input"
                placeholder="URLs de fotos (una por línea o separadas por coma)"
                value={fotos}
                onChange={e => setFotos(e.target.value)}
                rows={2}
              />

              {error && (
                <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3.5 py-2.5 text-xs text-rose-300">
                  ⚠️ {error}
                </div>
              )}

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving || !obra || !desvio}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl
                             bg-orange-500 hover:bg-orange-600 disabled:opacity-40
                             disabled:cursor-not-allowed text-white font-bold text-sm
                             py-2.5 transition-all hover:shadow-[0_6px_20px_rgba(249,115,22,.45)]
                             hover:-translate-y-px"
                >
                  {saving
                    ? <><span className="animate-spin inline-block w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full" />Guardando…</>
                    : '💾 Guardar obra'}
                </button>
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-4 rounded-xl border border-white/10 hover:border-white/25
                             text-slate-400 hover:text-white text-sm font-medium transition-all"
                >
                  ↺
                </button>
              </div>
            </form>
          </div>

          {/* QR Card */}
          {savedObra && (
            <div className="rounded-2xl border border-green-500/20 bg-[#0e1623] p-5
                            shadow-[0_8px_32px_rgba(0,0,0,.4)]
                            animate-[rf-fadeDown_.5s_ease_both]">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-green-500/15 flex items-center justify-center text-base">✅</div>
                <div>
                  <p className="font-bold text-sm text-green-300">¡Obra guardada!</p>
                  <p className="text-xs text-slate-500">Comparte el QR con los conductores</p>
                </div>
              </div>
              <div className="flex justify-center p-4 bg-white rounded-xl mb-3">
                <QRCodeSVG value={obraUrl} size={160} level="M" />
              </div>
              <a
                href={obraUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-xs text-orange-400 hover:text-orange-300 break-all no-underline
                           transition-colors text-center"
              >
                {obraUrl}
              </a>
            </div>
          )}

          {/* Legend */}
          <div className="rounded-2xl border border-white/7 bg-[#0e1623] p-4
                          shadow-[0_8px_32px_rgba(0,0,0,.4)]">
            <p className="text-xs font-semibold text-slate-400 mb-2.5 uppercase tracking-wider">Leyenda</p>
            <div className="space-y-1.5 text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <span className="w-5 h-1.5 rounded bg-rose-500 inline-block shrink-0" />
                Inicio de obra (pin rojo)
              </div>
              <div className="flex items-center gap-2">
                <span className="w-5 h-1.5 rounded bg-green-400 inline-block shrink-0" />
                Punto de desvío (pin verde)
              </div>
            </div>
          </div>

        </aside>
      </div>
    </div>
  );
}
