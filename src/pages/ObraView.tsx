import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, Polyline, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import { supabase } from '../lib/supabase';
import type { Obra } from '../lib/supabase';
import RoutingControl, { getViaPointAround } from '../components/RoutingControl';
import { getDrivingRoute } from '../lib/openrouteservice';

import 'leaflet/dist/leaflet.css';

const ORS_API_KEY = import.meta.env.VITE_OPENROUTESERVICE_KEY ?? '';

const redIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const blueIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

function MapCenter({ center }: { center: [number, number] }) {
  const map = useMap();
  const initialized = useRef(false);
  useEffect(() => {
    if (!initialized.current) {
      map.setView(center, 14);
      initialized.current = true;
    }
  }, [map, center]);
  return null;
}

/** Punto medio del tramo cerrado */
function midpoint(a: [number, number], b: [number, number]): [number, number] {
  return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
}

/** Ruta de desvío por calles hacia el destino personalizado */
function RutaDesvio({
  inicioObra,
  finObra,
  origen,
  destino,
}: {
  inicioObra: [number, number];
  finObra: [number, number];
  origen: [number, number];
  destino: [number, number];
}) {
  const [geometry, setGeometry] = useState<[number, number][] | null>(null);
  const via = getViaPointAround(origen, destino, midpoint(inicioObra, finObra), 0.001);
  const fallbackPositions: [number, number][] = [origen, via, destino];
  // Siempre evitar el tramo cerrado — el polígono no cubre los extremos,
  // así que ORS puede rutear hacia/desde inicioObra y finObra sin error.
  const avoidSegment: [number, number][] = [inicioObra, finObra];

  useEffect(() => {
    if (!ORS_API_KEY.trim()) {
      setGeometry(null);
      return;
    }
    let cancelled = false;
    getDrivingRoute([origen, destino], ORS_API_KEY, avoidSegment).then((route) => {
      if (!cancelled && route?.length) setGeometry(route);
      else setGeometry(null);
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [origen[0], origen[1], destino[0], destino[1], inicioObra[0], inicioObra[1], finObra[0], finObra[1]]);

  const positions = geometry ?? fallbackPositions;
  return (
    <Polyline
      positions={positions}
      pathOptions={{ color: '#0ea5e9', weight: 8, opacity: 0.95 }}
    />
  );
}

/** Pin arrastrable de destino */
function DraggableDestino({
  position,
  onChange,
}: {
  position: [number, number];
  onChange: (pos: [number, number]) => void;
}) {
  const markerRef = useRef<L.Marker>(null);

  const eventHandlers = {
    dragend() {
      const marker = markerRef.current;
      if (marker) {
        const { lat, lng } = marker.getLatLng();
        onChange([lat, lng]);
      }
    },
  };

  return (
    <Marker
      position={position}
      icon={blueIcon}
      draggable
      ref={markerRef}
      eventHandlers={eventHandlers}
    >
      <Popup>
        📍 <strong>Destino</strong><br />
        Arrastra este pin para cambiar el punto de llegada.
      </Popup>
    </Marker>
  );
}

export default function ObraView() {
  const { id } = useParams<{ id: string }>();
  const [obra, setObra] = useState<Obra | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [userPosition, setUserPosition] = useState<[number, number] | null>(null);
  const [destino, setDestino] = useState<[number, number] | null>(null);

  useEffect(() => {
    if (!id) {
      setError('Falta el ID de la obra.');
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from('obras')
          .select('*')
          .eq('id', id)
          .single();
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
    // Inicializar destino en el fin de la obra
    setDestino([obra.lat_desvio, obra.lng_desvio]);

    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserPosition([pos.coords.latitude, pos.coords.longitude]),
      () => setUserPosition(null),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  }, [obra]);

  const handleDestinoChange = useCallback((pos: [number, number]) => {
    setDestino(pos);
  }, []);

  const handleResetDestino = useCallback(() => {
    if (obra) setDestino([obra.lat_desvio, obra.lng_desvio]);
  }, [obra]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <p className="text-slate-600">Cargando obra…</p>
      </div>
    );
  }

  if (error || !obra) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-lg p-6 text-center">
          <p className="text-red-600">{error || 'Obra no encontrada.'}</p>
          <Link to="/" className="mt-4 inline-block text-amber-600 hover:underline">
            Volver al inicio
          </Link>
        </div>
      </div>
    );
  }

  const inicioObra: [number, number] = [obra.lat_obra, obra.lng_obra];
  const finObra: [number, number] = [obra.lat_desvio, obra.lng_desvio];
  const centroMapa = midpoint(inicioObra, finObra);
  const fotos = Array.isArray(obra.fotos) ? obra.fotos : [];
  const origen: [number, number] = userPosition ?? inicioObra;
  const destinoActual: [number, number] = destino ?? finObra;
  const destinoEsDefault =
    destino === null ||
    (destino[0] === finObra[0] && destino[1] === finObra[1]);

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <header className="bg-amber-600 text-white px-4 py-3 shadow">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link to="/" className="font-bold text-lg">RutaFix</Link>
          <span className="text-amber-100 text-sm">Desvío por obras</span>
        </div>
      </header>

      <div className="flex-1 flex flex-col lg:flex-row gap-4 p-4 max-w-6xl mx-auto w-full">
        <div className="flex-1 min-h-[400px] rounded-xl overflow-hidden shadow-lg bg-white">
          <MapContainer
            center={centroMapa}
            zoom={14}
            className="h-full w-full"
            scrollWheelZoom
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapCenter center={centroMapa} />

            {/* Tramo cerrado */}
            <Polyline
              positions={[inicioObra, finObra]}
              pathOptions={{ color: '#dc2626', weight: 10, opacity: 0.9 }}
            />
            {/* Círculos de zona de exclusión alrededor de los pines de obra */}
            <Circle
              center={inicioObra}
              radius={80}
              pathOptions={{ color: '#dc2626', fillColor: '#dc2626', fillOpacity: 0.15, weight: 2, dashArray: '6 4' }}
            />
            <Circle
              center={finObra}
              radius={80}
              pathOptions={{ color: '#dc2626', fillColor: '#dc2626', fillOpacity: 0.15, weight: 2, dashArray: '6 4' }}
            />
            <Marker position={inicioObra} icon={redIcon}>
              <Popup>🚧 Inicio obra: {obra.titulo}</Popup>
            </Marker>
            <Marker position={finObra}>
              <Popup>🚧 Fin obra (tramo cerrado hasta aquí)</Popup>
            </Marker>

            {/* Pin de destino arrastrable */}
            <DraggableDestino position={destinoActual} onChange={handleDestinoChange} />

            {/* Ruta de desvío */}
            <RutaDesvio
              inicioObra={inicioObra}
              finObra={finObra}
              origen={origen}
              destino={destinoActual}
            />
            {!ORS_API_KEY.trim() && (
              <RoutingControl from={userPosition} to={destinoActual} avoid={centroMapa} />
            )}
          </MapContainer>
        </div>

        <aside className="w-full lg:w-96">
          <div className="bg-white rounded-xl shadow-lg p-4 space-y-4">
            <h1 className="text-xl font-bold text-slate-800">{obra.titulo}</h1>
            {obra.descripcion && (
              <p className="text-slate-600 text-sm">{obra.descripcion}</p>
            )}

            {/* Panel de destino */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-2">
              <p className="text-sm font-semibold text-blue-800">📍 Destino de la ruta</p>
              <p className="text-xs text-blue-600">
                Arrastra el <strong>pin azul</strong> en el mapa para cambiar el punto de llegada. La ruta se actualizará automáticamente.
              </p>
              <div className="text-xs text-slate-500 font-mono bg-white rounded px-2 py-1 border border-blue-100">
                {destinoActual[0].toFixed(5)}, {destinoActual[1].toFixed(5)}
              </div>
              {!destinoEsDefault && (
                <button
                  onClick={handleResetDestino}
                  className="text-xs text-blue-600 hover:text-blue-800 underline"
                >
                  ↩ Volver al punto de desvío original
                </button>
              )}
            </div>

            <div className="flex gap-3 text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <span className="inline-block w-5 h-1.5 bg-red-600 rounded" /> Tramo cerrado
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block w-5 h-1.5 bg-sky-500 rounded" /> Ruta de desvío
              </span>
            </div>

            {fotos.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-slate-700 mb-2">Fotos</h2>
                <div className="grid grid-cols-2 gap-2">
                  {fotos.map((url, i) => (
                    <a
                      key={i}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block rounded-lg overflow-hidden border border-slate-200 aspect-video bg-slate-100"
                    >
                      <img
                        src={url}
                        alt={`Obra ${i + 1}`}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%23e2e8f0" width="100" height="100"/><text x="50" y="50" fill="%2394a3b8" text-anchor="middle" dy=".3em" font-size="10">Sin imagen</text></svg>';
                        }}
                      />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
