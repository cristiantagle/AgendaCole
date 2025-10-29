import { $, $$, icon, telHref, mailHref, mapsHref, toast, confirmModal, withinTwoHours } from './utils.js';

let dbRef = null;
export function setDB(db){ dbRef = db; }

export function renderDashboard({ search = '', estado = 'todos', sort = 'nombre' } = {}) {
  const view = $("#viewDashboard");
  view.classList.remove('hidden');
  $("#viewSchool").classList.add('hidden');
  $("#viewCourseAgenda").classList.add('hidden');
  view.innerHTML = '';

  const listPromise = dbRef.listSchools({ search, estado, sort });
  // allow async rendering
  Promise.resolve(listPromise).then(list => {
    wrapReplace(view);
    const wrap = document.createElement('div');
    wrap.className = 'cards';
    view.appendChild(wrap);
    if (!list.length) {
      const empty = document.createElement('div');
      empty.className = 'card';
      empty.innerHTML = `<h3>No hay colegios</h3><div class="meta">Agrega colegios manualmente o importa desde Excel.</div>`;
      wrap.appendChild(empty);
      return;
    }
    for (const s of list) {
      renderSchoolCard(wrap, s);
    }
    wireDashboardActions(wrap);
  }).catch(err => { console.error(err); toast('Error cargando colegios'); });
}

export function renderSchoolDetail(id) {
  Promise.resolve(dbRef.getSchool(id)).then(s => {
    if (!s) { renderDashboard(); return; }
    buildSchoolDetail(s);
  }).catch(err => { console.error(err); toast('Error cargando colegio'); renderDashboard(); });
}

