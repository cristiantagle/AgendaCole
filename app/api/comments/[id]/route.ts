import { supabaseServer } from '@/lib/supabase';

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i,'');
  const s = supabaseServer(token || undefined);
  const { id } = await params;
  const { error } = await s.from('comentarios').delete().eq('id', id);
  if (error) return Response.json({ error: error.message }, { status: 400 });
  return new Response(null, { status: 204 });
}
