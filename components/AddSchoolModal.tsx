"use client";
import { Modal } from '@/components/Modal';
import { useState } from 'react';

export default function AddSchoolModal({ open, onClose, onAdded }: { open:boolean; onClose:()=>void; onAdded:()=>void }){
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [correo, setCorreo] = useState('');
  const [codigo, setCodigo] = useState('');
  const [web, setWeb] = useState('');
  const [dirNom, setDirNom] = useState('');
  const [dirApe, setDirApe] = useState('');
  const [dirMail, setDirMail] = useState('');
  const [curso, setCurso] = useState('');
  const token = typeof window!=='undefined' ? localStorage.getItem('sb_token')||'' : '';

  async function save(){
    if (!nombre.trim()) return;
    const r = await fetch('/api/schools', { method:'POST', body: JSON.stringify({ nombre: nombre.trim(), telefono, correo, estado:'no_contactado', codigo_colegio: codigo, pagina_web: web, director_nombre: dirNom, director_apellido: dirApe, director_email: dirMail }), headers: token? { Authorization: `Bearer ${token}` } : {} });
    if (!r.ok) return;
    const j = await r.json();
    if (curso.trim()) {
      await fetch(`/api/courses/school/${j.data.id}`, { method:'POST', body: JSON.stringify({ curso: curso.trim() }), headers: token? { Authorization: `Bearer ${token}` } : {} });
    }
    onClose(); onAdded();
    setNombre(''); setTelefono(''); setCorreo(''); setCodigo(''); setWeb(''); setDirNom(''); setDirApe(''); setDirMail(''); setCurso('');
  }

  return (
    <Modal isOpen={open} title="Agregar colegio" onClose={onClose} onOk={save} okText="Guardar">
      <div className="grid" style={{gap:10}}>
        <input placeholder="Nombre" value={nombre} onChange={e=>setNombre(e.target.value)} />
        <input placeholder="Teléfono" value={telefono} onChange={e=>setTelefono(e.target.value)} />
        <input placeholder="Correo" value={correo} onChange={e=>setCorreo(e.target.value)} />
        <input placeholder="Código colegio" value={codigo} onChange={e=>setCodigo(e.target.value)} />
        <input placeholder="Página web" value={web} onChange={e=>setWeb(e.target.value)} />
        <div className="grid" style={{gridTemplateColumns:'1fr 1fr 1fr', gap:8}}>
          <input placeholder="Director nombre" value={dirNom} onChange={e=>setDirNom(e.target.value)} />
          <input placeholder="Director apellido" value={dirApe} onChange={e=>setDirApe(e.target.value)} />
          <input placeholder="Director email" value={dirMail} onChange={e=>setDirMail(e.target.value)} />
        </div>
        <input placeholder="Curso inicial (opcional)" value={curso} onChange={e=>setCurso(e.target.value)} />
      </div>
    </Modal>
  );
}

