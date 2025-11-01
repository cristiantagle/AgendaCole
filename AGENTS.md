Contexto y estado del proyecto (Resumen actualizado)

Estructura actual (Next.js en raíz)
- SPA estática (legacy prototipo):
  - `legacy-spa/` con `index.html`, `css/styles.css`, `js/*`. Solo referencia.
- Aplicación principal (Next.js 16 + React 19):
  - `app/` — App Router, páginas y modales.
  - `components/` — `Modal`, `Toaster`, `ConfirmDialog`, `SchoolDetail`, `CourseAgenda`, `AddSchoolModal`, `EditAppointmentModal`.
  - `lib/` — `supabase-browser`, `supabase` (server), `toast` helper.
  - `app/api/**` — Rutas API (Supabase) para colegios, cursos, agendamientos, comentarios, import.
  - `supabase_schema.sql` (raíz) — Esquema de tablas e índices.
  - `ejemplo1.png`, `ejemplo2.png` — Referencias visuales.

Dependencias clave
- Next.js 16 (App Router), React 19.
- @supabase/supabase-js v2 (DB/Auth/RLS), XLSX para importación.
- Tailwind base + estilos globales custom (no shadcn por ahora).

Supabase (DB) — Tablas y campos relevantes
- colegios: id (text), nombre (text), telefono, correo, estado, comentarios,
  codigo_colegio, pagina_web, director_nombre, director_apellido, director_email,
  lat (double precision), lng (double precision).
- cursos: id (text), id_colegio (FK), curso (text) con índice único (id_colegio, lower(curso)).
- agendamientos: id (text), id_colegio (nullable), id_curso (nullable), tipo ('llamada'|'visita'), fecha (date), hora (time), descripcion, observaciones.
- comentarios: id (text), id_colegio, autor, fecha (timestamptz), texto.

Autenticación y RLS
- La aplicación funciona sin login; todas las peticiones usan el cliente público de Supabase.
- RLS preparado para activarse (políticas fuera de este archivo). Ajustar policies según roles.

Importación Excel (`app/api/import/route.ts`)
- Detección robusta de columnas (insensible a mayúsculas/espacios):
  - "colegio" (obligatoria) — fuerza uso como nombre aunque el mapping apunte a otra cosa.
  - "curso" + "letra curso" — se concatena (ej. `1` + `A` ⇒ `1A`).
  - Teléfono: múltiples variantes (TELÉFONO COLEGIO/TELÉFONOCOLEGIO/telefono...).
  - Web: PÁGINAWEB/PaginaWeb/página web.
  - Código colegio, y director: nombre, apellido, email.
- Evita duplicar colegios por nombre (ilike) y cursos por (colegio, curso lowercase).
- Actualiza campos estructurados y siempre refresca el teléfono si viene en Excel.

UI/UX (mobile-first, todo en modales)
- ConfirmDialog: reemplaza confirm nativo para eliminaciones (colegios, agendamientos, etc.).
- EditAppointmentModal: edición de fecha/hora en "Próximos agendamientos" (sin prompts).
- SchoolDetail (modal): edición de colegio, agenda del colegio, cursos (agregar/eliminar/abrir agenda), comentarios.
- CourseAgenda (modal): solo "Visita"; emite `app:refresh-appointments` para refrescar SchoolDetail.
- AddSchoolModal: alta de colegio + curso inicial opcional (sin prompts).
- Tarjetas: filas de Teléfono/Web/Correo con links; nombres de colegio (no códigos); badges de tipo y curso.
- Enlaces Web con protocolo absoluto (https) para evitar 404 en Vercel.
- Topbar y footer visibles; scroll interno de modales pulido (estilos en `app/globals.css`).

Validación de conflictos (±2h)
- Back-end: 409 `{ conflict: true, count, conflicts: [{ fecha, hora, tipo, colegio, curso }], allowedForce }`.
- `allowedForce = true` solo si todos los conflictos son del mismo colegio.
- Front-end: modal "Horario ocupado" con badges (Colegio/Curso/Tipo) y CTA "Agendar de todas maneras" solo si `allowedForce`.

Waze (navegación)
- Botón con ícono en cada tarjeta abre un modal para ingresar la dirección del colegio.
- Al guardar: persistencia en `localStorage` por colegio y `PATCH /api/schools/{id}` con `{ direccion }`.
- Abre `https://waze.com/ul?q=<DIRECCION>` (app/web según dispositivo).
- El modal precarga la dirección desde localStorage o desde la base si existe.

Búsqueda y dashboard
- Filtro `q` busca por: nombre, teléfono, correo, dirección, código, director (nombre/apellido/email), web.
- Acciones en tarjeta: Waze, marcar contactado/no, ver detalle, eliminar.
- Importar/Exportar XLSX desde toolbar.

Cómo correr en local
- Copiar `.env.example` a `.env.local` y completar `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- `npm i` y `npm run dev` (Next 16 + Turbopack).
- Si hay errores raros, borrar `.next` y reiniciar dev.

Notas para agentes
- Respetar `allowedForce` en conflictos; solo forzar si todos los choques son del mismo colegio.
- Reutilizar `Modal`, `ConfirmDialog`, `Toaster` y estilos globales; evitar librerías de UI adicionales salvo acuerdo.
- Evitar emojis en UI; preferir íconos (lucide o SVG inline) y texto UTF-8 correcto.
- Mantener nombres de colegio visibles en UI (no códigos). Código es interno para lógica/búsqueda.
- Si agregas nuevos campos persistentes, refleja cambios en `supabase_schema.sql` y en rutas API.
codex resume 019a2f98-fd48-78b0-bd9b-e89901ef92bf
