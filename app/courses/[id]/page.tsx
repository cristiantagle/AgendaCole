"use client";
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

const getToken = () => '';

type Appointment = { id:string; tipo:'llamada'|'visita'; fecha:string; hora:string; descripcion?:string; observaciones?:string };

export default function CoursePage(){
  const route = useParams<{ id: string }>();
  const courseId = (route?.id as string) || '';
  const [agenda, setAgenda] = useState<Appointment[]>([]);
  const [title, setTitle] = useState<string>('Curso');
  const [schoolId, setSchoolId] = useState<string>('');
  const [conflict, setConflict] = useState<{list:string[]; allowed:boolean}>({list:[], allowed:false});
  const [conflictOpen, setConflictOpen] = useState(false);

  async function load(){
    const [ag, meta] = await Promise.all([
      fetch(`/api/appointments/course/${courseId}`, { headers: getToken()? { Authorization: `Bearer ${getToken()}` } : {} }).then(r=>r.json()),
      fetch(`/api/courses/${courseId}`, { headers: getToken()? { Authorization: `Bearer ${getToken()}` } : {} }).then(r=>r.json())
    ]);
    setAgenda(ag.data||[]);
    const m = (meta as any)?.data || {};
    setTitle(m.curso || courseId);
    setSchoolId(m.id_colegio || '');
  }
  useEffect(()=>{ load(); }, [courseId]);

  async function addAgenda(){
    const fecha = (document.getElementById('aFecha') as HTMLInputElement)?.value;
    const hora = (document.getElementById('aHora') as HTMLInputElement)?.value;
    const tipo = 'visita' as const; // solo visitas a nivel curso
    const descripcion = (document.getElementById('aDesc') as HTMLInputElement)?.value || '';
    const observaciones = (document.getElementById('aObs') as HTMLInputElement)?.value || '';
    const r = await fetch(`/api/appointments/course/${courseId}`, { method:'POST', body: JSON.stringify({ fecha, hora, tipo, descripcion, observaciones }), headers: getToken()? { Authorization: `Bearer ${getToken()}` } : {} });
    if (r.status === 409) {
      const data = await r.json();
      const list = (data.conflicts||[]).map((c:any)=> `• ${c.fecha} ${c.hora} — ${c.colegio}${c.curso?` / ${c.curso}`:''} (${c.tipo})`);
      setConflict({ list, allowed: Boolean(data.allowedForce) });
      setConflictOpen(true);
      return;
    }
    if (!r.ok) { alert('Error al agendar'); return; }
    load();
  }
  async function editAgenda(id:string){
    const a = agenda.find(x=>x.id===id); if(!a) return;
    const fecha = prompt('Fecha', a.fecha)||a.fecha;
    const hora = prompt('Hora', a.hora)||a.hora;
    const tipo = (prompt('Tipo (llamada/visita)', a.tipo) as any)||a.tipo;
    const descripcion = prompt('Descripción', a.descripcion||'')||a.descripcion||'';
    const observaciones = prompt('Observaciones', a.observaciones||'')||a.observaciones||'';
    await fetch(`/api/appointments/${id}`, { method:'PATCH', body: JSON.stringify({ fecha, hora, tipo, descripcion, observaciones }), headers: getToken()? { Authorization: `Bearer ${getToken()}` } : {} });
    load();
  }
  async function delAgenda(id:string){
    if (!confirm('Eliminar agendamiento?')) return; await fetch(`/api/appointments/${id}`, { method:'DELETE', headers: getToken()? { Authorization: `Bearer ${getToken()}` } : {} }); load();
  }

  return (
    <>
    <div className="grid">
      <a href={schoolId ? `/schools/${schoolId}` : `/`} className="secondary" style={{width:'fit-content', padding:'10px 12px', borderRadius:8}}>↩️ Volver</a>
      <h2 style={{margin:0}}>Agenda curso — {title}</h2>
      <div style={{display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10}}>
        <input id="aFecha" type="date" />
        <input id="aHora" type="time" />
        <input value="Visita" disabled className="secondary" />
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
    </div>
    <Modal
      isOpen={conflictOpen}
      title="Conflicto de horario (±2h)"
      onClose={()=>setConflictOpen(false)}
      onOk={conflict.allowed ? async ()=>{
        const fecha = (document.getElementById('aFecha') as HTMLInputElement)?.value;
        const hora = (document.getElementById('aHora') as HTMLInputElement)?.value;
        const tipo = 'visita';
        const descripcion = (document.getElementById('aDesc') as HTMLInputElement)?.value || '';
        const observaciones = (document.getElementById('aObs') as HTMLInputElement)?.value || '';
        const r2 = await fetch(`/api/appointments/course/${courseId}`, { method:'POST', body: JSON.stringify({ fecha, hora, tipo, descripcion, observaciones, force: true }), headers: getToken()? { Authorization: `Bearer ${getToken()}` } : {} });
        setConflictOpen(false);
        if (!r2.ok) return; load();
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
import { Modal } from '@/components/Modal';

