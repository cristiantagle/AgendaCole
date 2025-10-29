import { supabaseServer } from '@/lib/supabase';

export async function GET(req: Request, { params }: { params: Promise<{ schoolId: string }> }) {
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i,'');
  const s = supabaseServer(token || undefined);
  const { schoolId } = await params;
  const { data, error } = await s.from('comentarios').select('*').eq('id_colegio', schoolId).order('fecha', { ascending: false });
  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ data });
}

export async function POST(req: Request, { params }: { params: Promise<{ schoolId: string }> }) {
  const body = await req.json();
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i,'');
  const s = supabaseServer(token || undefined);
  const { autor, texto } = body||{};
  const { schoolId } = await params;
  const payload = { id: crypto.randomUUID(), id_colegio: schoolId, autor: autor||'—', fecha: new Date().toISOString(), texto: texto||'' };
  const { data, error } = await s.from('comentarios').insert(payload).select('*').single();
  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ data });
}
