import { supabaseServer } from '@/lib/supabase';

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = supabaseServer();
  const { id } = await params;
  const { data, error } = await s.from('colegios').select('*').eq('id', id).single();
  if (error) return Response.json({ error: error.message }, { status: 404 });
  return Response.json({ data });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const body = await req.json();
  const allowed = [
    'nombre',
    'telefono',
    'correo',
    'estado',
    'comentarios',
    'codigo_colegio',
    'pagina_web',
    'director_nombre',
    'director_apellido',
    'director_email',
    'direccion'
  ] as const;
  type AllowedFields = (typeof allowed)[number];
  const patch: Partial<Record<AllowedFields, unknown>> = {};
  for (const key of allowed) {
    if (key in body) (patch as Record<string, unknown>)[key] = body[key];
  }
  if (!Object.keys(patch).length) {
    return Response.json({ error: 'Sin cambios' }, { status: 400 });
  }
  const s = supabaseServer();
  const { id } = await params;
  const { data, error } = await s.from('colegios').update(patch).eq('id', id).select('*').single();
  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ data });
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = supabaseServer();
  const { id } = await params;
  const { error } = await s.from('colegios').delete().eq('id', id);
  if (error) return Response.json({ error: error.message }, { status: 400 });
  return new Response(null, { status: 204 });
}