function buildSchoolDetail(s) {
  const id = s.id;
  const view = $("#viewSchool");
  view.classList.remove('hidden');
  $("#viewDashboard").classList.add('hidden');
  $("#viewCourseAgenda").classList.add('hidden');

  const role = dbRef.getRole();

  view.innerHTML = `
    <div class="actions" style="margin-bottom:10px;">
      <button class="secondary" id="backDash">${icon('back')} Volver</button>
      <button class="primary" id="saveSchool">${icon('save')} Guardar</button>
    </div>

    <div class="section grid3">
      <div>
        <label>Nombre</label>
        <input id="fNombre" value="${s.nombre||''}" ${role==='usuario'?'disabled':''}/>
      </div>
      <div>
        <label>Dirección</label>
        <input id="fDireccion" value="${s.direccion||''}" ${role==='usuario'?'disabled':''}/>
      </div>
      <div>
        <label>Teléfono</label>
        <input id="fTelefono" value="${s.telefono||''}" ${role==='usuario'?'disabled':''}/>
      </div>
      <div>
        <label>Correo</label>
        <input id="fCorreo" value="${s.correo||''}" ${role==='usuario'?'disabled':''}/>
      </div>
      <div>
        <label>Estado</label>
        <select id="fEstado" ${role==='usuario'?'disabled':''}>
          <option value="no_contactado" ${ (s.estado||'no_contactado')==='no_contactado'?'selected':'' }>No contactado</option>
          <option value="contactado" ${ (s.estado||'no_contactado')==='contactado'?'selected':'' }>Contactado</option>
        </select>
      </div>
      <div>
        <label>Comentarios generales</label>
        <textarea id="fComentarios" placeholder="Notas del colegio" ${role==='usuario'?'disabled':''}>${s.comentarios||''}</textarea>
      </div>
    </div>

    <div class="section">
      <h4>Agenda del colegio</h4>
      ${agendaFormHtml('school', id, role)}
      <div class="agenda" id="agendaSchool"></div>
    </div>

    <div class="section">
      <div class="row" style="justify-content:space-between;align-items:center;">
        <h4>Cursos</h4>
        ${role==='admin'?`<div class="toolbar-inline"><input id="newCurso" placeholder="Ej. 1A"/><button id="addCurso" class="ghost">${icon('add')} Agregar curso</button></div>`:''}
      </div>
      <div class="list" id="listCursos"></div>
    </div>

    <div class="section">
      <h4>Comentarios (historial)</h4>
      <div class="toolbar-inline">
        <input id="cAutor" placeholder="Autor" style="max-width:200px;"/>
        <input id="cTexto" placeholder="Escribe un comentario" style="flex:1;"/>
        <button id="addComment" class="secondary">Agregar</button>
      </div>
      <div id="commentsList" class="list"></div>
    </div>
  `;

  $("#backDash").onclick = () => renderDashboard(currentFilters());
  $("#saveSchool").onclick = async () => {
    if (dbRef.getRole() !== 'admin') { toast('Solo admin puede editar'); return; }
    await dbRef.updateSchool(id, {
      nombre: $("#fNombre").value.trim(),
      direccion: $("#fDireccion").value.trim(),
      telefono: $("#fTelefono").value.trim(),
      correo: $("#fCorreo").value.trim(),
      estado: $("#fEstado").value,
      comentarios: $("#fComentarios").value
    });
    toast('Cambios guardados');
  };

  // Courses list
  const listCursos = $("#listCursos");
  const renderCursos = () => {
    listCursos.innerHTML = '';
    Promise.resolve(dbRef.listCourses(id)).then(courses => {
      for (const c of courses) {
        const row = document.createElement('div');
        row.className = 'item';
        row.innerHTML = `
          <div>
            <div class="title">${c.curso}</div>
            <div class="muted">ID: ${c.id}</div>
          </div>
          <div class="actions">
            <button data-id="${c.id}" class="openAgendaCourse primary">${icon('cal')} Ver agenda del curso</button>
            ${dbRef.getRole()==='admin'?`<button data-id="${c.id}" class="delCourse danger">${icon('del')} Eliminar</button>`:''}
          </div>
        `;
        listCursos.appendChild(row);
      }
    });
  };
  renderCursos();

  if (dbRef.getRole()==='admin') {
    $("#addCurso").onclick = () => {
      const v = $("#newCurso").value.trim(); if (!v) { toast('Ingresa el nombre del curso'); return; }
      Promise.resolve(dbRef.listCourses(id)).then(cs => {
        const exists = cs.some(x => (x.curso||'').toLowerCase()===v.toLowerCase());
        if (exists) { toast('Curso ya existe'); return; }
        return dbRef.addCourse(id, v);
      }).then(()=>{ $("#newCurso").value=''; toast('Curso agregado'); renderCursos(); }).catch(()=>{});
    };
    listCursos.addEventListener('click', async (e)=>{
      const cid = e.target?.dataset?.id; if (!cid) return;
      if (e.target.classList.contains('delCourse')) {
        const ok = await confirmModal('Eliminar curso', 'Se eliminarán sus agendamientos.');
        if (ok) { await dbRef.deleteCourse(cid); toast('Curso eliminado'); renderCursos(); }
      }
    });
  }
  listCursos.addEventListener('click', (e)=>{
    const cid = e.target?.dataset?.id; if (!cid) return;
    if (e.target.classList.contains('openAgendaCourse')) renderCourseAgenda(id, cid);
  });

  // Agenda colegio
  wireAgenda('school', id, '#agendaSchool');

  // Comments
  const renderComments = () => {
    const box = $("#commentsList"); box.innerHTML = '';
    Promise.resolve(dbRef.listComments(id)).then(list => {
      for (const c of list) {
        const el = document.createElement('div'); el.className='comment';
        const date = new Date(c.fecha).toLocaleString();
        el.innerHTML = `
          <div class="meta">${date} • ${c.autor||'—'}</div>
          <div>${c.texto||''}</div>
          <div class="actions" style="justify-content:flex-end;">
            <button class="delComment danger" data-id="${c.id}">${icon('del')} Eliminar</button>
          </div>
        `;
        box.appendChild(el);
      }
    });
  };
  renderComments();
  $("#addComment").onclick = () => {
    const autor = $("#cAutor").value.trim() || '—';
    const texto = $("#cTexto").value.trim(); if (!texto) { toast('Escribe un comentario'); return; }
    Promise.resolve(dbRef.addComment(id, { autor, texto })).then(()=>{ $("#cTexto").value=''; toast('Comentario agregado'); renderComments(); });
  };
  $("#commentsList").addEventListener('click', async (e) => {
    const cid = e.target?.dataset?.id; if (!cid) return;
    if (e.target.classList.contains('delComment')) {
      const ok = await confirmModal('Eliminar comentario'); if (ok) { await dbRef.deleteComment(cid); toast('Comentario eliminado'); renderComments(); }
    }
  });
}

export function renderCourseAgenda(schoolId, courseId) {
  let s, course;
  // Carga paralela
  Promise.all([
    dbRef.getSchool(schoolId),
    dbRef.listCourses(schoolId)
  ]).then(([school, courses]) => {
    s = school; course = courses.find(c=>c.id===courseId);
    buildCourseAgendaView(s, course, schoolId, courseId);
  }).catch(err => { console.error(err); toast('Error abriendo curso'); renderSchoolDetail(schoolId); });
}

