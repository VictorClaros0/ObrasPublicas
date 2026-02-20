-- Tabla 'obras' para la demo de gestión de desvíos viales
-- Ejecuta este script en el SQL Editor de tu proyecto Supabase

create table if not exists public.obras (
  id uuid default gen_random_uuid() primary key,
  titulo text not null,
  descripcion text,
  lat_obra double precision not null,
  lng_obra double precision not null,
  lat_desvio double precision not null,
  lng_desvio double precision not null,
  fotos text[] default '{}',
  created_at timestamptz default now()
);

-- Habilitar RLS (opcional; si quieres acceso anónimo de lectura, configura políticas)
alter table public.obras enable row level security;

-- Política: permitir lectura pública (para la página /obra/:id)
create policy "Lectura pública de obras"
  on public.obras for select
  using (true);

-- Política: permitir inserción (ajusta según tu auth; aquí permitimos anónimo para demo)
create policy "Inserción de obras"
  on public.obras for insert
  with check (true);

-- Política: permitir actualización (opcional, para admin)
create policy "Actualización de obras"
  on public.obras for update
  using (true);
