import { supabaseServer } from '@/lib/supabase';

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = supabaseServer();
  const { id } = await params;
  const { data, error } = await s.from('cursos').select('*').eq('id', id).single();
  if (error) return Response.json({ error: error.message }, { status: 404 });
  return Response.json({ data });
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = supabaseServer();
  const { id } = await params;
  const { error } = await s.from('cursos').delete().eq('id', id);
  if (error) return Response.json({ error: error.message }, { status: 400 });
  return new Response(null, { status: 204 });
}
