import { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { MapContainer, TileLayer, useMapEvents, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { QRCodeSVG } from 'qrcode.react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { Obra } from '../lib/supabase';

import 'leaflet/dist/leaflet.css';

const defaultCenter: [number, number] = [-17.3935, -66.157]; // Cochabamba, Bolivia

const obraIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const desvioIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

function MapClickHandler({
  onObraClick,
  onDesvioClick,
  step,
}: {
  onObraClick: (lat: number, lng: number) => void;
  onDesvioClick: (lat: number, lng: number) => void;
  step: 'obra' | 'desvio' | 'done';
}) {
  useMapEvents({
    click(e: L.LeafletMouseEvent) {
      if (step === 'obra') {
        onObraClick(e.latlng.lat, e.latlng.lng);
      } else if (step === 'desvio') {
        onDesvioClick(e.latlng.lat, e.latlng.lng);
      }
    },
  });
  return null;
}

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

  const handleObraClick = useCallback((lat: number, lng: number) => {
    setObra({ lat, lng });
    setStep('desvio');
    setError('');
  }, []);

  const handleDesvioClick = useCallback((lat: number, lng: number) => {
    setDesvio({ lat, lng });
    setStep('done');
    setError('');
  }, []);

  const handleReset = useCallback(() => {
    setObra(null);
    setDesvio(null);
    setStep('obra');
    setSavedObra(null);
    setError('');
  }, []);

  const handleSave = async () => {
    if (!obra || !desvio) {
      setError('Haz clic en el mapa: primero en la obra y luego en el punto de desvío.');
      return;
    }
    if (!titulo.trim()) {
      setError('Escribe un título.');
      return;
    }
    setError('');
    setSaving(true);
    try {
      const fotosArray = fotos
        .split(/[\n,]/)
        .map((u) => u.trim())
        .filter(Boolean);
      const { data, error: err } = await supabase
        .from('obras')
        .insert({
          titulo: titulo.trim(),
          descripcion: descripcion.trim() || null,
          lat_obra: obra.lat,
          lng_obra: obra.lng,
          lat_desvio: desvio.lat,
          lng_desvio: desvio.lng,
          fotos: fotosArray,
        })
        .select()
        .single();
      if (err) throw err;
      setSavedObra(data as Obra);
    } catch (e: unknown) {
      const err = e as { message?: string; code?: string; details?: string; hint?: string };
      const msg = err?.message ?? (e instanceof Error ? e.message : String(e));
      // Si el mensaje es una URL, casi seguro .env apunta a un sitio equivocado
      if (typeof msg === 'string' && (msg.startsWith('http://') || msg.startsWith('https://'))) {
        setError(
          'Error de conexión. En .env usa VITE_SUPABASE_URL de tu proyecto Supabase (https://xxx.supabase.co), no una URL de imagen.'
        );
      } else {
        const extra = [err?.code, err?.details, err?.hint].filter(Boolean).join(' · ');
        setError(extra ? `${msg}${extra ? ` (${extra})` : ''}` : msg || 'Error al guardar');
      }
    } finally {
      setSaving(false);
    }
  };

  const obraUrl = savedObra
    ? `${window.location.origin}${import.meta.env.BASE_URL}obra/${savedObra.id}`
    : '';

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      {!isSupabaseConfigured && (
        <div className="bg-red-600 text-white px-4 py-3 text-center text-sm font-medium">
          ⚠️ Configura Supabase: edita el archivo <code className="bg-red-700 px-1 rounded">.env</code> en la raíz del proyecto. Sustituye <code className="bg-red-700 px-1 rounded">VITE_SUPABASE_URL</code> por la URL real de tu proyecto (Dashboard → Project Settings → API → Project URL). Guarda y reinicia con <code className="bg-red-700 px-1 rounded">npm run dev</code>.
        </div>
      )}
      <header className="bg-amber-600 text-white px-4 py-3 shadow">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link to="/" className="font-bold text-lg">RutaFix</Link>
          <span className="text-amber-100 text-sm">Admin – Registrar desvíos</span>
        </div>
      </header>

      <div className="flex-1 flex flex-col lg:flex-row gap-4 p-4 max-w-6xl mx-auto w-full">
        <div className="flex-1 min-h-[400px] rounded-xl overflow-hidden shadow-lg bg-white">
          <MapContainer
            center={defaultCenter}
            zoom={6}
            className="h-full w-full"
            scrollWheelZoom
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapClickHandler
              step={step}
              onObraClick={handleObraClick}
              onDesvioClick={handleDesvioClick}
            />
            {obra && (
              <Marker position={[obra.lat, obra.lng]} icon={obraIcon}>
                <Popup>Inicio de la obra</Popup>
              </Marker>
            )}
            {desvio && (
              <Marker position={[desvio.lat, desvio.lng]} icon={desvioIcon}>
                <Popup>Fin de la obra</Popup>
              </Marker>
            )}
          </MapContainer>
        </div>

        <aside className="w-full lg:w-96 space-y-4">
          <form
            className="bg-white rounded-xl shadow-lg p-4 space-y-3"
            onSubmit={(e) => e.preventDefault()}
          >
            <p className="text-sm text-slate-600">
              {step === 'obra' && '1. Haz clic donde inicia la obra (inicio del tramo cerrado).'}
              {step === 'desvio' && '2. Haz clic donde termina la obra (fin del tramo cerrado).'}
              {step === 'done' && 'Completa título/descripción y guarda.'}
            </p>
            <input
              type="text"
              placeholder="Título de la obra"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            />
            <textarea
              placeholder="Descripción (opcional)"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            />
            <textarea
              placeholder="URLs de fotos (una por línea o separadas por coma)"
              value={fotos}
              onChange={(e) => setFotos(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-sm"
            />
            {error && <p className="text-red-600 text-sm">{error}</p>}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || !obra || !desvio}
                className="flex-1 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-medium py-2 px-4 rounded-lg"
              >
                {saving ? 'Guardando…' : 'Guardar'}
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50"
              >
                Reiniciar
              </button>
            </div>
          </form>

          {savedObra && (
            <div className="bg-white rounded-xl shadow-lg p-4">
              <h3 className="font-semibold text-slate-800 mb-2">Código QR – Comparte la obra</h3>
              <p className="text-xs text-slate-500 mb-2">
                Escanea para abrir la ruta de desvío en el móvil.
              </p>
              <div className="flex justify-center p-3 bg-white border border-slate-200 rounded-lg">
                <QRCodeSVG value={obraUrl} size={180} level="M" />
              </div>
              <a
                href={obraUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 block text-sm text-amber-600 hover:underline break-all"
              >
                {obraUrl}
              </a>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
