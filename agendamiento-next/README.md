# Agendamiento Colegios — Next.js 16 + React 19

Proyecto Next (App Router) con Supabase para gestionar colegios, cursos, agendamientos y comentarios. Incluye APIs con validación de conflictos (±2 horas) y endpoint de importación Excel.

## Requisitos
- Node 18+
- Credenciales Supabase: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- Esquema de base de datos: usa `../supabase_schema.sql` (en la raíz).

## Instalación
```
cd agendamiento-next
cp .env.example .env.local   # edita URL y KEY
npm i
npm run dev
```
Abre http://localhost:3000

## Estructura
- `app/page.tsx`: Dashboard (buscar/filtrar/ordenar, agregar, marcar estado, eliminar, importar Excel).
- `app/schools/[id]/page.tsx`: Ficha de colegio (editar campos, agenda del colegio, cursos, comentarios).
- `app/courses/[id]/page.tsx`: Agenda del curso.
- API
  - `app/api/schools`: listar/crear colegios.
  - `app/api/schools/[id]`: obtener/editar/eliminar colegio.
  - `app/api/courses/school/[schoolId]`: listar/agregar cursos.
  - `app/api/courses/[id]`: eliminar curso.
  - `app/api/appointments/school/[schoolId]`: listar/agendar (con conflictos ±2h y `force`).
  - `app/api/appointments/course/[courseId]`: listar/agendar (con conflictos ±2h y `force`).
  - `app/api/appointments/[id]`: editar/eliminar agendamiento.
  - `app/api/comments/school/[schoolId]`: listar/agregar comentarios.
  - `app/api/comments/[id]`: eliminar comentario.
  - `app/api/import`: subir Excel/CSV, detectar columnas y upsert sin duplicados.
- `lib/supabase.ts`: cliente Supabase (anon) para servidor.

## Notas de seguridad y roles
- Habilita RLS y crea políticas según tu necesidad (admin/usuario). Un ejemplo básico está comentado en `../supabase_schema.sql`.
- Con RLS activo, las APIs funcionarán según las policies que definas.

## Conflictos de horario
- Endpoints de creación en agenda devuelven 409 con `{ conflict: true, count }` si detectan topes ±2h; reintenta con `force: true` para confirmar.

## Importar Excel
- `POST /api/import` con `form-data` campo `file`. Usa `xlsx` en el servidor para leer la primera hoja. Columnas detectadas: `colegio|nombre`, `direccion|dirección`, `telefono|teléfono|fono`, `correo|email`, `curso|grado`.

## Siguientes pasos (opcional)
- Autenticación Supabase + RLS por rol (admin/usuario).
- Realtime para avisos en vivo de conflictos o nuevas actividades.
- UI con Tailwind + shadcn/ui (puedo añadirlo si lo deseas).
