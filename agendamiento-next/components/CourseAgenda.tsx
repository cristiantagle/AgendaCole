"use client";
import { useEffect, useState } from 'react';
import { Modal } from '@/components/Modal';
import { toast } from '@/lib/toast';

type Appointment = { id:string; tipo:'llamada'|'visita'; fecha:string; hora:string; descripcion?:string; observaciones?:string };

export default function CourseAgenda({ courseId, open, onClose }: { courseId:string; open:boolean; onClose:()=>void }){
  const [agenda, setAgenda] = useState<Appointment[]>([]);
  type ConflictItem = { fecha:string; hora:string; tipo:string; colegio:string; curso?:string };
  const [conflict, setConflict] = useState<{items:ConflictItem[]; allowed:boolean}>({items:[], allowed:false});
  const [schoolId, setSchoolId] = useState<string>('');
  const [conflictOpen, setConflictOpen] = useState(false);
  const token = typeof window!=='undefined' ? localStorage.getItem('sb_token')||'' : '';

  async function load(){
    const [r, m] = await Promise.all([
      fetch(`/api/appointments/course/${courseId}`, { headers: token? { Authorization: `Bearer ${token}` } : {} }),
      fetch(`/api/courses/${courseId}`, { headers: token? { Authorization: `Bearer ${token}` } : {} })
    ]);
    const j = await r.json(); setAgenda(j.data||[]);
    const meta = await m.json(); setSchoolId(meta?.data?.id_colegio || '');
  }
  useEffect(()=>{ if(open && courseId) load(); }, [open, courseId]);

  async function add(){
    const fecha = (document.getElementById('cgFecha') as HTMLInputElement)?.value;
    const hora = (document.getElementById('cgHora') as HTMLInputElement)?.value;
    const descripcion = (document.getElementById('cgDesc') as HTMLInputElement)?.value || '';
    const observaciones = (document.getElementById('cgObs') as HTMLInputElement)?.value || '';
    const r = await fetch(`/api/appointments/course/${courseId}`, { method:'POST', body: JSON.stringify({ fecha, hora, descripcion, observaciones }), headers: token? { Authorization: `Bearer ${token}` } : {} });
    if (r.status === 409) {
      const data = await r.json();
      setConflict({ items: (data.conflicts||[]), allowed: Boolean(data.allowedForce) });
      setConflictOpen(true);
      return;
    }
    if (!r.ok) { toast('Error al agendar', 'error'); return; }
    toast('Agendamiento creado', 'success');
    load();
  }

  return (
    <>
    <Modal isOpen={open} title="Agenda del curso" onClose={onClose}>
      <div className="grid" style={{gap:10}}>
        <div style={{display:'grid', gridTemplateColumns:'1fr', gap:10}}>
          <input id="cgFecha" type="date" />
          <input id="cgHora" type="time" />
          <input value="Visita" disabled className="secondary" />
          <input id="cgDesc" placeholder="Descripción" />
          <input id="cgObs" placeholder="Observaciones" />
          <button onClick={add} style={{width:'100%'}}>🗓️ Agendar</button>
        </div>
        <div className="list">
          {agenda.map(a => (
            <div className="item" key={a.id}>
              <div>
                <div><strong>{a.tipo}</strong> • {a.fecha} {a.hora}</div>
                <div className="meta">{a.descripcion||''}</div>
              </div>
            </div>
          ))}
          {!agenda.length && <div className="meta">Sin agendamientos</div>}
        </div>
      </div>
    </Modal>
    <Modal
      isOpen={conflictOpen}
      title="Horario ocupado"
      onClose={()=>setConflictOpen(false)}
      onOk={conflict.allowed ? async ()=>{
        const fecha = (document.getElementById('cgFecha') as HTMLInputElement)?.value;
        const hora = (document.getElementById('cgHora') as HTMLInputElement)?.value;
        const tipo = 'visita';
        const descripcion = (document.getElementById('cgDesc') as HTMLInputElement)?.value || '';
        const observaciones = (document.getElementById('cgObs') as HTMLInputElement)?.value || '';
        const r2 = await fetch(`/api/appointments/course/${courseId}`, { method:'POST', body: JSON.stringify({ fecha, hora, tipo, descripcion, observaciones, force: true }), headers: token? { Authorization: `Bearer ${token}` } : {} });
        setConflictOpen(false);
        if (!r2.ok) return; load();
        // Notificar a SchoolDetail para refrescar si está abierto
        if (schoolId) window.dispatchEvent(new CustomEvent('app:refresh-appointments', { detail: { schoolId } }));
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
          <div>¿Deseas continuar y agendar de todas maneras para este curso?</div>
        ) : (
          <div className="meta">No puedes continuar porque al menos uno de los conflictos es a nivel de colegio.</div>
        )}
      </div>
    </Modal>
    </>
  );
}
