# AgendaCole — Next.js (raíz)

Aplicación principal de agendamiento escolar con Next.js 16 + React 19 y Supabase. La SPA de referencia se movió a `legacy-spa/` para evitar conflictos de despliegue.

## Ejecutar en local
- `cp .env.example .env.local` y completa `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- `npm i`
- `npm run dev`

## Despliegue en Vercel
- Framework: Next.js (auto-detectado).
- Build Command: `next build` (por defecto).
- Output: `.next` (por defecto).
- Variables de entorno: define `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` en el proyecto.

## Estructura
- `app/`: App Router, páginas y modales.
- `components/`: UI reutilizable (Modal, Toaster, SchoolDetail, CourseAgenda, AddSchoolModal, ConfirmDialog).
- `lib/`: clientes Supabase (browser/server), helper de toasts.
- `app/api/**`: Rutas API para colegios, cursos, agendamientos, comentarios e importación.
- `public/`: assets estáticos (ej. `colegio.png`).
- `legacy-spa/`: prototipo estático de referencia (no participa del build de Next).
- `supabase_schema.sql`: esquema de tablas/índices.

## Notas
- Alias `@/` apunta a la raíz del proyecto (ver `tsconfig.json`).
- Tailwind configurado (ver `tailwind.config.ts` y `app/globals.css`).
