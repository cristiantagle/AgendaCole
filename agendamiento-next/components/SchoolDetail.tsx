"use client";
import { useEffect, useState } from 'react';
import { Modal } from '@/components/Modal';
import { toast } from '@/lib/toast';

type School = {
  id:string; nombre:string;
  telefono?:string; correo?:string; estado?:'no_contactado'|'contactado'; comentarios?:string;
  codigo_colegio?: string | null;
  pagina_web?: string | null;
  director_nombre?: string | null;
  director_apellido?: string | null;
  director_email?: string | null;
};
type Course = { id:string; id_colegio:string; curso:string };
type Appointment = { id:string; tipo:'llamada'|'visita'; fecha:string; hora:string; descripcion?:string; observaciones?:string };
type Comment = { id:string; autor?:string; fecha:string; texto?:string };

export default function SchoolDetail({ schoolId, open, onClose, onOpenCourse }: { schoolId:string; open:boolean; onClose:()=>void; onOpenCourse:(courseId:string)=>void }){
  const [s, setS] = useState<School|null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [agenda, setAgenda] = useState<Appointment[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const token = typeof window !== 'undefined' ? localStorage.getItem('sb_token')||'' : '';
  const [saving, setSaving] = useState(false);
  type ConflictItem = { fecha:string; hora:string; tipo:string; colegio:string; curso?:string };
  const [conflict, setConflict] = useState<{items:ConflictItem[]; allowed:boolean}>({items:[], allowed:false});
  const [conflictOpen, setConflictOpen] = useState(false);

  async function loadAll(){
    const [a,b,c,d] = await Promise.all([
      fetch(`/api/schools/${schoolId}`, { headers: token? { Authorization: `Bearer ${token}` } : {} }).then(r=>r.json()),
      fetch(`/api/courses/school/${schoolId}`, { headers: token? { Authorization: `Bearer ${token}` } : {} }).then(r=>r.json()),
      fetch(`/api/appointments/school/${schoolId}?combined=1`, { headers: token? { Authorization: `Bearer ${token}` } : {} }).then(r=>r.json()),
      fetch(`/api/comments/school/${schoolId}`, { headers: token? { Authorization: `Bearer ${token}` } : {} }).then(r=>r.json()),
    ]);
    setS(a.data); setCourses(b.data||[]); setAgenda(c.data||[]); setComments(d.data||[]);
  }
  useEffect(()=>{ if(open && schoolId) loadAll(); }, [open, schoolId]);
  // Escucha refresh desde agenda de curso
  useEffect(()=>{
    function onRefresh(e: Event){
      const d = (e as CustomEvent).detail || {}; if (d.schoolId && s?.id && d.schoolId === s.id) loadAll();
    }
    window.addEventListener('app:refresh-appointments', onRefresh as any);
    return ()=> window.removeEventListener('app:refresh-appointments', onRefresh as any);
  }, [s?.id]);

  async function save(){
    if (!s) return; setSaving(true);
    const { id, ...patch } = s;
    const r = await fetch(`/api/schools/${id}`, { method:'PATCH', body: JSON.stringify(patch), headers: token? { Authorization: `Bearer ${token}` } : {} });
    setSaving(false);
    if (!r.ok) { toast('Error al guardar', 'error'); return; }
    toast('Cambios guardados', 'success');
    loadAll();
  }

  async function addAgenda(){
    if (!s) return;
    const fecha = (document.getElementById('sdFecha') as HTMLInputElement)?.value;
    const hora = (document.getElementById('sdHora') as HTMLInputElement)?.value;
    const tipo = (document.getElementById('sdTipo') as HTMLSelectElement)?.value as any;
    const descripcion = (document.getElementById('sdDesc') as HTMLInputElement)?.value || '';
    const observaciones = (document.getElementById('sdObs') as HTMLInputElement)?.value || '';
    const r = await fetch(`/api/appointments/school/${s.id}`, { method:'POST', body: JSON.stringify({ fecha, hora, tipo, descripcion, observaciones }), headers: token? { Authorization: `Bearer ${token}` } : {} });
    if (r.status === 409) {
      const data = await r.json();
      setConflict({ items: (data.conflicts||[]), allowed: Boolean(data.allowedForce) });
      setConflictOpen(true);
      return;
    }
    if (!r.ok) { toast('Error al agendar', 'error'); return; }
    toast('Agendamiento creado', 'success');
    loadAll();
  }

  async function addCourse(){
    if (!s) return; const v = (document.getElementById('sdNewCurso') as HTMLInputElement)?.value.trim(); if(!v) return;
    const exists = courses.some(c => (c.curso||'').toLowerCase()===v.toLowerCase()); if (exists) return;
    const r = await fetch(`/api/courses/school/${s.id}`, { method:'POST', body: JSON.stringify({ curso: v }), headers: token? { Authorization: `Bearer ${token}` } : {} });
    if (!r.ok) { toast('No se pudo agregar el curso', 'error'); return; }
    (document.getElementById('sdNewCurso') as HTMLInputElement).value='';
    toast('Curso agregado', 'success');
    loadAll();
  }
  async function deleteCourse(id:string){
    if (!confirm('Eliminar curso?')) return;
    const r = await fetch(`/api/courses/${id}`, { method:'DELETE', headers: token? { Authorization: `Bearer ${token}` } : {} });
    if (!r.ok) { toast('No se pudo eliminar el curso', 'error'); return; }
    toast('Curso eliminado', 'success');
    loadAll();
  }
  async function addComment(){
    if (!s) return; const autor = (document.getElementById('sdAutor') as HTMLInputElement)?.value || '—';
    const texto = (document.getElementById('sdTexto') as HTMLInputElement)?.value; if(!texto) return;
    const r = await fetch(`/api/comments/school/${s.id}`, { method:'POST', body: JSON.stringify({ autor, texto }), headers: token? { Authorization: `Bearer ${token}` } : {} });
    if (!r.ok) { toast('No se pudo agregar el comentario', 'error'); return; }
    (document.getElementById('sdTexto') as HTMLInputElement).value='';
    toast('Comentario agregado', 'success');
    loadAll();
  }
  async function delComment(id:string){
    if (!confirm('Eliminar comentario?')) return;
    const r = await fetch(`/api/comments/${id}`, { method:'DELETE', headers: token? { Authorization: `Bearer ${token}` } : {} });
    if (!r.ok) { toast('No se pudo eliminar el comentario', 'error'); return; }
    toast('Comentario eliminado', 'success');
    loadAll();
  }

  return (
    <Modal isOpen={open} title={s?.nombre || 'Colegio'} onClose={onClose}>
      {!s ? <div className="meta">Cargando…</div> : (
        <div className="grid" style={{gap:12}}>
          {/* Datos colegio */}
          <div className="grid" style={{gridTemplateColumns:'1fr', gap:10}}>
            <div><label>Nombre</label><input value={s.nombre||''} onChange={e=>setS({...s, nombre:e.target.value})} /></div>
            <div><label>Teléfono</label><input value={s.telefono||''} onChange={e=>setS({...s, telefono:e.target.value})} /></div>
            <div><label>Correo</label><input value={s.correo||''} onChange={e=>setS({...s, correo:e.target.value})} /></div>
            <div><label>Código</label><input value={s.codigo_colegio||''} onChange={e=>setS({...s, codigo_colegio:e.target.value})} /></div>
            <div><label>Web</label><input value={s.pagina_web||''} onChange={e=>setS({...s, pagina_web:e.target.value})} /></div>
            <div><label>Director nombre</label><input value={s.director_nombre||''} onChange={e=>setS({...s, director_nombre:e.target.value})} /></div>
            <div><label>Director apellido</label><input value={s.director_apellido||''} onChange={e=>setS({...s, director_apellido:e.target.value})} /></div>
            <div><label>Director email</label><input value={s.director_email||''} onChange={e=>setS({...s, director_email:e.target.value})} /></div>
            <div><label>Estado</label>
              <select value={s.estado||'no_contactado'} onChange={e=>setS({...s, estado:e.target.value as any})}>
                <option value="no_contactado">No contactado</option>
                <option value="contactado">Contactado</option>
              </select>
            </div>
            <div><label>Comentarios</label><textarea value={s.comentarios||''} onChange={e=>setS({...s, comentarios:e.target.value})} /></div>
            <div className="row" style={{justifyContent:'flex-end'}}>
              <button onClick={save} disabled={saving}>💾 Guardar</button>
            </div>
          </div>

          {/* Agenda del colegio */}
          <div className="grid">
            <h4 style={{margin:0}}>Agenda del colegio</h4>
            <div style={{display:'grid', gridTemplateColumns:'1fr', gap:10}}>
              <input id="sdFecha" type="date" />
              <input id="sdHora" type="time" />
              <select id="sdTipo">
                <option value="llamada">Llamada</option>
                <option value="visita">Visita</option>
              </select>
              <input id="sdDesc" placeholder="Descripción" />
              <input id="sdObs" placeholder="Observaciones" />
              <button onClick={addAgenda} style={{width:'100%'}}>🗓️ Agendar</button>
            </div>
            <div className="list">
              {agenda.map(a => (
                <div className="item" key={a.id}>
                  <div>
                    <div><strong>{a.tipo}</strong> • {a.fecha} {a.hora}</div>
                    <div className="meta">{a.descripcion||''}</div>
                  </div>
                  <div className="meta">{(a as any).curso ? <span className="badge course">Curso: {(a as any).curso}</span> : <span className="badge col">Colegio</span>}</div>
                </div>
              ))}
              {!agenda.length && <div className="meta">Sin agendamientos</div>}
            </div>
          </div>

          {/* Cursos */}
          <div className="grid">
            <div className="row" style={{justifyContent:'space-between'}}>
              <h4 style={{margin:0}}>Cursos</h4>
              <div style={{display:'flex', gap:8}}>
                <input id="sdNewCurso" placeholder="Ej. 1A" />
                <button className="secondary" onClick={addCourse}>➕ Agregar curso</button>
              </div>
            </div>
            <div className="list">
              {courses.map(c => (
                <div className="item" key={c.id}>
                  <div>
                    <div style={{fontWeight:600}}>{c.curso}</div>
                    <div className="meta">ID: {c.id}</div>
                  </div>
                  <div style={{display:'flex', gap:8}}>
                    <button onClick={()=>onOpenCourse(c.id)}>🗓️ Agenda</button>
                    <button className="danger" onClick={()=>deleteCourse(c.id)}>🗑️</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Comentarios */}
          <div className="grid">
            <h4 style={{margin:0}}>Comentarios</h4>
            <div className="row" style={{gap:8}}>
              <input id="sdAutor" placeholder="Autor" style={{maxWidth:200}} />
              <input id="sdTexto" placeholder="Escribe un comentario" style={{flex:1}} />
              <button className="secondary" onClick={addComment}>Agregar</button>
            </div>
            <div className="list">
              {comments.map(c => (
                <div className="item" key={c.id}>
                  <div>
                    <div className="meta">{new Date(c.fecha).toLocaleString()} • {c.autor||'—'}</div>
                    <div>{c.texto||''}</div>
                  </div>
                  <button className="danger" onClick={()=>delComment(c.id)}>🗑️</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      {/* Conflicts modal */}
      <Modal
        isOpen={conflictOpen}
        title="Horario ocupado"
        onClose={()=>setConflictOpen(false)}
        onOk={conflict.allowed ? async ()=>{
          if (!s) return;
          const fecha = (document.getElementById('sdFecha') as HTMLInputElement)?.value;
          const hora = (document.getElementById('sdHora') as HTMLInputElement)?.value;
          const tipo = (document.getElementById('sdTipo') as HTMLSelectElement)?.value as any;
          const descripcion = (document.getElementById('sdDesc') as HTMLInputElement)?.value || '';
          const observaciones = (document.getElementById('sdObs') as HTMLInputElement)?.value || '';
          const r2 = await fetch(`/api/appointments/school/${s.id}`, { method:'POST', body: JSON.stringify({ fecha, hora, tipo, descripcion, observaciones, force: true }), headers: token? { Authorization: `Bearer ${token}` } : {} });
          setConflictOpen(false);
          if (!r2.ok) return; loadAll();
        } : undefined}
        okText="Agendar de todas maneras"
      >
        <div className="grid" style={{gap:10}}>
          <div className="conflict-box">
            <div className="meta">Se encontraron agendamientos en el rango ±2h:</div>
            <ul>
              {conflict.items.map((c,i)=> (
                <li key={i}>
                  <span className="badge col">{c.colegio}</span>
                  {c.curso ? <span className="badge course">{c.curso}</span> : null}
                  <span className="meta"> {c.fecha} {c.hora} — {c.tipo}</span>
                </li>
              ))}
            </ul>
          </div>
          {conflict.allowed ? (
            <div>¿Deseas continuar y agendar de todas maneras para este colegio?</div>
          ) : (
            <div className="meta">No puedes continuar porque al menos uno de los conflictos es a nivel de colegio.</div>
          )}
        </div>
      </Modal>
    </Modal>
  );
}
