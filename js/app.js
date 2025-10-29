import { $, debounce, icon, toast } from './utils.js';
import { getDB } from './db.adapter.js';
import { renderDashboard, renderSchoolDetail, currentFilters, setDB } from './ui.js';

// Initial render
let dbRef;
async function init() {
  const db = await getDB();
  dbRef = db;
  setDB(db);
  // Role
  const roleSel = $('#roleSelect');
  roleSel.value = dbRef.getRole();
  roleSel.onchange = () => { dbRef.setRole(roleSel.value); toast('Rol cambiado'); };

  // Toolbar
  $('#searchInput').addEventListener('input', debounce(()=> renderDashboard(currentFilters()), 200));
  $('#filterEstado').onchange = () => renderDashboard(currentFilters());
  $('#sortBy').onchange = () => renderDashboard(currentFilters());

  // Add School
  $('#btnAddSchool').onclick = () => openAddSchool();

  // Import Excel
  $('#btnImport').onclick = () => $('#fileExcel').click();
  $('#fileExcel').addEventListener('change', onImportExcel);

  renderDashboard();
}

function openAddSchool() {
  if (dbRef.getRole() !== 'admin') { toast('Solo admin puede agregar'); return; }
  const modalBody = `
    <div class="grid3">
      <div><label>Nombre</label><input id="nNombre"/></div>
      <div><label>Dirección</label><input id="nDireccion"/></div>
      <div><label>Teléfono</label><input id="nTelefono"/></div>
      <div><label>Correo</label><input id="nCorreo"/></div>
      <div style="grid-column: 1/-1;" class="toolbar-inline">
         <input id="nCurso" placeholder="Curso inicial (opcional) ej. 1A"/>
      </div>
    </div>`;
  import('./utils.js').then(({ confirmModal }) => confirmModal('Agregar colegio', modalBody)).then(ok => {
    if (!ok) return;
    const nombre = $('#nNombre').value.trim(); if (!nombre) { toast('Nombre es requerido'); return; }
    Promise.resolve(dbRef.addSchool({ nombre, direccion: $('#nDireccion').value.trim(), telefono: $('#nTelefono').value.trim(), correo: $('#nCorreo').value.trim(), estado: 'no_contactado' }))
    .then((school)=>{
      const c = $('#nCurso').value.trim(); if (c) return dbRef.addCourse(school.id, c);
    }).then(()=>{ toast('Colegio agregado'); renderDashboard(currentFilters()); });
  });
}

async function onImportExcel(ev) {
  const file = ev.target.files?.[0]; if (!file) return;
  try {
    const data = await file.arrayBuffer();
    const wb = XLSX.read(data, { type: 'array' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
    await dbRef.importRows(rows);
    toast(`Importación completada (${rows.length} filas)`);
    renderDashboard(currentFilters());
  } catch (e) {
    console.error(e); toast('Error al importar. Considera exportar a CSV.');
  } finally {
    ev.target.value = '';
  }
}

// Global navigation helpers for debug (optional)
window.__openSchool = (id) => renderSchoolDetail(id);

init();
