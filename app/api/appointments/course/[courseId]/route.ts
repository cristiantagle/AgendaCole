import { supabaseServer } from '@/lib/supabase';

function withinTwoHours(fecha: string, hora: string, fecha2: string, hora2: string) {
  const a = new Date(`${fecha}T${hora}`);
  const b = new Date(`${fecha2}T${hora2}`);
  return Math.abs(+a - +b) <= 2 * 60 * 60 * 1000;
}

export async function GET(_: Request, { params }: { params: Promise<{ courseId: string }> }) {
  const s = supabaseServer();
  const { courseId } = await params;
  const { data, error } = await s.from('agendamientos').select('*').eq('id_curso', courseId).order('fecha').order('hora');
  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ data });
}

export async function POST(req: Request, { params }: { params: Promise<{ courseId: string }> }) {
  const body = await req.json();
  const s = supabaseServer();
  const { courseId } = await params;
  const { fecha, hora, descripcion, observaciones, force } = body || {};
  const tipo = 'visita'; // solo visitas a nivel curso
  if (!fecha || !hora) return Response.json({ error: 'Fecha y hora son obligatorias' }, { status: 400 });

  const { data: course, error: eCourse } = await s.from('cursos').select('id,curso,id_colegio').eq('id', courseId).single();
  if (eCourse) return Response.json({ error: eCourse.message }, { status: 400 });
  const schoolId = course.id_colegio;
  const { data: school, error: eSchool } = await s.from('colegios').select('id,nombre').eq('id', schoolId).single();
  if (eSchool) return Response.json({ error: eSchool.message }, { status: 400 });

  const targetDate = new Date(`${fecha}T${hora}`);
  const rangeStart = new Date(targetDate.getTime() - 24 * 60 * 60 * 1000);
  const rangeEnd = new Date(targetDate.getTime() + 24 * 60 * 60 * 1000);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  const { data: nearby, error: eAll } = await s
    .from('agendamientos')
    .select('id,fecha,hora,tipo,id_colegio,id_curso')
    .gte('fecha', fmt(rangeStart))
    .lte('fecha', fmt(rangeEnd));
  if (eAll) return Response.json({ error: eAll.message }, { status: 400 });

  const conflicts = (nearby || []).filter(x => withinTwoHours(fecha, hora, x.fecha as any, x.hora as any));
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
    schoolIds.add(schoolId);
    let byIdSchool = new Map<string, string>();
    if (schoolIds.size) {
      const { data: schoolsMeta, error: eSM } = await s.from('colegios').select('id,nombre').in('id', Array.from(schoolIds));
      if (eSM) return Response.json({ error: eSM.message }, { status: 400 });
      byIdSchool = new Map((schoolsMeta || []).map((x: any) => [x.id, x.nombre]));
    }
    const conflictDetails = conflicts.map(c => {
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
      return Response.json({ conflict: true, count: conflicts.length, conflicts: conflictDetails, allowedForce }, { status: 409 });
    }
  }

  const payload = {
    id: crypto.randomUUID(),
    id_curso: courseId,
    id_colegio: null,
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
