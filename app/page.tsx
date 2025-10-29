'use client';
import { useEffect, useState } from 'react';
import * as XLSX from 'xlsx';
import { supabaseBrowser } from '@/lib/supabase-browser';
import { Modal } from '@/components/Modal';
import { toast } from '@/lib/toast';
import SchoolDetail from '@/components/SchoolDetail';
import CourseAgenda from '@/components/CourseAgenda';
import AddSchoolModal from '@/components/AddSchoolModal';
import ConfirmDialog from '@/components/ConfirmDialog';

type School = {
  id:string; nombre:string;
  telefono?:string; correo?:string; estado?:'no_contactado'|'contactado'; comentarios?:string;
  codigo_colegio?: string | null;
  pagina_web?: string | null;
  director_nombre?: string | null;
  director_apellido?: string | null;
  director_email?: string | null;
};

export default function Page(){
  const [schools, setSchools] = useState<School[]>([]);
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

  // Realtime refresh
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

  async function addSchool(){
    const nombre = prompt('Nombre del colegio'); if(!nombre) return;
    const direccion = prompt('Dirección')||''; const telefono = prompt('Teléfono')||''; const correo = prompt('Correo')||'';
    const r = await fetch('/api/schools', { method:'POST', body: JSON.stringify({ nombre, direccion, telefono, correo, estado:'no_contactado' }), headers: token? { Authorization: `Bearer ${token}` } : {} });
    if(!r.ok){ toast('Error al agregar colegio', 'error'); return; }
    load();
  }

  // Import wizard state
  const [impOpen, setImpOpen] = useState(false);
  const [impFile, setImpFile] = useState<File|null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<any>({ nombre:'', curso:'' });
  const [detailId, setDetailId] = useState<string>('');
  const [courseModal, setCourseModal] = useState<string>('');
  const [addOpen, setAddOpen] = useState<boolean>(false);
  const [confirmSchoolId, setConfirmSchoolId] = useState<string>('');
  async function confirmRemoveSchool(){
    if (!confirmSchoolId) return;
    const r = await fetch(`/api/schools/${confirmSchoolId}`, { method:'DELETE', headers: token? { Authorization: `Bearer ${token}` } : {} });
    setConfirmSchoolId('');
    if (!r.ok) { toast('No se pudo eliminar el colegio', 'error'); return; }
    toast('Colegio eliminado', 'success');
    load();
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
        // Prefer exact match first
        for (const c of cands) {
          const exact = arr.find(h => lc(h) === lc(c)); if (exact) return exact;
        }
        // Fallback to includes
        return arr.find(h=> cands.some(c=> lc(h).includes(lc(c)))) || '';
      };
      setMapping({
        nombre: find(hdrs, ['colegio','nombre','school']),
        curso: find(hdrs, ['curso','grado','course','class'])
      });
      setImpFile(file); setImpOpen(true);
    }catch{ toast('No se pudo previsualizar el archivo', 'error'); }
  }

  async function doImport(){
    if (!impFile) return;
    const fd = new FormData(); fd.append('file', impFile); fd.append('mapping', JSON.stringify(mapping));
    const r = await fetch('/api/import', { method:'POST', body: fd, headers: token? { Authorization: `Bearer ${token}` } : {} });
    if (!r.ok) { toast('Error al importar', 'error'); return; }
    toast('Importación completada', 'success');
    setImpOpen(false); setImpFile(null); load();
  }

  function exportColegios(){
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(schools);
    XLSX.utils.book_append_sheet(wb, ws, 'Colegios');
    const data = XLSX.write(wb, { bookType:'xlsx', type:'array' });
    const blob = new Blob([data], { type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'colegios.xlsx'; a.click(); URL.revokeObjectURL(url);
  }

  return (
    <>
    <div className="grid">
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
          <button onClick={()=> setAddOpen(true)}>➕ Agregar colegio</button>
          <label className="secondary" style={{padding:'10px 12px', borderRadius:8, cursor:'pointer'}}>
            Importar Excel
            <input type="file" accept=".xlsx,.xls,.csv" style={{display:'none'}} onChange={async e=>{
              const file = e.target.files?.[0]; if(!file) return; await openImport(file);
            }} />
          </label>
          <button onClick={exportColegios}>⬇️ Exportar</button>
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
            <div className="meta">
              <div>📞 <a href={`tel:${s.telefono||''}`}>{s.telefono||'—'}</a></div>
              {s.pagina_web ? (
                <div>🌐 <a target="_blank" href={String(s.pagina_web)}>{s.pagina_web}</a></div>
              ) : null}
              <div>✉️ <a href={`mailto:${s.correo||''}`}>{s.correo||'—'}</a></div>
              {s.codigo_colegio ? (<div>🧾 Código: {s.codigo_colegio}</div>) : null}
              {(s.director_nombre || s.director_apellido) ? (
                <div>👤 Director: {(s.director_nombre||'') + ' ' + (s.director_apellido||'')}</div>
              ) : null}
              {s.director_email ? (
                <div>✉️ Director: <a href={`mailto:${s.director_email}`}>{s.director_email}</a></div>
              ) : null}
            </div>
            <div className="row" style={{gap:8}}>
              <button className="secondary" onClick={()=>toggleEstado(s.id)}>{s.estado==='contactado'?'Marcar no contactado':'Marcar contactado'}</button>
              <button onClick={()=> setDetailId(s.id)}>🔎 Ver detalle</button>
              <button className="danger" onClick={()=>remove(s.id)}>🗑️ Eliminar</button>
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
    </>
  );
}


