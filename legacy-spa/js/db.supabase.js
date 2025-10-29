import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';
import { uid } from './utils.js';

// ESM import desde CDN (no requiere build)
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Nota: RLS debe permitir operaciones anónimas o usar policies por rol.

class SupabaseDB {
  constructor() {
    this.roleKey = 'agendamiento_role';
  }

  // Roles en localStorage (solo preferencia UI)
  getRole() { return localStorage.getItem(this.roleKey) || 'admin'; }
  setRole(r) { localStorage.setItem(this.roleKey, r); }

  // Helpers
  async _single(res) { if (res.error) throw res.error; return res.data; }

  // Schools
  async listSchools({ search = '', estado = 'todos', sort = 'nombre' } = {}) {
    let q = supabase.from('colegios').select('*');
    if (search) {
      // Búsqueda simple por ILIKE en múltiples campos
      const s = `%${search}%`;
      q = q.or(`nombre.ilike.${s},direccion.ilike.${s},telefono.ilike.${s}`);
    }
    if (estado !== 'todos') q = q.eq('estado', estado);
    if (sort === 'nombre') q = q.order('nombre', { ascending: true });
    if (sort === 'estado') q = q.order('estado', { ascending: true }).order('nombre', { ascending: true });
    const { data, error } = await q;
    if (error) throw error; return data || [];
  }

  async getSchool(id) {
    const { data, error } = await supabase.from('colegios').select('*').eq('id', id).single();
    if (error) throw error; return data;
  }

  async addSchool(school) {
    const payload = { id: school.id || uid(), nombre: school.nombre, direccion: school.direccion, telefono: school.telefono, correo: school.correo, estado: school.estado || 'no_contactado', comentarios: school.comentarios || '' };
    const { data, error } = await supabase.from('colegios').insert(payload).select('*').single();
    if (error) throw error; return data;
  }

  async updateSchool(id, patch) {
    const { data, error } = await supabase.from('colegios').update(patch).eq('id', id).select('*').single();
    if (error) throw error; return data;
  }

  async deleteSchool(id) {
    const { error } = await supabase.from('colegios').delete().eq('id', id);
    if (error) throw error;
  }

  // Courses
  async listCourses(schoolId) {
    const { data, error } = await supabase.from('cursos').select('*').eq('id_colegio', schoolId).order('curso');
    if (error) throw error; return data || [];
  }
  async addCourse(schoolId, curso) {
    const { data, error } = await supabase.from('cursos').insert({ id: uid(), id_colegio: schoolId, curso }).select('*').single();
    if (error) throw error; return data;
  }
  async deleteCourse(courseId) {
    const { error } = await supabase.from('cursos').delete().eq('id', courseId);
    if (error) throw error;
  }

  // Appointments
  async listAppointmentsForSchool(schoolId) {
    const { data, error } = await supabase.from('agendamientos').select('*').eq('id_colegio', schoolId).order('fecha').order('hora');
    if (error) throw error; return data || [];
  }
  async listAppointmentsForCourse(courseId) {
    const { data, error } = await supabase.from('agendamientos').select('*').eq('id_curso', courseId).order('fecha').order('hora');
    if (error) throw error; return data || [];
  }
  async addAppointment(data) {
    const payload = { id: uid(), id_colegio: data.schoolId ?? null, id_curso: data.courseId ?? null, tipo: data.tipo, fecha: data.fecha, hora: data.hora, descripcion: data.descripcion || '', observaciones: data.observaciones || '' };
    const { data: res, error } = await supabase.from('agendamientos').insert(payload).select('*').single();
    if (error) throw error; return res;
  }
  async updateAppointment(id, patch) {
    const { data, error } = await supabase.from('agendamientos').update(patch).eq('id', id).select('*').single();
    if (error) throw error; return data;
  }
  async deleteAppointment(id) {
    const { error } = await supabase.from('agendamientos').delete().eq('id', id);
    if (error) throw error;
  }

  // Comments
  async listComments(schoolId) {
    const { data, error } = await supabase.from('comentarios').select('*').eq('id_colegio', schoolId).order('fecha', { ascending: false });
    if (error) throw error; return data || [];
  }
  async addComment(schoolId, { autor, texto }) {
    const { data, error } = await supabase.from('comentarios').insert({ id: uid(), id_colegio: schoolId, autor: autor || '—', fecha: new Date().toISOString(), texto: texto || '' }).select('*').single();
    if (error) throw error; return data;
  }
  async deleteComment(id) {
    const { error } = await supabase.from('comentarios').delete().eq('id', id);
    if (error) throw error;
  }

  // Import rows (simple upsert por nombre/curso)
  async importRows(rows) {
    const norm = (v) => (v ?? '').toString().trim();
    for (const r of rows) {
      const nombre = norm(r.colegio || r.nombre || r.school || r.Colegio || r.Nombre);
      if (!nombre) continue;
      const direccion = norm(r.direccion || r.dirección || r.Direccion || r.Dirección || r.direccion_1);
      const telefono = norm(r.telefono || r.teléfono || r.Telefono || r.Teléfono || r.fono);
      const correo = norm(r.correo || r.email || r.mail || r.Correo || r.Email);
      const curso = norm(r.curso || r.Curso || r.grado || r.Grado);

      // upsert colegio por nombre
      const { data: existing, error: e1 } = await supabase.from('colegios').select('*').ilike('nombre', nombre).limit(1);
      if (e1) throw e1;
      let school = existing?.[0];
      if (!school) {
        const { data: ins, error: e2 } = await supabase.from('colegios').insert({ id: uid(), nombre, direccion, telefono, correo, estado: 'no_contactado' }).select('*').single();
        if (e2) throw e2; school = ins;
      }
      if (curso) {
        const { data: exC, error: e3 } = await supabase.from('cursos').select('id').eq('id_colegio', school.id).ilike('curso', curso).limit(1);
        if (e3) throw e3;
        if (!exC?.length) {
          const { error: e4 } = await supabase.from('cursos').insert({ id: uid(), id_colegio: school.id, curso });
          if (e4) throw e4;
        }
      }
    }
  }
}

export const db = new SupabaseDB();
window.__db = db; // debug