function buildCourseAgendaView(s, course, schoolId, courseId){
  const view = $("#viewCourseAgenda");
  view.classList.remove('hidden');
  $("#viewDashboard").classList.add('hidden');
  $("#viewSchool").classList.add('hidden');
  view.innerHTML = `
    <div class="actions" style="margin-bottom:10px;">
      <button class="secondary" id="backSchool">${icon('back')} Volver</button>
    </div>
    <div class="section">
      <h4>Agenda del curso — ${s?.nombre||'—'} / ${course?.curso||'—'}</h4>
      ${agendaFormHtml('course', courseId, dbRef.getRole())}
      <div class="agenda" id="agendaCourse"></div>
    </div>
  `;
  $("#backSchool").onclick = () => renderSchoolDetail(schoolId);
  wireAgenda('course', courseId, '#agendaCourse');
}

function agendaFormHtml(scope, refId, role) {
  const dis = role==='usuario' ? '': '';// usuarios pueden agendar
  return `
    <div class="grid3">
      <div><label>Fecha</label><input id="agFecha" type="date" ${dis}/></div>
      <div><label>Hora</label><input id="agHora" type="time" ${dis}/></div>
      <div><label>Tipo</label>
        <select id="agTipo">
          <option value="llamada">Llamada</option>
          <option value="visita">Visita</option>
        </select>
      </div>
      <div class="grid2" style="grid-column: 1/-1;">
        <input id="agDesc" placeholder="Descripción" />
        <input id="agObs" placeholder="Observaciones" />
      </div>
      <div style="grid-column: 1/-1;">
        <button id="agAdd" class="primary">${icon('cal')} Agendar</button>
      </div>
    </div>
  `;
}

function wireAgenda(scope, refId, containerSel) {
  const cont = $(containerSel);
  const render = () => {
    cont.innerHTML = '';
    const listPromise = scope==='school' ? dbRef.listAppointmentsForSchool(refId) : dbRef.listAppointmentsForCourse(refId);
    Promise.resolve(listPromise).then(list => {
      if (!list.length) { cont.innerHTML = '<div class="meta">Sin agendamientos</div>'; return; }
      for (const a of list.sort((x,y)=> `${x.fecha||''}T${x.hora||''}`.localeCompare(`${y.fecha||''}T${y.hora||''}`))) {
        const warn = hasConflict(a, list);
        const el = document.createElement('div'); el.className = `event ${warn?'warn':''}`;
        el.innerHTML = `
          <div><strong>${a.tipo||''}</strong> • ${a.fecha||''} ${a.hora||''}</div>
          <div>${a.descripcion||''}</div>
          <div class="meta">${a.observaciones||''}</div>
          <div class="actions" style="justify-content:flex-end;gap:6px;">
            <button class="secondary" data-id="${a.id}">${icon('edit')} Editar</button>
            <button class="danger" data-id="${a.id}">${icon('del')} Eliminar</button>
          </div>
        `;
        cont.appendChild(el);
      }
    });
  };
  render();

  $("#agAdd").onclick = async () => {
    const fecha = $("#agFecha").value; const hora = $("#agHora").value; const tipo = $("#agTipo").value;
    const descripcion = $("#agDesc").value.trim(); const observaciones = $("#agObs").value.trim();
    if (!fecha || !hora) { toast('Fecha y hora son requeridas'); return; }
    const list = await (scope==='school' ? dbRef.listAppointmentsForSchool(refId) : dbRef.listAppointmentsForCourse(refId));
    const conflicts = list.filter(b => withinTwoHours(fecha, hora, b.fecha, b.hora));
    let proceed = true;
    if (conflicts.length) {
      proceed = await confirmModal('Conflicto de horario', `${icon('warn')} Existe(n) ${conflicts.length} agendamiento(s) a ±2h. ¿Continuar?`);
    }
    if (!proceed) return;
    const data = { tipo, fecha, hora, descripcion, observaciones };
    if (scope==='school') data.schoolId = refId; else data.courseId = refId;
    await dbRef.addAppointment(data); toast('Agendamiento creado');
    $("#agDesc").value=''; $("#agObs").value='';
    render();
  };

  cont.addEventListener('click', async (e)=>{
    const id = e.target?.dataset?.id; if (!id) return;
    if (e.target.textContent.includes('Eliminar')) {
      const ok = await confirmModal('Eliminar agendamiento'); if (ok) { await dbRef.deleteAppointment(id); toast('Eliminado'); render(); }
    }
    if (e.target.textContent.includes('Editar')) {
      const list = await (scope==='school' ? dbRef.listAppointmentsForSchool(refId) : dbRef.listAppointmentsForCourse(refId));
      const a = list.find(x=>x.id===id); if (!a) return;
      const body = `
        <div class="grid3">
          <div><label>Fecha</label><input id="mFecha" type="date" value="${a.fecha||''}"/></div>
          <div><label>Hora</label><input id="mHora" type="time" value="${a.hora||''}"/></div>
          <div><label>Tipo</label>
            <select id="mTipo">
              <option value="llamada" ${a.tipo==='llamada'?'selected':''}>Llamada</option>
              <option value="visita" ${a.tipo==='visita'?'selected':''}>Visita</option>
            </select>
          </div>
          <div class="grid2" style="grid-column: 1/-1;">
            <input id="mDesc" value="${a.descripcion||''}"/>
            <input id="mObs" value="${a.observaciones||''}"/>
          </div>
        </div>`;
      const ok = await confirmModal('Editar agendamiento', body);
      if (ok) {
        const fecha = $("#mFecha").value; const hora = $("#mHora").value;
        const conflicts = list.filter(b => b.id!==id && withinTwoHours(fecha, hora, b.fecha, b.hora));
        let proceed = true;
        if (conflicts.length) proceed = await confirmModal('Conflicto de horario', `${icon('warn')} Existe(n) ${conflicts.length} agendamiento(s) a ±2h. ¿Continuar?`);
        if (!proceed) return;
        await dbRef.updateAppointment(id, { fecha, hora, tipo: $("#mTipo").value, descripcion: $("#mDesc").value, observaciones: $("#mObs").value });
        toast('Agendamiento actualizado'); render();
      }
    }
  });
}

