"use client";
import { Modal } from "@/components/Modal";
import { useState } from "react";

export default function AddSchoolModal({
  open,
  onClose,
  onAdded,
}: {
  open: boolean;
  onClose: () => void;
  onAdded: () => void;
}) {
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [correo, setCorreo] = useState("");
  const [codigo, setCodigo] = useState("");
  const [web, setWeb] = useState("");
  const [direccion, setDireccion] = useState("");
  const [dirNom, setDirNom] = useState("");
  const [dirApe, setDirApe] = useState("");
  const [dirMail, setDirMail] = useState("");
  const [curso, setCurso] = useState("");

  async function save() {
    const trimmed = nombre.trim();
    if (!trimmed) return;
    const res = await fetch("/api/schools", {
      method: "POST",
      body: JSON.stringify({
        nombre: trimmed,
        telefono,
        correo,
        estado: "no_contactado",
        codigo_colegio: codigo,
        pagina_web: web,
        direccion,
        director_nombre: dirNom,
        director_apellido: dirApe,
        director_email: dirMail,
      }),
    });
    if (!res.ok) return;
    const json = await res.json();
    if (curso.trim()) {
      await fetch(`/api/courses/school/${json.data.id}`, {
        method: "POST",
        body: JSON.stringify({ curso: curso.trim() }),
      });
    }
    onClose();
    onAdded();
    setNombre("");
    setTelefono("");
    setCorreo("");
    setCodigo("");
    setWeb("");
    setDireccion("");
    setDirNom("");
    setDirApe("");
    setDirMail("");
    setCurso("");
  }

  return (
    <Modal isOpen={open} title="Agregar colegio" onClose={onClose} onOk={save} okText="Guardar">
      <div className="grid" style={{ gap: 10 }}>
        <input placeholder="Nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} />
        <input placeholder="Direccion" value={direccion} onChange={(e) => setDireccion(e.target.value)} />
        <input placeholder="Telefono" value={telefono} onChange={(e) => setTelefono(e.target.value)} />
        <input placeholder="Correo" value={correo} onChange={(e) => setCorreo(e.target.value)} />
        <input placeholder="Codigo colegio" value={codigo} onChange={(e) => setCodigo(e.target.value)} />
        <input placeholder="Pagina web" value={web} onChange={(e) => setWeb(e.target.value)} />
        <div className="grid" style={{ gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
          <input placeholder="Director nombre" value={dirNom} onChange={(e) => setDirNom(e.target.value)} />
          <input placeholder="Director apellido" value={dirApe} onChange={(e) => setDirApe(e.target.value)} />
          <input placeholder="Director email" value={dirMail} onChange={(e) => setDirMail(e.target.value)} />
        </div>
        <input placeholder="Curso inicial (opcional)" value={curso} onChange={(e) => setCurso(e.target.value)} />
      </div>
    </Modal>
  );
}
