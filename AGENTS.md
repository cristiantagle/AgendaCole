Contexto y estado del proyecto (Resumen para agentes)

Estructura actual
- SPA estática (legacy prototipo):
  - index.html, css/styles.css, js/* — prototipo inicial 100% en navegador con localStorage y XLSX por CDN.
  - Útil como referencia; hoy el desarrollo principal ocurre en Next.
- Aplicación principal: agendamiento-next (Next.js 16 + React 19)
  - app/ — App Router, páginas y modales.
  - components/ — Modal, Toaster, SchoolDetail (detalle de colegio), CourseAgenda (agenda curso), AddSchoolModal.
  - lib/ — supabase-browser, supabase (server), toast helper.
  - app/api/** — Rutas API (Supabase) para colegios, cursos, agendamientos, comentarios, import.
  - supabase_schema.sql (raíz) — Esquema de tablas e índices.

Dependencias clave
- Next.js 16 (App Router, server actions no usadas aún), React 19.
- @supabase/supabase-js v2 (DB/Auth/RLS), XLSX para importación.
- Tailwind base (sin shadcn todavía), estilos globales custom.

Supabase (DB) — Tablas y campos relevantes
- colegios: id (text), nombre (text), telefono, correo, estado, comentarios,
  codigo_colegio, pagina_web, director_nombre, director_apellido, director_email.
- cursos: id (text), id_colegio (FK), curso (text) con índice único (id_colegio, lower(curso)).
- agendamientos: id (text), id_colegio (nullable), id_curso (nullable), tipo ('llamada'|'visita'), fecha (date), hora (time), descripcion, observaciones.
- comentarios: id (text), id_colegio, autor, fecha (timestamptz), texto.

Autenticación y RLS
- Cliente incluye Authorization: Bearer <token> si existe (login simple en /login).
- RLS: preparado para activarse (políticas no incluidas en este resumen). Ajustar policies para permitir lectura y las escrituras requeridas.

Importación Excel (app/api/import/route.ts)
- Detección de columnas del esquema proporcionado (insensible a mayúsculas/espacios):
  - "colegio" (obligatoria) — fuerza uso como nombre aunque el mapping apunte a otra cosa.
  - "curso" + "letra curso" — concatena (ej. 1 + A ⇒ 1A).
  - "TELÉFONO COLEGIO"/"TELÉFONOCOLEGIO" y variantes, "MAILCOLEGIO", "PÁGINAWEB".
  - "código colegio"; director: "nombre director", "apellido  director", "MAILDIRECTOR".
- Evita duplicar colegios por nombre (ilike) y cursos por (colegio, curso lowercase).
- Completa campos estructurados en colegios y actualiza teléfono siempre que venga en Excel.

UI/UX y navegación (mobile-first)
- Todo a modal (no navegación de página):
  - SchoolDetail (Detalle colegio) en modal: edición completa de colegio, agenda del colegio, cursos (agregar/eliminar/abrir agenda), comentarios.
  - CourseAgenda (Agenda curso) en modal: solo "Visita".
  - AddSchoolModal: alta de colegio + curso inicial opcional.
- Estilos: gradiente de fondo, tarjetas con elevación/hover, botones con gradient y transiciones, inputs con foco visible, modales con animación y scroll interno.
- Toaster global (components/Toaster) para feedback de acciones; usar lib/toast.ts.

Validación de conflictos (±2h) y confirmación
- Back-end: devuelve 409 con payload { conflict: true, count, conflicts: [{ fecha, hora, tipo, colegio, curso }], allowedForce }.
- allowedForce: true sólo si todos los conflictos pertenecen al mismo colegio.
- Front-end: muestra modal "Horario ocupado" con lista "bonita" (badges Colegio/Curso) y pregunta explícita.
  - Botón "Agendar de todas maneras" sólo cuando allowedForce = true (mismo colegio).
  - Caso curso: tipo forzado a "visita".

Agenda combinada en detalle de colegio
- SchoolDetail llama GET /api/appointments/school/[schoolId]?combined=1
  - Muestra agendamientos del colegio y de todos sus cursos (badge "Curso: X" o badge "Colegio").
- CourseAgenda emite app:refresh-appointments con schoolId tras agendar para refrescar el modal de colegio si está abierto.

Búsqueda y dashboard
- Filtro q busca por: nombre, teléfono, correo, código, director (nombre/apellido/email), web.
- Tarjetas muestran: teléfono, web, correo, código, director (nombre+apellido) y estado.
- Ver detalle abre SchoolDetail; desde ahí se abre CourseAgenda.
- Importar/Exportar XLSX desde toolbar (exporta colegios del dashboard).

Puntos pendientes / siguientes pasos recomendados
1) Policies RLS en Supabase para admin/usuario y claims; bloquear escrituras según rol.
2) Reemplazar alerts residuales por Dialog/Toast uniformes (si queda alguno).
3) Badges adicionales para tipo (Llamada/Visita) en listas (conflictos y agenda).
4) Breadcrumb dentro de modales (Colegios > Nombre, y Colegio > Curso) y deep-link opcional.
5) shadcn/ui (Dialog/Toast/Select/Card) para unificar diseño; tema claro/oscuro.
6) Exportar datasets ampliados (colegios, cursos, agendamientos, comentarios en hojas separadas).
7) QA: pruebas de mapping Excel con cabeceras atípicas y grandes volúmenes.

Cómo correr en local
- cd agendamiento-next
- cp .env.example .env.local y completar NEXT_PUBLIC_SUPABASE_URL/ANON_KEY
- npm i && npm run dev (Next 16 + Turbopack)
- Si hay errores de params (Promise), limpiar caché: borrar .next y reiniciar dev.

Notas para agentes
- Priorizar cambios en agendamiento-next (Next). La SPA estática es de referencia.
- Respetar allowedForce en conflictos: sólo continuar si todos los choques son del mismo colegio.
- Para UI usar los componentes existentes (Modal, Toaster) y los estilos globales. Evitar introducir frameworks adicionales salvo acuerdo (shadcn sugerido como posible mejora).
codex resume 019a27d9-b402-74d3-86b4-db23aa761ef0