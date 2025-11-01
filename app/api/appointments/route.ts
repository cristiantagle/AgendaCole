import { supabaseServer } from '@/lib/supabase';

export async function GET(req: Request) {
  const s = supabaseServer();
  const url = new URL(req.url);
  const limit = Number(url.searchParams.get('limit')||'20');
  // upcoming: próximos 30 días
  const today = new Date();
  const to = new Date(today.getTime() + 30*24*60*60*1000);
  const fmt = (d:Date)=> d.toISOString().slice(0,10);
  const { data: rows, error } = await s
    .from('agendamientos')
    .select('id,fecha,hora,tipo,id_colegio,id_curso')
    .gte('fecha', fmt(today))
    .lte('fecha', fmt(to))
    .order('fecha', { ascending: true })
    .order('hora', { ascending: true })
    .limit(limit);
  if (error) return Response.json({ error: error.message }, { status: 400 });
  // Map names
  const courseIds = Array.from(new Set((rows||[]).map(r=> r.id_curso).filter(Boolean) as string[]));
  let courses: any[] = [];
  if (courseIds.length) {
    const { data, error: eC } = await s.from('cursos').select('id,curso,id_colegio').in('id', courseIds);
    if (eC) return Response.json({ error: eC.message }, { status: 400 });
    courses = data || [];
  }
  const byIdCourse = new Map((courses).map((c:any)=> [c.id, c]));
  const schoolIds = new Set<string>();
  (rows||[]).forEach(r=>{
    if (r.id_colegio) schoolIds.add(r.id_colegio);
    const mc:any = r.id_curso ? byIdCourse.get(r.id_curso) : undefined;
    if (mc?.id_colegio) schoolIds.add(mc.id_colegio);
  });
  const schoolsFilter = Array.from(schoolIds);
  let schools: any[] = [];
  if (schoolsFilter.length) {
    const { data, error: eS } = await s.from('colegios').select('id,nombre').in('id', schoolsFilter);
    if (eS) return Response.json({ error: eS.message }, { status: 400 });
    schools = data || [];
  }
  const byIdSchool = new Map((schools).map((x:any)=> [x.id, x.nombre]));
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
