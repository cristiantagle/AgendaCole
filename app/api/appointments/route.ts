import { supabaseServer } from '@/lib/supabase';

export async function GET(req: Request) {
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i,'');
  const s = supabaseServer(token || undefined);
  const url = new URL(req.url);
  const limit = Number(url.searchParams.get('limit')||'20');
  // upcoming: próximos 30 días
  const today = new Date();
  const to = new Date(today.getTime() + 30*24*60*60*1000);
  const fmt = (d:Date)=> d.toISOString().slice(0,10);
  const { data: rows, error } = await s
    .from('agendamientos')
    .select('id,fecha,hora,tipo,id_colegio,id_curso')
    .in('fecha', [fmt(today), fmt(new Date(today.getTime()+24*60*60*1000)), fmt(to)])
    .order('fecha', { ascending: true })
    .order('hora', { ascending: true })
    .limit(limit);
  if (error) return Response.json({ error: error.message }, { status: 400 });
  // Map names
  const courseIds = Array.from(new Set((rows||[]).map(r=> r.id_curso).filter(Boolean) as string[]));
  const { data: courses, error: eC } = await s.from('cursos').select('id,curso,id_colegio').in('id', courseIds);
  if (eC) return Response.json({ error: eC.message }, { status: 400 });
  const byIdCourse = new Map((courses||[]).map((c:any)=> [c.id, c]));
  const schoolIds = new Set<string>();
  (rows||[]).forEach(r=>{
    if (r.id_colegio) schoolIds.add(r.id_colegio);
    const mc:any = r.id_curso ? byIdCourse.get(r.id_curso) : undefined;
    if (mc?.id_colegio) schoolIds.add(mc.id_colegio);
  });
  const { data: schools, error: eS } = await s.from('colegios').select('id,nombre').in('id', Array.from(schoolIds));
  if (eS) return Response.json({ error: eS.message }, { status: 400 });
  const byIdSchool = new Map((schools||[]).map((x:any)=> [x.id, x.nombre]));
  const data = (rows||[]).map(r=>{
    const mc:any = r.id_curso ? byIdCourse.get(r.id_curso) : undefined;
    const sid = r.id_colegio || mc?.id_colegio || null;
    return {
      ...r,
      colegio: sid ? (byIdSchool.get(sid)||'') : '',
      curso: r.id_curso ? (mc?.curso||'') : ''
    };
  });
  return Response.json({ data });
}

