import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, Polyline, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import { supabase } from '../lib/supabase';
import type { Obra } from '../lib/supabase';
import RoutingControl, { getViaPointAround } from '../components/RoutingControl';
import { getDrivingRoute } from '../lib/openrouteservice';

import 'leaflet/dist/leaflet.css';

/* ─── Styles ─────────────────────────────────────────────── */
const VIEW_STYLES = `
  .rf-view-map .leaflet-tile { filter: brightness(0.75) saturate(0.6) hue-rotate(195deg); }
  .rf-view-map .leaflet-container { background: #0e1623 !important; }
  .rf-view-map .leaflet-popup-content-wrapper {
    background: #131e30 !important;
    border: 1px solid rgba(255,255,255,0.1) !important;
    border-radius: 10px !important;
    color: #f0f4ff !important;
    box-shadow: 0 8px 32px rgba(0,0,0,.5) !important;
  }
  .rf-view-map .leaflet-popup-tip { background: #131e30 !important; }
  .rf-view-map .leaflet-popup-close-button { color: #7b8fad !important; }
`;

/* ─── Constants ─────────────────────────────────────────── */
const ORS_API_KEY = import.meta.env.VITE_OPENROUTESERVICE_KEY ?? '';

const redIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
});

const blueIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
});

/* ─── Helpers ────────────────────────────────────────────── */
function midpoint(a: [number, number], b: [number, number]): [number, number] {
  return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
}

function MapCenter({ center }: { center: [number, number] }) {
  const map = useMap();
  const init = useRef(false);
  useEffect(() => {
    if (!init.current) { map.setView(center, 14); init.current = true; }
  }, [map, center]);
  return null;
}

function MapResizer() {
  const map = useMap();
  useEffect(() => {
    const id = setTimeout(() => map.invalidateSize(), 100);
    return () => clearTimeout(id);
  }, [map]);
  return null;
}

