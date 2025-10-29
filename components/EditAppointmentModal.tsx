"use client";
import { useEffect, useState } from 'react';
import { Modal } from '@/components/Modal';
import { toast } from '@/lib/toast';

export default function EditAppointmentModal({
  open,
  appt,
  onClose,
  onSaved,
}: {
  open: boolean;
  appt: { id: string; fecha: string; hora: string } | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [fecha, setFecha] = useState('');
  const [hora, setHora] = useState('');
  useEffect(() => {
    setFecha(appt?.fecha || '');
    setHora(appt?.hora || '');
  }, [appt?.id, open]);

  async function save() {
    if (!appt) return;
    if (!fecha || !hora) { toast('Completa fecha y hora', 'warning'); return; }
    const r = await fetch(`/api/appointments/${appt.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fecha, hora }),
    });
    if (!r.ok) { toast('No se pudo guardar', 'error'); return; }
    toast('Agendamiento actualizado', 'success');
    onSaved();
    onClose();
  }

  return (
    <Modal isOpen={open} title="Editar agendamiento" onClose={onClose} onOk={save} okText="Guardar cambios">
      <div className="grid" style={{ gap: 10 }}>
        <input type="date" value={fecha} onChange={e=>setFecha(e.target.value)} />
        <input type="time" value={hora} onChange={e=>setHora(e.target.value)} />
      </div>
    </Modal>
  );
}

