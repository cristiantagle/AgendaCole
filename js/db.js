import { uid } from './utils.js';

// Simple localStorage-based data layer with an adapter interface.

const DEFAULT = {
  schools: [], // {id, nombre, direccion, telefono, correo, estado, comentarios}
  courses: [], // {id, schoolId, curso}
  appointments: [], // {id, schoolId?, courseId?, tipo, fecha, hora, descripcion, observaciones}
  comments: [], // {id, schoolId, autor, fecha, texto}
  meta: { role: 'admin' }
};

const KEY = 'agendamiento_db_v1';

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return structuredClone(DEFAULT);
    const data = JSON.parse(raw);
    // merge defaults if missing
    return { ...structuredClone(DEFAULT), ...data };
  } catch {
    return structuredClone(DEFAULT);
  }
}

function save(state) {
  localStorage.setItem(KEY, JSON.stringify(state));
}

class LocalDB {
  constructor() {
    this.state = load();
  }

  // Roles
  getRole() { return this.state.meta.role || 'admin'; }
  setRole(r) { this.state.meta.role = r; save(this.state); }

  // Schools
  listSchools({ search = '', estado = 'todos', sort = 'nombre' } = {}) {
    let list = [...this.state.schools];
    if (search) {
      const s = search.toLowerCase();
      list = list.filter(x => (x.nombre||'').toLowerCase().includes(s) || (x.direccion||'').toLowerCase().includes(s) || (x.telefono||'').toLowerCase().includes(s));
    }
    if (estado !== 'todos') {
      list = list.filter(x => (x.estado||'no_contactado') === estado);
    }
    if (sort === 'nombre') list.sort((a,b)=> (a.nombre||'').localeCompare(b.nombre||''));
    if (sort === 'estado') list.sort((a,b)=> (a.estado||'no_contactado').localeCompare(b.estado||'no_contactado'));
    return list;
  }

  getSchool(id) { return this.state.schools.find(s => s.id === id); }

  addSchool(school) {
    const sc = { id: uid(), estado: 'no_contactado', ...school };
    this.state.schools.push(sc); save(this.state); return sc;
  }

  updateSchool(id, patch) {
    const it = this.getSchool(id); if (!it) return null;
    Object.assign(it, patch); save(this.state); return it;
  }

  deleteSchool(id) {
    this.state.schools = this.state.schools.filter(s => s.id !== id);
    this.state.courses = this.state.courses.filter(c => c.schoolId !== id);
    this.state.appointments = this.state.appointments.filter(a => a.schoolId !== id);
    this.state.comments = this.state.comments.filter(c => c.schoolId !== id);
    save(this.state);
  }

  // Courses
  listCourses(schoolId) { return this.state.courses.filter(c => c.schoolId === schoolId); }

  addCourse(schoolId, curso) {
    const c = { id: uid(), schoolId, curso };
    this.state.courses.push(c); save(this.state); return c;
  }

  deleteCourse(courseId) {
    this.state.courses = this.state.courses.filter(c => c.id !== courseId);
    this.state.appointments = this.state.appointments.filter(a => a.courseId !== courseId);
    save(this.state);
  }

  // Appointments
  listAppointmentsForSchool(schoolId) {
    return this.state.appointments.filter(a => a.schoolId === schoolId);
  }
  listAppointmentsForCourse(courseId) {
    return this.state.appointments.filter(a => a.courseId === courseId);
  }
  addAppointment(data) { const a = { id: uid(), ...data }; this.state.appointments.push(a); save(this.state); return a; }
  updateAppointment(id, patch) { const a = this.state.appointments.find(x=>x.id===id); if(!a) return null; Object.assign(a, patch); save(this.state); return a; }
  deleteAppointment(id) { this.state.appointments = this.state.appointments.filter(a => a.id !== id); save(this.state); }

  // Comments
  listComments(schoolId) { return this.state.comments.filter(c => c.schoolId === schoolId).sort((a,b)=> (b.fecha||'').localeCompare(a.fecha||'')); }
  addComment(schoolId, { autor, texto }) { const c = { id: uid(), schoolId, autor: autor||'—', fecha: new Date().toISOString(), texto: texto||'' }; this.state.comments.push(c); save(this.state); return c; }
  deleteComment(id) { this.state.comments = this.state.comments.filter(c => c.id !== id); save(this.state); }

  // Import from Excel/CSV rows
  importRows(rows) {
    // rows: array of objects with keys guessed from sheet headers
    // Expected keys: colegio(nom), direccion, telefono, correo, curso
    const norm = (v) => (v ?? '').toString().trim();
    const existingByName = new Map(this.state.schools.map(s=>[s.nombre?.toLowerCase()||'', s]));
    for (const r of rows) {
      const nombre = norm(r.colegio || r.nombre || r.school || r.Colegio || r.Nombre);
      if (!nombre) continue;
      const direccion = norm(r.direccion || r.dirección || r.Direccion || r.Dirección || r.direccion_1);
      const telefono = norm(r.telefono || r.teléfono || r.Telefono || r.Teléfono || r.fono);
      const correo = norm(r.correo || r.email || r.mail || r.Correo || r.Email);
      const curso = norm(r.curso || r.Curso || r.grado || r.Grado);
      let school = existingByName.get(nombre.toLowerCase());
      if (!school) {
        school = this.addSchool({ nombre, direccion, telefono, correo });
        existingByName.set(nombre.toLowerCase(), school);
      }
      if (curso) {
        const existsCourse = this.state.courses.some(c => c.schoolId === school.id && (c.curso||'').toLowerCase() === curso.toLowerCase());
        if (!existsCourse) this.addCourse(school.id, curso);
      }
    }
  }
}

export const db = new LocalDB();
window.__db = db; // debug

