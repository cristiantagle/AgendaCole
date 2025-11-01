import { supabaseServer } from '@/lib/supabase';

function withinTwoHours(fecha: string, hora: string, fecha2: string, hora2: string) {
  const a = new Date(`${fecha}T${hora}`);
  const b = new Date(`${fecha2}T${hora2}`);
  return Math.abs(+a - +b) <= 2 * 60 * 60 * 1000;
}

export async function GET(req: Request, { params }: { params: Promise<{ schoolId: string }> }) {
  const s = supabaseServer();
  const { schoolId } = await params;
  const url = new URL(req.url);
  const combined = url.searchParams.get('combined');
  if (!combined) {
    const { data, error } = await s.from('agendamientos').select('*').eq('id_colegio', schoolId).order('fecha').order('hora');
    if (error) return Response.json({ error: error.message }, { status: 400 });
    return Response.json({ data });
  }
  const { data: courses, error: eCourses } = await s.from('cursos').select('id,curso').eq('id_colegio', schoolId);
  if (eCourses) return Response.json({ error: eCourses.message }, { status: 400 });
  const courseIds = (courses || []).map(c => c.id);
  const byIdCourse = new Map((courses || []).map(c => [c.id, c.curso]));
  const { data: aSchool, error: eA1 } = await s.from('agendamientos').select('*').eq('id_colegio', schoolId);
  if (eA1) return Response.json({ error: eA1.message }, { status: 400 });
  let aCourses: any[] = [];
  if (courseIds.length) {
    const { data: aC, error: eA2 } = await s.from('agendamientos').select('*').in('id_curso', courseIds);
    if (eA2) return Response.json({ error: eA2.message }, { status: 400 });
    aCourses = (aC || []).map(c => ({ ...c, curso: byIdCourse.get(c.id_curso || '') || '' }));
  }
  const all = [...(aSchool || []).map(c => ({ ...c, curso: '' })), ...aCourses].sort((x: any, y: any) =>
    `${x.fecha || ''}T${x.hora || ''}`.localeCompare(`${y.fecha || ''}T${y.hora || ''}`)
  );
  return Response.json({ data: all });
}

export async function POST(req: Request, { params }: { params: Promise<{ schoolId: string }> }) {
  const body = await req.json();
  const s = supabaseServer();
  const { schoolId } = await params;
  const { fecha, hora, tipo, descripcion, observaciones, force } = body || {};
  if (!fecha || !hora || !tipo) return Response.json({ error: 'Fecha, hora y tipo son obligatorias' }, { status: 400 });

  const { data: school, error: eSchool } = await s.from('colegios').select('id,nombre').eq('id', schoolId).single();
  if (eSchool) return Response.json({ error: eSchool.message }, { status: 400 });

  const fechaObj = new Date(`${fecha}T${hora}`);
  const rangeStart = new Date(fechaObj.getTime() - 24 * 60 * 60 * 1000);
  const rangeEnd = new Date(fechaObj.getTime() + 24 * 60 * 60 * 1000);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  const { data: around, error: eAll } = await s
    .from('agendamientos')
    .select('id,fecha,hora,tipo,id_colegio,id_curso')
    .gte('fecha', fmt(rangeStart))
    .lte('fecha', fmt(rangeEnd));
  if (eAll) return Response.json({ error: eAll.message }, { status: 400 });

  const conflicts = (around || []).filter(x => withinTwoHours(fecha, hora, x.fecha as any, x.hora as any));
  if (conflicts.length) {
    const courseIdsInConf = Array.from(new Set(conflicts.map(c => c.id_curso).filter(Boolean) as string[]));
    let byIdCourse = new Map<string, { curso: string; id_colegio: string | null }>();
    if (courseIdsInConf.length) {
      const { data: metaCourses, error: eMC } = await s.from('cursos').select('id,curso,id_colegio').in('id', courseIdsInConf);
      if (eMC) return Response.json({ error: eMC.message }, { status: 400 });
      byIdCourse = new Map((metaCourses || []).map((c: any) => [c.id, { curso: c.curso, id_colegio: c.id_colegio }]));
    }
    const schoolIds = new Set<string>();
    conflicts.forEach(c => {
      if (c.id_colegio) schoolIds.add(c.id_colegio);
      const mc = c.id_curso ? byIdCourse.get(c.id_curso) : undefined;
      if (mc?.id_colegio) schoolIds.add(mc.id_colegio);
    });
    if (schoolId) schoolIds.add(schoolId);
    let byIdSchool = new Map<string, string>();
    if (schoolIds.size) {
      const { data: schoolsMeta, error: eSM } = await s.from('colegios').select('id,nombre').in('id', Array.from(schoolIds));
      if (eSM) return Response.json({ error: eSM.message }, { status: 400 });
      byIdSchool = new Map((schoolsMeta || []).map((x: any) => [x.id, x.nombre]));
    }
    const details = conflicts.map(c => {
      const mc = c.id_curso ? byIdCourse.get(c.id_curso) : undefined;
      const sid = c.id_colegio || mc?.id_colegio || null;
      return {
        fecha: c.fecha,
        hora: c.hora,
        tipo: c.tipo,
        colegio: sid ? (byIdSchool.get(sid) || '') : (school?.nombre || ''),
        curso: c.id_curso ? (mc?.curso || '') : ''
      };
    });
    const allSameSchool = conflicts.every(c => {
      const mc = c.id_curso ? byIdCourse.get(c.id_curso) : undefined;
      const sid = c.id_colegio || mc?.id_colegio || null;
      return sid === schoolId;
    });
    const allowedForce = allSameSchool;
    if (!force || !allowedForce) {
      return Response.json({ conflict: true, count: conflicts.length, conflicts: details, allowedForce }, { status: 409 });
    }
  }

  const payload = {
    id: crypto.randomUUID(),
    id_colegio: schoolId,
    id_curso: null,
    tipo,
    fecha,
    hora,
    descripcion: descripcion || '',
    observaciones: observaciones || ''
  };
  const { data, error } = await s.from('agendamientos').insert(payload).select('*').single();
  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ data });
}