function hasConflict(a, list) {
  return list.some(b => b.id !== a.id && withinTwoHours(a.fecha, a.hora, b.fecha, b.hora));
}

export function currentFilters() {
  return {
    search: $("#searchInput").value.trim(),
    estado: $("#filterEstado").value,
    sort: $("#sortBy").value
  };
}

// Helpers for dashboard rendering with async data
function renderSchoolCard(wrap, s){
  Promise.resolve(dbRef.listCourses(s.id)).then(courses => {
    const contacted = (s.estado||'no_contactado') === 'contactado';
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <div class="row" style="justify-content:space-between;align-items:start;gap:8px;">
        <h3>${s.nombre || '—'}</h3>
        <span class="badge ${contacted ? 'good' : 'neutral'}">${contacted ? 'Contactado' : 'No contactado'}</span>
      </div>
      <div class="meta">
        <div class="row"><span>${icon('phone')}</span> <a href="${telHref(s.telefono)}">${s.telefono || '—'}</a></div>
        <div class="row"><span>${icon('map')}</span> <a target="_blank" href="${mapsHref(s.direccion)}">${s.direccion || '—'}</a></div>
        <div class="row"><span>${icon('mail')}</span> <a href="${mailHref(s.correo)}">${s.correo || '—'}</a></div>
        <div class="row"><small class="badge">Cursos: ${courses.length}</small></div>
      </div>
      <div class="actions">
        <button data-id="${s.id}" class="btnEstado secondary">${contacted ? 'Marcar no contactado' : 'Marcar contactado'}</button>
        <button data-id="${s.id}" class="btnDetalle primary">${icon('eye')} Ver detalle</button>
        <button data-id="${s.id}" class="btnEliminar danger">${icon('del')} Eliminar</button>
      </div>
    `;
    wrap.appendChild(card);
  });
}

function wireDashboardActions(wrap){
  wrap.addEventListener('click', async (e) => {
    const id = e.target?.dataset?.id;
    if (!id) return;
    if (e.target.classList.contains('btnDetalle')) renderSchoolDetail(id);
    if (e.target.classList.contains('btnEstado')) {
      const s = await dbRef.getSchool(id); const next = (s.estado||'no_contactado') === 'contactado' ? 'no_contactado' : 'contactado';
      await dbRef.updateSchool(id, { estado: next }); toast('Estado actualizado'); renderDashboard(currentFilters());
    }
    if (e.target.classList.contains('btnEliminar')) {
      const ok = await confirmModal('Eliminar colegio', 'Esta acción no se puede deshacer.');
      if (ok) { await dbRef.deleteSchool(id); toast('Colegio eliminado'); renderDashboard(currentFilters()); }
    }
  });
}

function wrapReplace(view){
  view.innerHTML = '';
}
