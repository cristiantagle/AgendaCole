import { supabaseServer } from '@/lib/supabase';

export async function GET(_: Request, { params }: { params: Promise<{ schoolId: string }> }) {
  const s = supabaseServer();
  const { schoolId } = await params;
  const { data, error } = await s.from('cursos').select('*').eq('id_colegio', schoolId).order('curso');
  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ data });
}

export async function POST(req: Request, { params }: { params: Promise<{ schoolId: string }> }) {
  const body = await req.json();
  const s = supabaseServer();
  const curso = (body.curso || '').trim();
  if (!curso) return Response.json({ error: 'Curso requerido' }, { status: 400 });
  const { schoolId } = await params;
  const { data, error } = await s.from('cursos').insert({ id: crypto.randomUUID(), id_colegio: schoolId, curso }).select('*').single();
  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ data });
}
