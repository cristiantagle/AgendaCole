import { supabaseServer } from '@/lib/supabase';

const allowedFields = ['fecha', 'hora', 'tipo', 'descripcion', 'observaciones'] as const;
type Allowed = (typeof allowedFields)[number];

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const body = await req.json();
  const patch: Partial<Record<Allowed, unknown>> = {};
  for (const key of allowedFields) {
    if (key in body) (patch as Record<string, unknown>)[key] = body[key];
  }
  if (!Object.keys(patch).length) {
    return Response.json({ error: 'Sin cambios' }, { status: 400 });
  }
  const s = supabaseServer();
  const { id } = await params;
  const { data, error } = await s.from('agendamientos').update(patch).eq('id', id).select('*').single();
  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ data });
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = supabaseServer();
  const { id } = await params;
  const { error } = await s.from('agendamientos').delete().eq('id', id);
  if (error) return Response.json({ error: error.message }, { status: 400 });
  return new Response(null, { status: 204 });
}
