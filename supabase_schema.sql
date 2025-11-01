-- Tablas para Agendamiento Colegios

create table if not exists colegios (
  id text primary key,
  nombre text not null,
  telefono text,
  correo text,
  direccion text,
  estado text default 'no_contactado' check (estado in ('no_contactado','contactado')),
  comentarios text,
  -- Nuevos campos estructurados
  codigo_colegio text,
  pagina_web text,
  director_nombre text,
  director_apellido text,
  director_email text
);

create table if not exists cursos (
  id text primary key,
  id_colegio text not null references colegios(id) on delete cascade,
  curso text not null
);
create index if not exists idx_cursos_colegio on cursos(id_colegio);
create unique index if not exists uniq_curso_por_colegio on cursos(id_colegio, lower(curso));

create table if not exists agendamientos (
  id text primary key,
  id_colegio text references colegios(id) on delete cascade,
  id_curso text references cursos(id) on delete cascade,
  tipo text not null check (tipo in ('llamada','visita')),
  fecha date not null,
  hora time not null,
  descripcion text,
  observaciones text
);
create index if not exists idx_agenda_colegio on agendamientos(id_colegio, fecha, hora);
create index if not exists idx_agenda_curso on agendamientos(id_curso, fecha, hora);

create table if not exists comentarios (
  id text primary key,
  id_colegio text not null references colegios(id) on delete cascade,
  autor text,
  fecha timestamptz not null default now(),
  texto text
);
create index if not exists idx_comentarios_colegio on comentarios(id_colegio, fecha desc);

-- Migraciones seguras para proyectos existentes
alter table colegios add column if not exists codigo_colegio text;
alter table colegios add column if not exists pagina_web text;
alter table colegios add column if not exists director_nombre text;
alter table colegios add column if not exists director_apellido text;
alter table colegios add column if not exists director_email text;
alter table colegios add column if not exists direccion text;
create index if not exists idx_colegios_nombre on colegios(lower(nombre));
create index if not exists idx_colegios_codigo on colegios(codigo_colegio);

-- RLS (opcional): permitir lectura/escritura a todos los usuarios anonimos
-- alter table colegios enable row level security;
-- alter table cursos enable row level security;
-- alter table agendamientos enable row level security;
-- alter table comentarios enable row level security;
-- create policy "anon_all_colegios" on colegios for all using (true) with check (true);
-- create policy "anon_all_cursos" on cursos for all using (true) with check (true);
-- create policy "anon_all_agenda" on agendamientos for all using (true) with check (true);
-- create policy "anon_all_coment" on comentarios for all using (true) with check (true);




