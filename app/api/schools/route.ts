import { supabaseServer } from '@/lib/supabase';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const search = searchParams.get('q') || '';
  const estado = searchParams.get('estado') || 'todos';
  const sort = searchParams.get('sort') || 'nombre';

  const s = supabaseServer();
  let q = s.from('colegios').select('*');
  if (search) {
    const like = `%${search}%`;
    q = q.or(
      [
        `nombre.ilike.${like}`,
        `telefono.ilike.${like}`,
        `correo.ilike.${like}`,
        `codigo_colegio.ilike.${like}`,
        `director_nombre.ilike.${like}`,
        `director_apellido.ilike.${like}`,
        `director_email.ilike.${like}`,
        `pagina_web.ilike.${like}`,
        `direccion.ilike.${like}`
      ].join(',')
    );
  }
  if (estado !== 'todos') q = q.eq('estado', estado);
  if (sort === 'nombre') q = q.order('nombre', { ascending: true });
  if (sort === 'estado') q = q.order('estado', { ascending: true }).order('nombre', { ascending: true });
  const { data, error } = await q;
  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ data });
}

export async function POST(req: Request) {
  const body = await req.json();
  const s = supabaseServer();
  const payload = {
    id: crypto.randomUUID(),
    nombre: (body.nombre||'').trim(),
    telefono: body.telefono||'', correo: body.correo||'',
    estado: body.estado || 'no_contactado', comentarios: body.comentarios || '',
    codigo_colegio: body.codigo_colegio || null,
    pagina_web: body.pagina_web || null,
    director_nombre: body.director_nombre || null,
    director_apellido: body.director_apellido || null,
    director_email: body.director_email || null,
    direccion: body.direccion || null
  };
  if (!payload.nombre) return Response.json({ error: 'Nombre requerido' }, { status: 400 });
  const { data, error } = await s.from('colegios').insert(payload).select('*').single();
  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ data });
}
