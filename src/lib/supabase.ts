import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';

const isPlaceholderUrl =
  !supabaseUrl ||
  /TU_PROJECT_REF|tu_project_ref/i.test(supabaseUrl);

if (isPlaceholderUrl || !supabaseAnonKey) {
  console.warn(
    '[RutaFix] Configura .env: sustituye VITE_SUPABASE_URL por la URL real de tu proyecto Supabase (Project Settings → API). Luego reinicia con: npm run dev'
  );
}

export const isSupabaseConfigured = !isPlaceholderUrl && !!supabaseAnonKey;

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '');

export type Obra = {
  id: string;
  titulo: string;
  descripcion: string | null;
  lat_obra: number;
  lng_obra: number;
  lat_desvio: number;
  lng_desvio: number;
  fotos: string[];
  created_at?: string;
};