/* ─── Ruta de desvío ────────────────────────────────────── */
function RutaDesvio({
  inicioObra, finObra, origen, destino,
}: {
  inicioObra: [number, number]; finObra: [number, number];
  origen: [number, number]; destino: [number, number];
}) {
  const [geometry, setGeometry] = useState<[number, number][] | null>(null);
  const via = getViaPointAround(origen, destino, midpoint(inicioObra, finObra), 0.001);
  const fallbackPositions: [number, number][] = [origen, via, destino];
  const avoidSegment: [number, number][] = [inicioObra, finObra];

  useEffect(() => {
    if (!ORS_API_KEY.trim()) { setGeometry(null); return; }
    let cancelled = false;
    getDrivingRoute([origen, destino], ORS_API_KEY, avoidSegment).then(route => {
      if (!cancelled && route?.length) setGeometry(route);
      else setGeometry(null);
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [origen[0], origen[1], destino[0], destino[1], inicioObra[0], inicioObra[1], finObra[0], finObra[1]]);

  return (
    <Polyline
      positions={geometry ?? fallbackPositions}
      pathOptions={{ color: '#22d3ee', weight: 7, opacity: 0.95 }}
    />
  );
}

/* ─── Draggable destino pin ─────────────────────────────── */
function DraggableDestino({
  position, onChange,
}: {
  position: [number, number];
  onChange: (pos: [number, number]) => void;
}) {
  const markerRef = useRef<L.Marker>(null);
  const eventHandlers = {
    dragend() {
      const m = markerRef.current;
      if (m) { const { lat, lng } = m.getLatLng(); onChange([lat, lng]); }
    },
  };
  return (
    <Marker position={position} icon={blueIcon} draggable ref={markerRef} eventHandlers={eventHandlers}>
      <Popup>
        📍 <strong>Destino</strong><br />
        Arrastra para cambiar el punto de llegada.
      </Popup>
    </Marker>
  );
}

/* ─── Loading / Error screens ───────────────────────────── */
function FullScreenState({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#080c14] text-[#f0f4ff] flex flex-col font-sans">
      <nav className="flex items-center px-6 py-3.5 border-b border-white/7 bg-[rgba(8,12,20,0.85)] backdrop-blur-xl">
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
      </nav>
      <div className="flex-1 flex items-center justify-center p-4">{children}</div>
    </div>
  );
}

/* ─── Main component ────────────────────────────────────── */
export default function ObraView() {
  const { id } = useParams<{ id: string }>();
  const [obra, setObra] = useState<Obra | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [userPosition, setUserPosition] = useState<[number, number] | null>(null);
  const [destino, setDestino] = useState<[number, number] | null>(null);
  const [imgIndex, setImgIndex] = useState(0);

  /* inject styles once */
  useEffect(() => {
    const id2 = 'rf-view-styles';
    if (document.getElementById(id2)) return;
    const el = document.createElement('style');
    el.id = id2;
    el.textContent = VIEW_STYLES;
    document.head.appendChild(el);
  }, []);

  useEffect(() => {
    if (!id) { setError('Falta el ID de la obra.'); setLoading(false); return; }
    (async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from('obras').select('*').eq('id', id).single();
        if (fetchError) throw fetchError;
        setObra(data as Obra);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'No se pudo cargar la obra.');
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  useEffect(() => {
    if (!obra) return;
    setDestino([obra.lat_desvio, obra.lng_desvio]);
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      pos => setUserPosition([pos.coords.latitude, pos.coords.longitude]),
      () => setUserPosition(null),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  }, [obra]);

  const handleDestinoChange = useCallback((pos: [number, number]) => setDestino(pos), []);
  const handleResetDestino = useCallback(() => { if (obra) setDestino([obra.lat_desvio, obra.lng_desvio]); }, [obra]);

  if (loading) {
    return (
      <FullScreenState>
        <div className="flex flex-col items-center gap-3 text-slate-400">
          <div className="w-10 h-10 rounded-full border-2 border-white/10 border-t-orange-400 animate-spin" />
          <p className="text-sm">Cargando obra…</p>
        </div>
      </FullScreenState>
    );
  }

  if (error || !obra) {
    return (
      <FullScreenState>
        <div className="rounded-2xl border border-rose-500/20 bg-[#0e1623] p-8 text-center max-w-sm">
          <p className="text-4xl mb-3">🚫</p>
          <p className="text-rose-300 font-semibold mb-1">Obra no encontrada</p>
          <p className="text-slate-400 text-sm mb-5">{error || 'No existe una obra con este ID.'}</p>
          <Link to="/" className="inline-flex items-center gap-1.5 rounded-xl bg-orange-500 hover:bg-orange-600
                                   text-white font-semibold text-sm px-5 py-2.5 no-underline transition-all">
            ← Volver al inicio
          </Link>
        </div>
      </FullScreenState>
    );
  }

  const inicioObra: [number, number] = [obra.lat_obra, obra.lng_obra];
  const finObra: [number, number] = [obra.lat_desvio, obra.lng_desvio];
  const centroMapa = midpoint(inicioObra, finObra);
  const fotos = Array.isArray(obra.fotos) ? obra.fotos : [];
  const origen: [number, number] = userPosition ?? inicioObra;
  const destinoActual: [number, number] = destino ?? finObra;
  const destinoEsDefault = destino === null || (destino[0] === finObra[0] && destino[1] === finObra[1]);

  return (
    <div className="min-h-screen bg-[#080c14] text-[#f0f4ff] flex flex-col font-sans">

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
        <span className="hidden sm:block text-slate-400 text-sm">Ruta de desvío</span>
        <Link to="/" className="text-sm text-slate-400 hover:text-white transition-colors no-underline">
          ← Inicio
        </Link>
      </nav>

      {/* ── GPS banner ── */}
      {userPosition && (
        <div className="flex items-center justify-center gap-2 px-4 py-2
                        bg-green-500/10 border-b border-green-500/15 text-green-300 text-xs font-medium">
          <span className="animate-pulse w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
          GPS activo — tu ubicación se usa como punto de partida
        </div>
      )}

      {/* ── Main layout ── */}
      <div className="flex-1 flex flex-col lg:flex-row gap-4 p-4 max-w-7xl mx-auto w-full">

        {/* Map */}
        <div className="rf-view-map rounded-2xl overflow-hidden
                        border border-white/7 shadow-[0_8px_32px_rgba(0,0,0,.6)]
                        h-[55vw] min-h-[280px] max-h-[500px]
                        lg:h-auto lg:max-h-none lg:flex-1 lg:min-h-[540px]">
          <MapContainer center={centroMapa} zoom={14} className="h-full w-full" scrollWheelZoom>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapResizer />
            <MapCenter center={centroMapa} />

            {/* Tramo cerrado */}
            <Polyline
              positions={[inicioObra, finObra]}
              pathOptions={{ color: '#f43f5e', weight: 9, opacity: 0.9 }}
            />
            <Circle center={inicioObra} radius={80}
              pathOptions={{ color: '#f43f5e', fillColor: '#f43f5e', fillOpacity: 0.12, weight: 2, dashArray: '6 4' }} />
            <Circle center={finObra} radius={80}
              pathOptions={{ color: '#f43f5e', fillColor: '#f43f5e', fillOpacity: 0.12, weight: 2, dashArray: '6 4' }} />

            <Marker position={inicioObra} icon={redIcon}>
              <Popup>🚧 Inicio obra: {obra.titulo}</Popup>
            </Marker>
            <Marker position={finObra}>
              <Popup>🚧 Fin obra (tramo cerrado)</Popup>
            </Marker>

            <DraggableDestino position={destinoActual} onChange={handleDestinoChange} />

            <RutaDesvio
              inicioObra={inicioObra} finObra={finObra}
              origen={origen} destino={destinoActual}
            />
            {!ORS_API_KEY.trim() && (
              <RoutingControl from={userPosition} to={destinoActual} avoid={centroMapa} />
            )}
          </MapContainer>
        </div>

        {/* Sidebar */}
        <aside className="w-full lg:w-[360px] flex flex-col gap-4">

          {/* Obra header card */}
          <div className="rounded-2xl border border-white/7 bg-[#0e1623] p-5
                          shadow-[0_8px_32px_rgba(0,0,0,.4)]">
            <div className="flex items-start gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/15 border border-rose-500/25
                              flex items-center justify-center text-lg shrink-0">
                🚧
              </div>
              <div>
                <h1 className="font-bold text-base leading-tight">{obra.titulo}</h1>
                {obra.descripcion && (
                  <p className="text-slate-400 text-xs mt-1 leading-relaxed">{obra.descripcion}</p>
                )}
              </div>
            </div>

            {/* Legend */}
            <div className="flex gap-3 text-xs text-slate-400 pt-3 border-t border-white/7">
              <div className="flex items-center gap-1.5">
                <span className="w-5 h-1.5 rounded bg-rose-500 inline-block shrink-0" />
                Tramo cerrado
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-5 h-1.5 rounded bg-cyan-400 inline-block shrink-0" />
                Ruta de desvío
              </div>
            </div>
          </div>

          {/* Destination panel */}
          <div className="rounded-2xl border border-cyan-500/20 bg-[#0e1623] p-4
                          shadow-[0_8px_32px_rgba(0,0,0,.4)]">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-cyan-400 text-base">📍</span>
              <p className="text-sm font-semibold text-cyan-300">Destino de la ruta</p>
            </div>
            <p className="text-xs text-slate-400 mb-3 leading-relaxed">
              Arrastra el <strong className="text-white">pin azul</strong> en el mapa para cambiar el punto de llegada.
            </p>
            <div className="font-mono text-xs text-slate-400 bg-white/4 rounded-lg px-3 py-2 border border-white/7 mb-2">
              {destinoActual[0].toFixed(5)}, {destinoActual[1].toFixed(5)}
            </div>
            {!destinoEsDefault && (
              <button
                onClick={handleResetDestino}
                className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors flex items-center gap-1"
              >
                ↩ Volver al punto de desvío original
              </button>
            )}
          </div>

          {/* GPS status */}
          <div className={`rounded-2xl border p-4 shadow-[0_8px_32px_rgba(0,0,0,.4)]
            ${userPosition
              ? 'border-green-500/20 bg-green-500/6'
              : 'border-white/7 bg-[#0e1623]'}`}>
            <div className="flex items-center gap-2">
              <span className={`text-base ${userPosition ? 'text-green-400' : 'text-slate-500'}`}>
                {userPosition ? '📡' : '🔍'}
              </span>
              <div>
                <p className={`text-xs font-semibold ${userPosition ? 'text-green-300' : 'text-slate-400'}`}>
                  {userPosition ? 'Tu ubicación detectada' : 'Sin ubicación GPS'}
                </p>
                <p className="text-xs text-slate-500">
                  {userPosition
                    ? `${userPosition[0].toFixed(4)}, ${userPosition[1].toFixed(4)}`
                    : 'Usando inicio de obra como origen'}
                </p>
              </div>
            </div>
          </div>

          {/* Photo gallery */}
          {fotos.length > 0 && (
            <div className="rounded-2xl border border-white/7 bg-[#0e1623] p-4
                            shadow-[0_8px_32px_rgba(0,0,0,.4)]">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                Fotos de la obra
              </p>

              {/* Main photo */}
              <a href={fotos[imgIndex]} target="_blank" rel="noopener noreferrer"
                className="block rounded-xl overflow-hidden aspect-video bg-[#131e30]
                            border border-white/7 mb-2 no-underline">
                <img
                  src={fotos[imgIndex]}
                  alt={`Foto ${imgIndex + 1}`}
                  className="w-full h-full object-cover transition-opacity duration-300"
                  onError={e => {
                    (e.target as HTMLImageElement).src =
                      'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 120"><rect fill="%23131e30" width="200" height="120"/><text x="100" y="65" fill="%234b6080" text-anchor="middle" font-size="12" font-family="sans-serif">Sin imagen</text></svg>';
                  }}
                />
              </a>

              {/* Thumbnails */}
              {fotos.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {fotos.map((url, i) => (
                    <button
                      key={i}
                      onClick={() => setImgIndex(i)}
                      className={`shrink-0 w-14 h-10 rounded-lg overflow-hidden border-2 transition-all
                        ${i === imgIndex ? 'border-orange-400 scale-105' : 'border-transparent opacity-50 hover:opacity-80'}`}
                    >
                      <img src={url} alt={`Thumb ${i + 1}`} className="w-full h-full object-cover"
                        onError={e => { (e.target as HTMLImageElement).src = ''; }} />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

        </aside>
      </div>
    </div>
  );
}
