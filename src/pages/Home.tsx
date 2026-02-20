import { Link } from 'react-router-dom';

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <header className="bg-amber-600 text-white px-4 py-3 shadow">
        <div className="max-w-6xl mx-auto">
          <span className="font-bold text-lg">RutaFix</span>
        </div>
      </header>
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <h1 className="text-2xl font-bold text-slate-800 mb-2">
            Gestión de desvíos por obras
          </h1>
          <p className="text-slate-600 mb-6">
            Demo para registrar obras en el mapa y compartir rutas de desvío con código QR.
          </p>
          <Link
            to="/admin"
            className="inline-block w-full py-3 px-4 bg-amber-600 hover:bg-amber-700 text-white font-medium rounded-xl transition"
          >
            Ir al panel Admin
          </Link>
          <p className="mt-4 text-sm text-slate-500">
            En Admin podrás colocar obra y desvío en el mapa, guardar y obtener un QR que enlaza a la vista de la obra con la ruta.
          </p>
        </div>
      </main>
    </div>
  );
}
