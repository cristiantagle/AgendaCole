"use client";
import { Modal } from '@/components/Modal';

export default function ConfirmDialog({
  open,
  title = 'Confirmar',
  description,
  confirmText = 'Confirmar',
  onCancel,
  onConfirm,
}: {
  open: boolean;
  title?: string;
  description?: string | JSX.Element;
  confirmText?: string;
  onCancel: () => void;
  onConfirm: () => void | Promise<void>;
}) {
  return (
    <Modal isOpen={open} title={title} onClose={onCancel} onOk={onConfirm} okText={confirmText}>
      {description ? <div className="meta">{description}</div> : null}
    </Modal>
  );
}

