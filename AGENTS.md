Contexto y estado del proyecto (resumen)
=======================================

Estructura actual
-----------------
- `legacy-spa/`: prototipo estático (HTML/CSS/JS) solo de referencia.
- `app/`: App Router de Next.js (páginas, modales y rutas API).
- `components/`: UI reutilizable (`Modal`, `Toaster`, `ConfirmDialog`, `SchoolDetail`, `CourseAgenda`, `AddSchoolModal`, `EditAppointmentModal`).
- `lib/`: helpers de Supabase (`supabase-browser`, `supabase`) y utilidades (ej. `toast`).
- `app/api/**`: rutas para colegios, cursos, agendamientos, comentarios e importación.
- `supabase_schema.sql`: definición de tablas e índices.
- `public/ejemplo*.png`: referencias visuales.

Dependencias clave
------------------
- Next.js 16 (App Router) + React 19.
- `@supabase/supabase-js` v2 para DB/RLS, sesiones públicas.
- `xlsx` para importar planillas.
- Tailwind base + estilos propios (`app/globals.css`).

Supabase (DB)
-------------
- `colegios`: id, nombre, telefono, correo, estado, comentarios, codigo_colegio, pagina_web, direccion, director_nombre/apellido/email.
- `cursos`: id, id_colegio, curso (único por colegio, indexado en lower-case).
- `agendamientos`: id, id_colegio (nullable), id_curso (nullable), tipo (`llamada` | `visita`), fecha, hora, descripcion, observaciones.
- `comentarios`: id, id_colegio, autor, fecha (timestamptz), texto.
- En `supabase_schema.sql` se incluyen alters idempotentes para nuevos campos e índices.

Autenticación y RLS
-------------------
- La app funciona sin login: todas las peticiones usan el cliente público (`supabaseServer()` sin token).
- Las políticas RLS permanecen preparadas pero deben activarse manualmente según roles.

Importación de Excel (`app/api/import/route.ts`)
------------------------------------------------
- Mapea columnas de forma tolerante a mayúsculas/espacios.
- Usa la columna “colegio” como nombre principal; concatena “curso” + “letra curso”.
- Normaliza teléfono, web, dirección y datos del director.
- Evita duplicar colegios (nombre ilike o código) y cursos (colegio+curso lowercase).
- Sobrescribe teléfono existente si hay dato nuevo en la planilla.

UI/UX (mobile-first)
--------------------
- Todo se gestiona vía modales (`SchoolDetail`, `CourseAgenda`, etc.).
- Topbar con navegación responsive (links en desktop, menú hamburger en mobile).
- Toolbars y tarjetas planificadas para pantallas pequeñas (inputs táctiles, botones full-width).
- Los enlaces externos fuerzan https para evitar errores en Vercel.
- El modal de Waze ahora pide dirección legible (no coordenadas) y la persistencia se guarda en localStorage y DB.

Validación de conflictos (±2h)
------------------------------
- Backend responde 409 con `conflicts` y `allowedForce`.
- Solo se permite forzar si los choques pertenecen al mismo colegio.
- Frontend muestra modal “Horario ocupado” con badges Colegio/Curso/Tipo; habilita CTA “Agendar de todas maneras” según `allowedForce`.

Waze
----
- El botón de cada tarjeta abre modal de dirección.
- Guarda `{ direccion }` en `localStorage` y `PATCH /api/schools/{id}`.
- Abre `https://waze.com/ul?q=<DIRECCION>` (app/web).

Búsqueda y dashboard
--------------------
- Filtro `q` busca en nombre, teléfono, correo, dirección, código, datos del director y web.
- Acciones por tarjeta: Waze, marcar contacto, ver detalle, eliminar.
- Toolbar con importación/exportación XLSX.

Ejecución local
---------------
1. Copiar `.env.example` a `.env.local` y rellenar `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
2. `npm install`.
3. `npm run dev` (Turbopack).
4. Si aparecen errores extraños, borrar `.next/` y reiniciar.

Notas para agentes
------------------
- Mantener el flujo sin login ni headers `Authorization`.
- Usar componentes existentes (`Modal`, `ConfirmDialog`, `Toaster`) y clases globales; evitar UI libs extra.
- Asegurar que los campos nuevos se reflejen en `supabase_schema.sql` y en las rutas API.
- Respetar la lógica de conflictos y el evento `app:refresh-appointments`.
- Mantener nombres de colegio visibles; los códigos son internos para búsqueda.
