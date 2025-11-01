"use client";

import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { Modal } from "@/components/Modal";
import { toast } from "@/lib/toast";
import SchoolDetail from "@/components/SchoolDetail";
import CourseAgenda from "@/components/CourseAgenda";
import AddSchoolModal from "@/components/AddSchoolModal";
import ConfirmDialog from "@/components/ConfirmDialog";
import EditAppointmentModal from "@/components/EditAppointmentModal";

type School = {
  id: string;
  nombre: string;
  telefono?: string;
  correo?: string;
  estado?: "no_contactado" | "contactado";
  comentarios?: string;
  codigo_colegio?: string | null;
  pagina_web?: string | null;
  director_nombre?: string | null;
  director_apellido?: string | null;
  director_email?: string | null;
  direccion?: string | null;
};

type Upcoming = {
  id: string;
  tipo: "llamada" | "visita";
  fecha: string;
  hora: string;
  colegio?: string;
  curso?: string;
  descripcion?: string;
};

const absWeb = (url?: string | null) => {
  const u = String(url || "").trim();
  if (!u) return "";
  return /^https?:\/\//i.test(u) ? u : `https://${u}`;
};

export default function Page() {
  const [schools, setSchools] = useState<School[]>([]);
  const [upcoming, setUpcoming] = useState<Upcoming[]>([]);
  const [q, setQ] = useState("");
  const [estado, setEstado] = useState<"todos" | "contactado" | "no_contactado">("todos");
  const [sort, setSort] = useState<"nombre" | "estado">("nombre");
  const [loading, setLoading] = useState(false);

  const [impOpen, setImpOpen] = useState(false);
  const [impFile, setImpFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<{ nombre: string; curso: string; codigo: string }>({
    nombre: "",
    curso: "",
    codigo: "",
  });

  const [detailId, setDetailId] = useState<string>("");
  const [courseModal, setCourseModal] = useState<string>("");
  const [addOpen, setAddOpen] = useState(false);
  const [confirmSchoolId, setConfirmSchoolId] = useState("");
  const [confirmApptId, setConfirmApptId] = useState("");
  const [editAppt, setEditAppt] = useState<{ id: string; fecha: string; hora: string } | null>(null);

  const [wazeFor, setWazeFor] = useState<{ id: string; nombre: string } | null>(null);
  const [wazeAddress, setWazeAddress] = useState("");

  const [mobilePanelOpen, setMobilePanelOpen] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        q,
        estado,
        sort,
      });
      const res = await fetch(`/api/schools?${params.toString()}`, { cache: "no-store" });
      if (!res.ok) throw new Error("No se pudo cargar la lista");
      const json = await res.json();
      setSchools(json.data || []);
    } catch (err: any) {
      toast(err?.message || "Error al cargar colegios", "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, estado, sort]);

  async function loadUpcoming() {
    try {
      const res = await fetch(`/api/appointments?limit=50`);
      if (!res.ok) throw new Error("No se pudo cargar la agenda");
      const json = await res.json();
      setUpcoming(json.data || []);
    } catch (err: any) {
      toast(err?.message || "Error al cargar la agenda", "error");
    }
  }

  useEffect(() => {
    loadUpcoming();
  }, []);

  useEffect(() => {
    const sb = supabaseBrowser();
    const ch = sb
      .channel("realtime:colegios")
      .on("postgres_changes", { event: "*", schema: "public", table: "colegios" }, () => load())
      .subscribe();
    return () => {
      sb.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function toggleEstado(id: string) {
    const current = schools.find((s) => s.id === id);
    if (!current) return;
    const next = current.estado === "contactado" ? "no_contactado" : "contactado";
    await fetch(`/api/schools/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ estado: next }),
    });
    load();
  }

  function remove(id: string) {
    setConfirmSchoolId(id);
  }

  function openWazeSetup(s: School) {
    setWazeFor({ id: s.id, nombre: s.nombre });
    try {
      const saved = localStorage.getItem(`waze-address:${s.id}`);
      if (saved) {
        setWazeAddress(saved);
        return;
      }
    } catch {
      /* ignore */
    }
    setWazeAddress(s.direccion || "");
  }

  async function saveAndOpenWaze() {
    const address = wazeAddress.trim();
    if (!address) {
      toast("Ingresa una dirección completa", "warning");
      return;
    }
    if (wazeFor) {
      try {
        localStorage.setItem(`waze-address:${wazeFor.id}`, address);
      } catch {
        /* ignore */
      }
      fetch(`/api/schools/${wazeFor.id}`, {
        method: "PATCH",
        body: JSON.stringify({ direccion: address }),
      }).catch(() => {
        /* ignore */
      });
      setSchools(prev => prev.map(s => (s.id === wazeFor.id ? { ...s, direccion: address } : s)));
      const url = `https://waze.com/ul?q=${encodeURIComponent(address)}`;
      window.open(url, "_blank");
    }
    setWazeFor(null);
  }

  async function confirmDeleteAppt() {
    if (!confirmApptId) return;
    await fetch(`/api/appointments/${confirmApptId}`, { method: "DELETE" });
    setConfirmApptId("");
    loadUpcoming();
  }

  async function confirmRemoveSchool() {
    if (!confirmSchoolId) return;
    const res = await fetch(`/api/schools/${confirmSchoolId}`, { method: "DELETE" });
    setConfirmSchoolId("");
    if (!res.ok) {
      toast("No se pudo eliminar el colegio", "error");
      return;
    }
    toast("Colegio eliminado", "success");
    load();
  }

  async function openImport(file: File) {
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows: any[] = XLSX.utils.sheet_to_json(ws, { defval: "", header: 1 });
      const hdrs = rows[0] || [];
      setHeaders((hdrs as any[]).map((h) => String(h)));
      setImpFile(file);
      setImpOpen(true);
    } catch {
      toast("No se pudo leer el archivo", "error");
    }
  }

  async function doImport() {
    if (!impFile) return;
    const fd = new FormData();
    fd.append("file", impFile);
    fd.append("mapping", JSON.stringify(mapping));
    const res = await fetch("/api/import", { method: "POST", body: fd });
    if (!res.ok) {
      toast("Error al importar", "error");
      return;
    }
    toast("Importación completada", "success");
    setImpOpen(false);
    setImpFile(null);
    load();
  }

  function exportColegios() {
    const wb = XLSX.utils.book_new();
    const data = schools.map((s) => ({
      ...s,
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, "Colegios");
    const buffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "colegios.xlsx";
    a.click();
    URL.revokeObjectURL(url);
  }

  const filterFields = useMemo(
    () => (
      <div className="filters-grid">
        <input
          placeholder="Buscar por nombre, código, director, teléfono, correo o web"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select value={estado} onChange={(e) => setEstado(e.target.value as any)}>
          <option value="todos">Todos</option>
          <option value="contactado">Contactado</option>
          <option value="no_contactado">No contactado</option>
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value as any)}>
          <option value="nombre">Orden: Alfabético</option>
          <option value="estado">Orden: Estado</option>
        </select>
      </div>
    ),
    [estado, q, sort]
  );

  const actionButtons = useMemo(
    () => (
      <div className="actions-bar" id="importar">
        <button onClick={() => setAddOpen(true)}>Agregar colegio</button>
        <label className="secondary file-button">
          Importar Excel
          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              await openImport(file);
              e.target.value = "";
            }}
          />
        </label>
        <button className="ghost" onClick={exportColegios}>
          Exportar
        </button>
      </div>
    ),
    []
  );

  return (
    <>
      <div className="page-grid">
        <section className="card upcoming" id="agenda">
          <header className="section-head">
            <h2>Próximos Agendamientos</h2>
          </header>
          <div className="list">
            {upcoming.map((a) => (
              <div className="item" key={a.id}>
                <div>
                  <div className="item-main">
                    <span className={`badge type ${a.tipo}`}>{a.tipo === "llamada" ? "Llamada" : "Visita"}</span>
                    <strong>{a.colegio}</strong>
                    {a.curso ? <span className="badge course">Curso: {a.curso}</span> : null}
                    <span className="meta">
                      {a.fecha} {a.hora}
                    </span>
                  </div>
                  {a.descripcion ? <div className="meta">{a.descripcion}</div> : null}
                </div>
                <div className="item-actions">
                  <button className="secondary" onClick={() => setEditAppt({ id: a.id, fecha: a.fecha, hora: a.hora })}>
                    Editar
                  </button>
                  <button className="danger" onClick={() => setConfirmApptId(a.id)}>
                    Eliminar
                  </button>
                </div>
              </div>
            ))}
            {!upcoming.length && <div className="meta">Sin Agendamientos próximos</div>}
          </div>
        </section>

        <section className="filters-wrap" id="colegios">
          <div className="desktop-only">
            {filterFields}
            {actionButtons}
          </div>
          <div className="mobile-only">
            <button className="secondary full" onClick={() => setMobilePanelOpen(true)}>
              Buscar y acciones
            </button>
          </div>
        </section>

        {loading && <div className="meta">Cargando…</div>}

        <section className="cards" aria-live="polite">
          {schools.map((s) => (
            <article className="card school-card" key={s.id}>
              <div className="card-header">
                <h3>{s.nombre}</h3>
                <span className="badge status">{s.estado === "contactado" ? "Contactado" : "No contactado"}</span>
              </div>
              <div className="card-body">
                {s.direccion ? <div className="meta">{s.direccion}</div> : null}
                {s.telefono ? (
                  <div className="row link-row">
                    <a href={`tel:${s.telefono}`}>{s.telefono}</a>
                  </div>
                ) : null}
                {s.pagina_web ? (
                  <div className="row link-row">
                    <a target="_blank" rel="noreferrer" href={absWeb(s.pagina_web)}>
                      {s.pagina_web}
                    </a>
                  </div>
                ) : null}
                {s.correo ? (
                  <div className="row link-row">
                    <a href={`mailto:${s.correo}`}>{s.correo}</a>
                  </div>
                ) : null}
                {s.director_nombre || s.director_apellido ? (
                  <div className="meta">
                    Director: {(s.director_nombre || "") + " " + (s.director_apellido || "")}
                  </div>
                ) : null}
                {s.director_email ? (
                  <div className="meta">
                    Director: <a href={`mailto:${s.director_email}`}>{s.director_email}</a>
                  </div>
                ) : null}
              </div>
              <div className="card-actions">
                <button className="ghost icon-only" onClick={() => openWazeSetup(s)} title="Abrir en Waze">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path
                      d="M12 3c4.418 0 8 2.91 8 6.5 0 2.2-1.33 3.96-3.03 5.02-.2 1.08-.78 2.1-1.62 2.94-1.56 1.56-3.74 2.36-5.94 2.02-.42-.06-.78-.38-.9-.79l-.28-.94c-.1-.32-.4-.55-.74-.55H5.5c-1.38 0-2.5-1.12-2.5-2.5V12c0-4.59 3.582-9 9-9Z"
                      stroke="#0f172a"
                      strokeWidth="1.5"
                    />
                    <circle cx="9" cy="11" r="1" fill="#0f172a" />
                    <circle cx="14" cy="11" r="1" fill="#0f172a" />
                  </svg>
                </button>
                <button className="secondary" onClick={() => toggleEstado(s.id)}>
                  {s.estado === "contactado" ? "Marcar no contactado" : "Marcar contactado"}
                </button>
                <button onClick={() => setDetailId(s.id)}>Ver detalle</button>
                <button className="danger" onClick={() => remove(s.id)}>
                  Eliminar
                </button>
              </div>
            </article>
          ))}
          {!schools.length && !loading && <div className="meta">No hay colegios para mostrar</div>}
        </section>
      </div>

      <Modal
        isOpen={mobilePanelOpen}
        title="Buscar y acciones"
        onClose={() => setMobilePanelOpen(false)}
        onOk={() => setMobilePanelOpen(false)}
        okText="Listo"
      >
        <div className="grid" style={{ gap: 12 }}>
          {filterFields}
          {actionButtons}
        </div>
      </Modal>

      <Modal isOpen={impOpen} title="Importar desde Excel" onClose={() => setImpOpen(false)} onOk={doImport} okText="Importar">
        <div className="grid" style={{ gap: 8 }}>
          <div className="meta">Selecciona las columnas. Curso y código son opcionales.</div>
          <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <label>
              Nombre colegio
              <select value={mapping.nombre} onChange={(e) => setMapping({ ...mapping, nombre: e.target.value })}>
                <option value="">- Ninguno -</option>
                {headers.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Curso (opcional)
              <select value={mapping.curso} onChange={(e) => setMapping({ ...mapping, curso: e.target.value })}>
                <option value="">- Ninguno -</option>
                {headers.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Código colegio (opcional)
              <select value={mapping.codigo} onChange={(e) => setMapping({ ...mapping, codigo: e.target.value })}>
                <option value="">- Ninguno -</option>
                {headers.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
      </Modal>

      <SchoolDetail
        schoolId={detailId}
        open={Boolean(detailId)}
        onClose={() => setDetailId("")}
        onOpenCourse={(cid) => setCourseModal(cid)}
      />
      <CourseAgenda courseId={courseModal} open={Boolean(courseModal)} onClose={() => setCourseModal("")} />
      <AddSchoolModal open={addOpen} onClose={() => setAddOpen(false)} onAdded={() => load()} />

      <ConfirmDialog
        open={Boolean(confirmSchoolId)}
        title="Eliminar colegio"
        description="¿Seguro que deseas eliminar este colegio y todos sus datos asociados?"
        confirmText="Eliminar"
        onCancel={() => setConfirmSchoolId("")}
        onConfirm={confirmRemoveSchool}
      />
      <ConfirmDialog
        open={Boolean(confirmApptId)}
        title="Eliminar Agendamiento"
        description="¿Seguro que deseas eliminar este Agendamiento?"
        confirmText="Eliminar"
        onCancel={() => setConfirmApptId("")}
        onConfirm={confirmDeleteAppt}
      />
      <EditAppointmentModal open={Boolean(editAppt)} appt={editAppt} onClose={() => setEditAppt(null)} onSaved={loadUpcoming} />

      <Modal
        isOpen={Boolean(wazeFor)}
        title="Abrir en Waze"
        onClose={() => setWazeFor(null)}
        onOk={saveAndOpenWaze}
        okText="Abrir"
      >
        <div className="grid" style={{ gap: 10 }}>
          <div className="meta">Colegio: {wazeFor?.nombre || ""}</div>
          <input placeholder="Dirección completa" value={wazeAddress} onChange={(e) => setWazeAddress(e.target.value)} />
          <div className="meta">La dirección se guarda para este colegio y se usará la próxima vez.</div>
        </div>
      </Modal>
    </>
  );
}

