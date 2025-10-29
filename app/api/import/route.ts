import { supabaseServer } from '@/lib/supabase';
import * as XLSX from 'xlsx';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const form = await req.formData();
  const file = form.get('file');
  const mappingStr = form.get('mapping') as string | null;
  let mapping: any = null; try { mapping = mappingStr ? JSON.parse(mappingStr) : null; } catch {}
  if (!(file instanceof File)) return Response.json({ error: 'Archivo requerido' }, { status: 400 });
  const buf = Buffer.from(await file.arrayBuffer());
  const wb = XLSX.read(buf, { type: 'buffer' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });

  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i,'');
  const s = supabaseServer(token || undefined);
  const norm = (v: any) => (v ?? '').toString().trim();
  for (const r of rows) {
    const src = r as any;
    // Detección robusta de nombre y código
    const rawNombreCand = mapping?.nombre ? src[mapping.nombre]
      : (src['colegio'] ?? src['Colegio'] ?? src['COLEGIO'] ??
         src['nombre'] ?? src['Nombre'] ?? src['NOMBRE'] ??
         src['nombre colegio'] ?? src['Nombre Colegio'] ?? src['NOMBRE COLEGIO'] ??
         src['nombre establecimiento'] ?? src['Nombre Establecimiento'] ?? src['NOMBRE ESTABLECIMIENTO'] ??
         src['establecimiento'] ?? src['Establecimiento'] ??
         src['school'] ?? src['School']);
    const rawCodigoCand = mapping?.codigo ? src[mapping.codigo]
      : (src['código colegio'] ?? src['codigo colegio'] ?? src['CODIGO COLEGIO'] ?? src['CÓDIGO COLEGIO'] ??
         src['codigo'] ?? src['Código'] ?? src['CÓDIGO'] ??
         src['rbd'] ?? src['RBD']);
    const nombreColRaw = (src['colegio'] ?? src['Colegio'] ?? src['COLEGIO']);
    const nombreCol = norm(nombreColRaw);
    const codigoMap = norm(rawCodigoCand);
    const isNombreColNumeric = /^[0-9]+$/.test(nombreCol || '');
    let codigo = codigoMap || (isNombreColNumeric ? nombreCol : '');
    let nombre = norm(rawNombreCand);
    if (!isNombreColNumeric && nombreCol) nombre = nombreCol;
    if (!nombre) continue;
    // Datos del esquema: curso + letra, teléfono, correo, página, director
    const telefono = norm(
      src['TELÉFONO COLEGIO'] || src['TELEFONO COLEGIO'] || src['TELÉFONOCOLEGIO'] || src['TELEFONOCOLEGIO'] ||
      src['Telefono Colegio'] || src['telefono colegio'] || src['TELF COLEGIO'] ||
      src['telefono'] || src['teléfono'] || src['Telefono'] || src['Teléfono'] || src['fono']
    );
    const correo = norm(
      src['MAILCOLEGIO'] || src['mailcolegio'] || src['EMAIL COLEGIO'] ||
      src['correo'] || src['Correo'] || src['email'] || src['Email']
    );
    const pagina = norm(src['PÁGINAWEB'] || src['PaginaWeb'] || src['PAGINAWEB'] || src['página web'] || src['pagina web']);
    const nombreDirector = norm(src['nombre director'] || src['Nombre Director'] || src['NOMBRE DIRECTOR']);
    const apellidoDirector = norm(src['apellido  director'] || src['apellido director'] || src['Apellido Director'] || src['APELLIDO DIRECTOR']);
    const mailDirector = norm(src['MAILDIRECTOR'] || src['maildirector'] || src['MAIL DIRECTOR']);

    // Curso puede venir separado: curso + letra curso
    const cursoBase = norm(mapping?.curso ? src[mapping.curso] : (src['curso'] || src['Curso'] || src['CURSO'] || src['grado'] || src['Grado']));
    const letra = norm(src['letra curso'] || src['LETRA CURSO'] || src['letra'] || src['Letra']);
    const curso = (cursoBase || letra) ? `${cursoBase}${letra}`.trim() : '';

    const { data: ex, error: e1 } = await s.from('colegios').select('*').ilike('nombre', nombre).limit(1);
    if (e1) return Response.json({ error: e1.message }, { status: 400 });
    let school = ex?.[0];
    // Si no se encontr� por nombre y viene c�digo, intentar por c�digo de colegio
    if (!school && codigo) {
      const { data: exC, error: eC } = await s.from('colegios').select('*').eq('codigo_colegio', codigo).limit(1);
      if (eC) return Response.json({ error: eC.message }, { status: 400 });
      school = exC?.[0] || null;
    }
    if (!school) {
      const { data: ins, error: e2 } = await s.from('colegios').insert({
        id: crypto.randomUUID(),
        nombre,
        telefono,
        correo,
        codigo_colegio: codigo || null,
        pagina_web: pagina || null,
        director_nombre: nombreDirector || null,
        director_apellido: apellidoDirector || null,
        director_email: mailDirector || null,
        estado: 'no_contactado'
      }).select('*').single();
      if (e2) return Response.json({ error: e2.message }, { status: 400 });
      school = ins;
    } else {
      // Actualizar campos vacíos con información del Excel
      const patch: any = {};
      if (school.nombre !== nombre) patch.nombre = nombre;
      if (telefono) patch.telefono = telefono; // sobrescribe si viene del Excel
      if (!school.correo && correo) patch.correo = correo;
      if (codigo && school.codigo_colegio !== codigo) patch.codigo_colegio = codigo;
      if (!school.pagina_web && pagina) patch.pagina_web = pagina;
      if (!school.director_nombre && nombreDirector) patch.director_nombre = nombreDirector;
      if (!school.director_apellido && apellidoDirector) patch.director_apellido = apellidoDirector;
      if (!school.director_email && mailDirector) patch.director_email = mailDirector;
      if (Object.keys(patch).length) {
        const { error: upErr } = await s.from('colegios').update(patch).eq('id', school.id);
        if (upErr) return Response.json({ error: upErr.message }, { status: 400 });
      }
    }
    if (curso) {
      const { data: exC, error: e3 } = await s.from('cursos').select('id').eq('id_colegio', school.id).ilike('curso', curso).limit(1);
      if (e3) return Response.json({ error: e3.message }, { status: 400 });
      if (!exC?.length) {
        const { error: e4 } = await s.from('cursos').insert({ id: crypto.randomUUID(), id_colegio: school.id, curso });
        if (e4) return Response.json({ error: e4.message }, { status: 400 });
      }
    }
  }

  return Response.json({ ok: true, rows: rows.length });
}



