# Agendamiento Colegios (SPA estática)

Aplicación web responsive para gestionar colegios, cursos, agendas y comentarios. Funciona 100% en el navegador usando localStorage e importación desde Excel (XLSX) vía SheetJS CDN. Lista para conectar a Supabase o desplegar en Tile.dev como app estática.

## Ejecutar localmente

Opción 1 (recomendada): Servidor estático
- Con Python 3: `python -m http.server 5173` y abre `http://localhost:5173/`.
- Con Node (http-server): `npx http-server -p 5173`.
- Con VS Code: extensión Live Server.

Opción 2 (no siempre funciona): abrir `index.html` directo en el navegador. Algunos navegadores bloquean módulos ES desde `file://`.

## Estructura
- `index.html`: shell principal, toolbar, vistas y modales.
- `css/styles.css`: estilos mobile-first.
- `js/utils.js`: utilidades (ids, links, toasts, modal, validaciones). 
- `js/db.js`: capa de datos con localStorage (colegios, cursos, agendamientos, comentarios) e importación desde Excel/CSV.
- `js/ui.js`: render de Dashboard, Ficha de colegio, Agenda por curso y lógica de conflicto ±2h.
- `js/app.js`: wiring inicial, búsqueda/filtrado/orden, importación y alta de colegios.

## Importar Excel
- Botón "Importar Excel" admite `.xlsx/.xls/.csv`.
- La primera hoja se convierte a JSON. Se intentan detectar columnas: `colegio|nombre`, `direccion|dirección`, `telefono|teléfono|fono`, `correo|email`, `curso|grado`.
- Se evita duplicar colegios por nombre (case-insensitive) y cursos por nombre dentro del colegio.

## Funcionalidades clave
- Dashboard sin duplicados con: nombre, teléfono (clic para llamar), dirección (Maps), correo (mailto), estado editable, ver detalle y eliminar.
- Ficha editable (admin): nombre, dirección, teléfono, correo, estado, comentarios generales.
- Cursos: lista, agregar, eliminar; botón para abrir agenda por curso.
- Agenda de colegio y de curso: crear, editar, eliminar. Alertas de conflicto si hay agendamientos a ±2 horas, con opción de continuar.
- Comentarios: timeline con fecha/hora, autor, texto; agregar y eliminar.
- Búsqueda, filtrado por estado y orden alfabético/estado.
- Roles: `Admin` (editar/eliminar) y `Usuario` (ver y agendar).
- Confirmaciones y toasts de guardado/eliminación.

## Despliegue en Tile.dev
- Cree una app estática y despliegue el contenido del directorio raíz.
- Asegure que `index.html` sea la ruta por defecto (SPA). Configure fallback a `index.html` si el host lo permite.
- La app usa una librería CDN (SheetJS) para importar Excel. Si su política bloquea CDNs, puede servir el archivo localmente desde `vendor/` y cambiar la ruta del script en `index.html`.

## Conectar a Supabase (listo)
- Edita `js/config.js` y coloca `SUPABASE_URL` y `SUPABASE_ANON_KEY`.
- Crea las tablas en tu proyecto con `supabase_schema.sql`.
- La app detecta credenciales y cambia automáticamente a Supabase (si no hay credenciales usa localStorage).
- No requiere build: el cliente Supabase se importa por CDN ESM.

## Notas
- No hay backend; los datos se guardan en `localStorage` del navegador.
- Para un entorno multiusuario, migre a Supabase (o similar) y reutilice la UI.
