import { supabaseServer } from '@/lib/supabase';

function withinTwoHours(fecha: string, hora: string, fecha2: string, hora2: string) {
  const a = new Date(`${fecha}T${hora}`);
  const b = new Date(`${fecha2}T${hora2}`);
  return Math.abs(+a - +b) <= 2 * 60 * 60 * 1000;
}

export async function GET(req: Request, { params }: { params: Promise<{ courseId: string }> }) {
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i,'');
  const s = supabaseServer(token || undefined);
  const { courseId } = await params;
  const { data, error } = await s.from('agendamientos').select('*').eq('id_curso', courseId).order('fecha').order('hora');
  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ data });
}

export async function POST(req: Request, { params }: { params: Promise<{ courseId: string }> }) {
  const body = await req.json();
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i,'');
  const s = supabaseServer(token || undefined);
  const { courseId } = await params;
  const { fecha, hora, descripcion, observaciones, force } = body || {};
  const tipo = 'visita'; // solo visitas a nivel curso
  if (!fecha || !hora || !tipo) return Response.json({ error: 'Fecha, hora y tipo requeridos' }, { status: 400 });
  // Obtener curso (para conocer colegio y mostrar nombres)
  const { data: course, error: eCourse } = await s.from('cursos').select('id,curso,id_colegio').eq('id', courseId).single();
  if (eCourse) return Response.json({ error: eCourse.message }, { status: 400 });
  const schoolId = course.id_colegio;
  const { data: school, error: eSchool } = await s.from('colegios').select('id,nombre').eq('id', schoolId).single();
  if (eSchool) return Response.json({ error: eSchool.message }, { status: 400 });
  // Cursos del colegio (para conflictos en otros cursos)
  const { data: courses, error: eCourses } = await s.from('cursos').select('id,curso').eq('id_colegio', schoolId);
  if (eCourses) return Response.json({ error: eCourses.message }, { status: 400 });
  const courseIds = (courses||[]).map(c=>c.id);
  // Cargar agendamientos del colegio y de todos sus cursos
  const { data: aSchool, error: eA1 } = await s.from('agendamientos').select('id,fecha,hora,tipo,id_colegio,id_curso').eq('id_colegio', schoolId);
  if (eA1) return Response.json({ error: eA1.message }, { status: 400 });
  let aCourses: any[] = [];
  if (courseIds.length) {
    const { data: aC, error: eA2 } = await s.from('agendamientos').select('id,fecha,hora,tipo,id_colegio,id_curso').in('id_curso', courseIds);
    if (eA2) return Response.json({ error: eA2.message }, { status: 400 });
    aCourses = aC||[];
  }
  const all = [...(aSchool||[]), ...aCourses];
  const conflicts = all.filter(x => withinTwoHours(fecha, hora, x.fecha as any, x.hora as any));
  if (conflicts.length) {
    const byIdCourse = new Map((courses||[]).map(c=>[c.id, c.curso]));
    const details = conflicts.map(c => ({
      fecha: c.fecha, hora: c.hora, tipo: c.tipo,
      colegio: school?.nombre || '',
      curso: c.id_curso ? (byIdCourse.get(c.id_curso) || '') : ''
    }));
    // Conflictos listados pertenecen al mismo colegio; permitir continuar
    const allowedForce = true;
    if (!force || !allowedForce) {
      return Response.json({ conflict: true, count: conflicts.length, conflicts: details, allowedForce }, { status: 409 });
    }
  }
  const payload = { id: crypto.randomUUID(), id_curso: courseId, id_colegio: null, tipo, fecha, hora, descripcion: descripcion||'', observaciones: observaciones||'' };
  const { data, error } = await s.from('agendamientos').insert(payload).select('*').single();
  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ data });
}
