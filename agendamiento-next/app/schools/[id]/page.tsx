'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase-browser';
import { Modal } from '@/components/Modal';

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

export default function SchoolPage(){
  const route = useParams<{ id: string }>();
  const schoolId = (route?.id as string) || '';
  const [s, setS] = useState<School|null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [agenda, setAgenda] = useState<Appointment[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [conflict, setConflict] = useState<{list:string[]; allowed:boolean}>({list:[], allowed:false});
  const [conflictOpen, setConflictOpen] = useState(false);

  const token = typeof window !== 'undefined' ? localStorage.getItem('sb_token')||'' : '';

  async function loadAll(){
    const [a,b,c,d] = await Promise.all([
      fetch(`/api/schools/${schoolId}`, { headers: token? { Authorization: `Bearer ${token}` } : {} }).then(r=>r.json()),
      fetch(`/api/courses/school/${schoolId}`, { headers: token? { Authorization: `Bearer ${token}` } : {} }).then(r=>r.json()),
      fetch(`/api/appointments/school/${schoolId}`, { headers: token? { Authorization: `Bearer ${token}` } : {} }).then(r=>r.json()),
      fetch(`/api/comments/school/${schoolId}`, { headers: token? { Authorization: `Bearer ${token}` } : {} }).then(r=>r.json()),
    ]);
    setS(a.data); setCourses(b.data||[]); setAgenda(c.data||[]); setComments(d.data||[]);
  }
  useEffect(()=>{ loadAll(); }, [schoolId]);

  // Realtime updates
  useEffect(()=>{
    const sb = supabaseBrowser();
    const ch = sb.channel('realtime:school:'+schoolId)
      .on('postgres_changes', { event:'*', schema:'public', table:'cursos', filter:`id_colegio=eq.${schoolId}` }, ()=> loadAll())
      .on('postgres_changes', { event:'*', schema:'public', table:'agendamientos' }, ()=> loadAll())
      .on('postgres_changes', { event:'*', schema:'public', table:'comentarios', filter:`id_colegio=eq.${schoolId}` }, ()=> loadAll())
      .subscribe();
    return ()=> { sb.removeChannel(ch); };
  }, [schoolId]);

  async function save(){
    if (!s) return; const { id, ...patch } = s;
    await fetch(`/api/schools/${id}`, { method:'PATCH', body: JSON.stringify(patch), headers: token? { Authorization: `Bearer ${token}` } : {} });
    loadAll();
  }
  async function addCourse(){
    const v = prompt('Nombre del curso (ej. 1A)'); if(!v) return;
    await fetch(`/api/courses/school/${schoolId}`, { method:'POST', body: JSON.stringify({ curso: v }), headers: token? { Authorization: `Bearer ${token}` } : {} });
    loadAll();
  }
  async function delCourse(id:string){
    if (!confirm('Eliminar curso?')) return; await fetch(`/api/courses/${id}`, { method:'DELETE', headers: token? { Authorization: `Bearer ${token}` } : {} }); loadAll();
  }
  async function addAgenda(){
    const fecha = (document.getElementById('aFecha') as HTMLInputElement)?.value;
    const hora = (document.getElementById('aHora') as HTMLInputElement)?.value;
    const tipo = (document.getElementById('aTipo') as HTMLSelectElement)?.value as any;
    const descripcion = (document.getElementById('aDesc') as HTMLInputElement)?.value || '';
    const observaciones = (document.getElementById('aObs') as HTMLInputElement)?.value || '';
    const r = await fetch(`/api/appointments/school/${schoolId}`, { method:'POST', body: JSON.stringify({ fecha, hora, tipo, descripcion, observaciones }), headers: token? { Authorization: `Bearer ${token}` } : {} });
    if (r.status === 409) {
      const data = await r.json();
      const list = (data.conflicts||[]).map((c:any)=> `• ${c.fecha} ${c.hora} — ${c.colegio}${c.curso?` / ${c.curso}`:''} (${c.tipo})`);
      setConflict({ list, allowed: Boolean(data.allowedForce) });
      setConflictOpen(true);
      return;
    }
    if (!r.ok) { alert('Error al agendar'); return; }
    loadAll();
  }
  async function editAgenda(id:string){
    const a = agenda.find(x=>x.id===id); if(!a) return;
    const fecha = prompt('Fecha (YYYY-MM-DD)', a.fecha)||a.fecha;
    const hora = prompt('Hora (HH:MM)', a.hora)||a.hora;
    const tipo = (prompt('Tipo (llamada/visita)', a.tipo) as any)||a.tipo;
    const descripcion = prompt('Descripción', a.descripcion||'')||a.descripcion||'';
    const observaciones = prompt('Observaciones', a.observaciones||'')||a.observaciones||'';
    await fetch(`/api/appointments/${id}`, { method:'PATCH', body: JSON.stringify({ fecha, hora, tipo, descripcion, observaciones }), headers: token? { Authorization: `Bearer ${token}` } : {} });
    loadAll();
  }
  async function delAgenda(id:string){
    if (!confirm('Eliminar agendamiento?')) return; await fetch(`/api/appointments/${id}`, { method:'DELETE', headers: token? { Authorization: `Bearer ${token}` } : {} }); loadAll();
  }
  async function addComment(){
    const autor = (document.getElementById('cAutor') as HTMLInputElement)?.value || '—';
    const texto = (document.getElementById('cTexto') as HTMLInputElement)?.value; if(!texto) return;
    await fetch(`/api/comments/school/${schoolId}`, { method:'POST', body: JSON.stringify({ autor, texto }), headers: token? { Authorization: `Bearer ${token}` } : {} });
    (document.getElementById('cTexto') as HTMLInputElement).value='';
    loadAll();
  }
  async function delComment(id:string){
    if (!confirm('Eliminar comentario?')) return; await fetch(`/api/comments/${id}`, { method:'DELETE', headers: token? { Authorization: `Bearer ${token}` } : {} }); loadAll();
  }

  if (!s) return <div className="meta">Cargando…</div>;
  return (
    <>
    <div className="grid">
      <a href="/" className="secondary" style={{width:'fit-content', padding:'10px 12px', borderRadius:8}}>↩️ Volver</a>
      <div className="grid" style={{gridTemplateColumns:'1fr 1fr 1fr', gap:10}}>
        <div><label>Nombre</label><input value={s.nombre} onChange={e=>setS({...s, nombre:e.target.value})} /></div>
        <div><label>Teléfono</label><input value={s.telefono||''} onChange={e=>setS({...s, telefono:e.target.value})} /></div>
        <div><label>Correo</label><input value={s.correo||''} onChange={e=>setS({...s, correo:e.target.value})} /></div>
        <div><label>Estado</label>
          <select value={s.estado||'no_contactado'} onChange={e=>setS({...s, estado:e.target.value as any})}>
            <option value="no_contactado">No contactado</option>
            <option value="contactado">Contactado</option>
          </select>
        </div>
        <div><label>Código colegio</label><input value={s.codigo_colegio||''} onChange={e=>setS({...s, codigo_colegio:e.target.value})} /></div>
        <div><label>Página web</label><input value={s.pagina_web||''} onChange={e=>setS({...s, pagina_web:e.target.value})} /></div>
        <div><label>Director nombre</label><input value={s.director_nombre||''} onChange={e=>setS({...s, director_nombre:e.target.value})} /></div>
        <div><label>Director apellido</label><input value={s.director_apellido||''} onChange={e=>setS({...s, director_apellido:e.target.value})} /></div>
        <div><label>Director email</label><input value={s.director_email||''} onChange={e=>setS({...s, director_email:e.target.value})} /></div>
        <div style={{gridColumn:'1/-1'}}><label>Comentarios generales</label><textarea value={s.comentarios||''} onChange={e=>setS({...s, comentarios:e.target.value})} /></div>
      </div>
      <div className="row" style={{justifyContent:'flex-end'}}>
        <button onClick={save}>💾 Guardar</button>
      </div>

      <section className="grid">
        <h3 style={{margin:0}}>Agenda del colegio</h3>
        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10}}>
          <input id="aFecha" type="date" />
          <input id="aHora" type="time" />
          <select id="aTipo">
            <option value="llamada">Llamada</option>
            <option value="visita">Visita</option>
          </select>
          <input id="aDesc" placeholder="Descripción" />
          <input id="aObs" placeholder="Observaciones" />
          <button onClick={addAgenda}>🗓️ Agendar</button>
        </div>
        <div className="list">
          {agenda.map(a => (
            <div className="item" key={a.id}>
              <div>
                <div><strong>{a.tipo}</strong> • {a.fecha} {a.hora}</div>
                <div className="meta">{a.descripcion||''}</div>
              </div>
              <div style={{display:'flex', gap:8}}>
                <button className="secondary" onClick={()=>editAgenda(a.id)}>✏️ Editar</button>
                <button className="danger" onClick={()=>delAgenda(a.id)}>🗑️ Eliminar</button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="grid">
        <div className="row" style={{justifyContent:'space-between'}}>
          <h3 style={{margin:0}}>Cursos</h3>
          <button className="secondary" onClick={addCourse}>➕ Agregar curso</button>
        </div>
        <div className="list">
          {courses.map(c => (
            <div className="item" key={c.id}>
              <div>
                <div style={{fontWeight:600}}>{c.curso}</div>
                <div className="meta">ID: {c.id}</div>
              </div>
              <div style={{display:'flex', gap:8}}>
                <a href={`/courses/${c.id}`}><button>🗓️ Ver agenda del curso</button></a>
                <button className="danger" onClick={()=>delCourse(c.id)}>🗑️ Eliminar</button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="grid">
        <h3 style={{margin:0}}>Comentarios</h3>
        <div className="row" style={{gap:8}}>
          <input id="cAutor" placeholder="Autor" style={{maxWidth:200}} />
          <input id="cTexto" placeholder="Escribe un comentario" style={{flex:1}} />
          <button className="secondary" onClick={addComment}>Agregar</button>
        </div>
        <div className="list">
          {comments.map(c => (
            <div className="item" key={c.id}>
              <div>
                <div className="meta">{new Date(c.fecha).toLocaleString()} • {c.autor||'—'}</div>
                <div>{c.texto||''}</div>
              </div>
              <button className="danger" onClick={()=>delComment(c.id)}>🗑️ Eliminar</button>
            </div>
          ))}
        </div>
      </section>
    </div>
    {/* Conflicts modal */}
    <Modal
      isOpen={conflictOpen}
      title="Conflicto de horario (±2h)"
      onClose={()=>setConflictOpen(false)}
      onOk={conflict.allowed ? async ()=>{
        if (!s) return;
        const fecha = (document.getElementById('aFecha') as HTMLInputElement)?.value;
        const hora = (document.getElementById('aHora') as HTMLInputElement)?.value;
        const tipo = (document.getElementById('aTipo') as HTMLSelectElement)?.value as any;
        const descripcion = (document.getElementById('aDesc') as HTMLInputElement)?.value || '';
        const observaciones = (document.getElementById('aObs') as HTMLInputElement)?.value || '';
        const r2 = await fetch(`/api/appointments/school/${s.id}`, { method:'POST', body: JSON.stringify({ fecha, hora, tipo, descripcion, observaciones, force: true }), headers: token? { Authorization: `Bearer ${token}` } : {} });
        setConflictOpen(false);
        if (!r2.ok) return; loadAll();
      } : undefined}
      okText="Continuar de todas maneras"
    >
      <div className="grid" style={{gap:8}}>
        <div>Ya existe(n) agendamiento(s) cercano(s):</div>
        <ul>
          {conflict.list.map((t,i)=> <li key={i}>{t}</li>)}
        </ul>
        {!conflict.allowed && <div className="meta">No puedes continuar porque el conflicto incluye un agendamiento a nivel de colegio.</div>}
      </div>
    </Modal>
    </>
  );
}
