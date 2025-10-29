"use client";
import { useEffect, useState } from 'react';
import * as XLSX from 'xlsx';
import { supabaseBrowser } from '@/lib/supabase-browser';
import { Modal } from '@/components/Modal';
import { toast } from '@/lib/toast';
import SchoolDetail from '@/components/SchoolDetail';
import CourseAgenda from '@/components/CourseAgenda';
import AddSchoolModal from '@/components/AddSchoolModal';
import ConfirmDialog from '@/components/ConfirmDialog';
import EditAppointmentModal from '@/components/EditAppointmentModal';

type School = {
  id:string; nombre:string;
  telefono?:string; correo?:string; estado?:'no_contactado'|'contactado'; comentarios?:string;
  codigo_colegio?: string | null;
  pagina_web?: string | null;
  director_nombre?: string | null;
  director_apellido?: string | null;
  director_email?: string | null;
  lat?: number | null;
  lng?: number | null;
};

const absWeb = (url?: string|null) => {
  const u = String(url||'').trim(); if (!u) return '';
  return /^https?:\/\//i.test(u) ? u : `https://${u}`;
};

export default function Page(){
  const [schools, setSchools] = useState<School[]>([]);
  const [upcoming, setUpcoming] = useState<any[]>([]);
  const [q, setQ] = useState('');
  const [estado, setEstado] = useState<'todos'|'contactado'|'no_contactado'>('todos');
  const [sort, setSort] = useState<'nombre'|'estado'>('nombre');
  const [loading, setLoading] = useState(false);

  const token = typeof window !== 'undefined' ? localStorage.getItem('sb_token')||'' : '';

  async function load(){
    setLoading(true);
    const res = await fetch(`/api/schools?q=${encodeURIComponent(q)}&estado=${estado}&sort=${sort}`, { cache:'no-store', headers: token? { Authorization: `Bearer ${token}` } : {} });
    const json = await res.json(); setSchools(json.data||[]); setLoading(false);
  }
  useEffect(()=>{ load(); }, [q, estado, sort]);

  async function loadUpcoming(){
    const r = await fetch(`/api/appointments?limit=50`, { headers: token? { Authorization: `Bearer ${token}` } : {} });
    const j = await r.json(); setUpcoming(j.data||[]);
  }
  useEffect(()=>{ loadUpcoming(); }, []);

  useEffect(()=>{
    const sb = supabaseBrowser();
    const ch = sb.channel('realtime:colegios')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'colegios' }, ()=> load())
      .subscribe();
    return ()=> { sb.removeChannel(ch); };
  }, []);

  async function toggleEstado(id:string){
    const cur = schools.find(s=>s.id===id); if(!cur) return;
    const next = cur.estado==='contactado'?'no_contactado':'contactado';
    await fetch(`/api/schools/${id}`, { method:'PATCH', body: JSON.stringify({ estado: next }), headers: token? { Authorization: `Bearer ${token}` } : {} });
    load();
  }

  function remove(id:string){ setConfirmSchoolId(id); }

  const [impOpen, setImpOpen] = useState(false);
  const [impFile, setImpFile] = useState<File|null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<any>({ nombre:'', curso:'', codigo:'' });
  const [detailId, setDetailId] = useState<string>('');
  const [courseModal, setCourseModal] = useState<string>('');
  const [addOpen, setAddOpen] = useState<boolean>(false);
  const [confirmSchoolId, setConfirmSchoolId] = useState<string>('');
  const [confirmApptId, setConfirmApptId] = useState<string>('');
  const [editAppt, setEditAppt] = useState<{id:string; fecha:string; hora:string}|null>(null);
  const [wazeFor, setWazeFor] = useState<{id:string; nombre:string}|null>(null);
  const [wazeLat, setWazeLat] = useState('');
  const [wazeLng, setWazeLng] = useState('');

  function openWazeSetup(s: School){
    setWazeFor({ id: s.id, nombre: s.nombre });
    try{
      const saved = localStorage.getItem(`waze:${s.id}`);
      if (saved){ const j = JSON.parse(saved); setWazeLat(j.lat||''); setWazeLng(j.lng||''); }
      else if (s.lat && s.lng) { setWazeLat(String(s.lat)); setWazeLng(String(s.lng)); }
      else { setWazeLat(''); setWazeLng(''); }
    } catch { setWazeLat(''); setWazeLng(''); }
  }
  function saveAndOpenWaze(){
    const lat = wazeLat.trim(); const lng = wazeLng.trim();
    if (!lat || !lng) { toast('Ingresa latitud y longitud', 'warning'); return; }
    try { if (wazeFor) localStorage.setItem(`waze:${wazeFor.id}`, JSON.stringify({ lat, lng })); } catch {}
    if (wazeFor) {
      fetch(`/api/schools/${wazeFor.id}`, { method:'PATCH', headers: token? { Authorization: `Bearer ${token}` } : {}, body: JSON.stringify({ lat: Number(lat), lng: Number(lng) }) }).catch(()=>{});
    }
    const url = `https://waze.com/ul?ll=${encodeURIComponent(lat)},${encodeURIComponent(lng)}&navigate=yes`;
    window.open(url, '_blank'); setWazeFor(null);
  }

  async function confirmDeleteAppt(){
    if (!confirmApptId) return;
    await fetch(`/api/appointments/${confirmApptId}`, { method:'DELETE', headers: token? { Authorization: `Bearer ${token}` } : {} });
    setConfirmApptId(''); loadUpcoming();
  }

  async function confirmRemoveSchool(){
    if (!confirmSchoolId) return;
    const r = await fetch(`/api/schools/${confirmSchoolId}`, { method:'DELETE', headers: token? { Authorization: `Bearer ${token}` } : {} });
    setConfirmSchoolId(''); if (!r.ok) { toast('No se pudo eliminar el colegio', 'error'); return; }
    toast('Colegio eliminado', 'success'); load();
  }

  async function openImport(file: File){
    try{
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows: any[] = XLSX.utils.sheet_to_json(ws, { defval:'', header:1 });
      const hdrs: string[] = (rows[0]||[]).map((h:any)=> String(h));
      setHeaders(hdrs);
      // auto-map best guess
      const lc = (s:string)=> s.toLowerCase();
      const find = (arr:string[], cands:string[])=>{
        for (const c of cands) { const exact = arr.find(h => lc(h) === lc(c)); if (exact) return exact; }
        return arr.find(h=> cands.some(c=> lc(h).includes(lc(c)))) || '';
      };
      setMapping({
        nombre: find(hdrs, ['colegio','nombre','nombre colegio','nombre establecimiento','establecimiento','school']),
        curso: find(hdrs, ['curso','grado','course','class']),
        codigo: find(hdrs, ['codigo colegio','código colegio','codigo','código','rbd'])
      });
      setImpFile(file); setImpOpen(true);
    }catch{ toast('No se pudo previsualizar el archivo', 'error'); }
  }

  async function doImport(){
    if (!impFile) return;
    const fd = new FormData(); fd.append('file', impFile); fd.append('mapping', JSON.stringify(mapping));
    const r = await fetch('/api/import', { method:'POST', body: fd, headers: token? { Authorization: `Bearer ${token}` } : {} });
    if (!r.ok) { toast('Error al importar', 'error'); return; }
    toast('Importación completada', 'success'); setImpOpen(false); setImpFile(null); load();
  }

  function exportColegios(){
    const wb = XLSX.utils.book_new(); const ws = XLSX.utils.json_to_sheet(schools);
    XLSX.utils.book_append_sheet(wb, ws, 'Colegios');
    const data = XLSX.write(wb, { bookType:'xlsx', type:'array' });
    const blob = new Blob([data], { type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'colegios.xlsx'; a.click(); URL.revokeObjectURL(url);
  }

  return (
    <>
    <div className="container grid">
      {/* Próximos agendamientos */}
      <div className="card" style={{padding:14}}>
        <div className="row" style={{justifyContent:'space-between'}}>
          <h3 style={{margin:0}}>Próximos agendamientos</h3>
        </div>
        <div className="list">
          {upcoming.map(a => (
            <div className="item" key={a.id}>
              <div>
                <div style={{display:'flex',gap:8,alignItems:'center'}}>
                  <span className={`badge type ${a.tipo}`}>{a.tipo==='llamada'?'Llamada':'Visita'}</span>
                  <strong>{a.colegio}</strong>
                  {a.curso ? <span className="badge course">Curso: {a.curso}</span> : null}
                  <span className="meta">{a.fecha} {a.hora}</span>
                </div>
                <div className="meta">{a.descripcion||''}</div>
              </div>
              <div className="row" style={{gap:6}}>
                <button className="secondary" onClick={()=> setEditAppt({ id:a.id, fecha:a.fecha, hora:a.hora })}>Editar</button>
                <button className="danger" onClick={()=> setConfirmApptId(a.id)}>Eliminar</button>
              </div>
            </div>
          ))}
          {!upcoming.length && <div className="meta">Sin agendamientos próximos</div>}
        </div>
      </div>

      <div className="toolbar">
        <input placeholder="Buscar por nombre, código, director, teléfono, correo o web" value={q} onChange={e=>setQ(e.target.value)} />
        <select value={estado} onChange={e=>setEstado(e.target.value as any)}>
          <option value="todos">Todos</option>
          <option value="contactado">Contactado</option>
          <option value="no_contactado">No contactado</option>
        </select>
        <select value={sort} onChange={e=>setSort(e.target.value as any)}>
          <option value="nombre">Orden: Alfabético</option>
          <option value="estado">Orden: Estado</option>
        </select>
      </div>

      <div className="row" style={{justifyContent:'space-between'}}>
        <h2 style={{margin:0}}>Colegios</h2>
        <div style={{display:'flex', gap:8}}>
          <button onClick={()=> setAddOpen(true)}>Agregar colegio</button>
          <label className="secondary" style={{padding:'10px 12px', borderRadius:8, cursor:'pointer'}}>
            Importar Excel
            <input type="file" accept=".xlsx,.xls,.csv" style={{display:'none'}} onChange={async e=>{ const file = e.target.files?.[0]; if(!file) return; await openImport(file); }} />
          </label>
          <button onClick={exportColegios}>Exportar</button>
        </div>
      </div>

      {loading? <div className="meta">Cargando…</div> : null}

      <div className="cards">
        {schools.map(s => (
          <div className="card" key={s.id}>
            <div className="row">
              <h3 style={{margin:0, fontSize:16}}>{s.nombre}</h3>
              <span className="meta">{s.estado==='contactado'?'Contactado':'No contactado'}</span>
            </div>
            <div className="grid" style={{gap:6}}>
              {s.telefono ? (
                <div className="row" style={{gap:8,justifyContent:'flex-start'}}>
                  <a href={`tel:${s.telefono}`}>{s.telefono}</a>
                </div>
              ) : null}
              {s.pagina_web ? (
                <div className="row" style={{gap:8,justifyContent:'flex-start'}}>
                  <a target="_blank" rel="noreferrer" href={absWeb(s.pagina_web)}>{s.pagina_web}</a>
                </div>
              ) : null}
              {s.correo ? (
                <div className="row" style={{gap:8,justifyContent:'flex-start'}}>
                  <a href={`mailto:${s.correo}`}>{s.correo}</a>
                </div>
              ) : null}
              {(s.director_nombre || s.director_apellido) ? (
                <div className="meta">Director: {(s.director_nombre||'') + ' ' + (s.director_apellido||'')}</div>
              ) : null}
              {s.director_email ? (
                <div className="meta">Director: <a href={`mailto:${s.director_email}`}>{s.director_email}</a></div>
              ) : null}
            </div>
            <div className="row card-actions" style={{gap:8}}>
              <button className="ghost" onClick={()=> openWazeSetup(s)} title="Abrir en Waze">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 3c4.418 0 8 2.91 8 6.5 0 2.2-1.33 3.96-3.03 5.02-.2 1.08-.78 2.1-1.62 2.94-1.56 1.56-3.74 2.36-5.94 2.02-.42-.06-.78-.38-.9-.79l-.28-.94c-.1-.32-.4-.55-.74-.55H5.5c-1.38 0-2.5-1.12-2.5-2.5V12c0-4.59 3.582-9 9-9Z" stroke="#0f172a" strokeWidth="1.5"/>
                  <circle cx="9" cy="11" r="1" fill="#0f172a"/>
                  <circle cx="14" cy="11" r="1" fill="#0f172a"/>
                </svg>
              </button>
              <button className="secondary" onClick={()=>toggleEstado(s.id)}>{s.estado==='contactado'?'Marcar no contactado':'Marcar contactado'}</button>
              <button onClick={()=> setDetailId(s.id)}>Ver detalle</button>
              <button className="danger" onClick={()=>remove(s.id)}>Eliminar</button>
            </div>
          </div>
        ))}
      </div>
    </div>

    <Modal isOpen={impOpen} title="Importar desde Excel" onClose={()=>setImpOpen(false)} onOk={doImport} okText="Importar">
      <div className="grid" style={{gap:8}}>
        <div className="meta">Selecciona las columnas. Curso es opcional.</div>
        <div className="grid" style={{gridTemplateColumns:'1fr 1fr', gap:8}}>
          <label>Nombre colegio
            <select value={mapping.nombre} onChange={e=>setMapping({...mapping, nombre:e.target.value})}>
              <option value="">— Ninguno —</option>
              {headers.map(h=> <option key={h} value={h}>{h}</option>)}
            </select>
          </label>
          <label>Curso (opcional)
            <select value={mapping.curso} onChange={e=>setMapping({...mapping, curso:e.target.value})}>
              <option value="">— Ninguno —</option>
              {headers.map(h=> <option key={h} value={h}>{h}</option>)}
            </select>
          </label>
          <label>Código colegio (opcional)
            <select value={mapping.codigo} onChange={e=>setMapping({...mapping, codigo:e.target.value})}>
              <option value="">— Ninguno —</option>
              {headers.map(h=> <option key={h} value={h}>{h}</option>)}
            </select>
          </label>
        </div>
      </div>
    </Modal>
    <SchoolDetail
      schoolId={detailId}
      open={Boolean(detailId)}
      onClose={()=> setDetailId('')}
      onOpenCourse={(cid)=> setCourseModal(cid)}
    />
    <CourseAgenda courseId={courseModal} open={Boolean(courseModal)} onClose={()=> setCourseModal('')} />
    <AddSchoolModal open={addOpen} onClose={()=> setAddOpen(false)} onAdded={()=> load()} />

    <ConfirmDialog
      open={Boolean(confirmSchoolId)}
      title="Eliminar colegio"
      description="¿Seguro que deseas eliminar este colegio y todos sus datos asociados?"
      confirmText="Eliminar"
      onCancel={()=> setConfirmSchoolId('')}
      onConfirm={confirmRemoveSchool}
    />
    <ConfirmDialog
      open={Boolean(confirmApptId)}
      title="Eliminar agendamiento"
      description="¿Seguro que deseas eliminar este agendamiento?"
      confirmText="Eliminar"
      onCancel={()=> setConfirmApptId('')}
      onConfirm={confirmDeleteAppt}
    />
    <EditAppointmentModal
      open={Boolean(editAppt)}
      appt={editAppt}
      onClose={()=> setEditAppt(null)}
      onSaved={loadUpcoming}
    />

    <Modal
      isOpen={Boolean(wazeFor)}
      title="Abrir en Waze"
      onClose={()=> setWazeFor(null)}
      onOk={saveAndOpenWaze}
      okText="Abrir"
    >
      <div className="grid" style={{gap:10}}>
        <div className="meta">Colegio: {wazeFor?.nombre||''}</div>
        <div className="grid" style={{gridTemplateColumns:'1fr 1fr', gap:8}}>
          <input placeholder="Latitud" value={wazeLat} onChange={e=>setWazeLat(e.target.value)} />
          <input placeholder="Longitud" value={wazeLng} onChange={e=>setWazeLng(e.target.value)} />
        </div>
        <div className="meta">Se guardarán para este colegio y se usarán la próxima vez.</div>
      </div>
    </Modal>
    </>
  );
}

