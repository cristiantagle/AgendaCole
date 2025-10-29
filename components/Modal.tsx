"use client";
import { ReactNode, useEffect } from 'react';

export function Modal({ isOpen, title, children, onClose, onOk, okText = 'Aceptar' }: { isOpen:boolean; title:string; children:ReactNode; onClose:()=>void; onOk?:()=>void; okText?:string }){
  useEffect(()=>{
    const onKey = (e:KeyboardEvent)=>{ if(e.key==='Escape') onClose(); };
    if (isOpen) window.addEventListener('keydown', onKey);
    return ()=> window.removeEventListener('keydown', onKey);
  }, [isOpen]);
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/50 grid place-items-center p-4 z-50 modal-enter">
      <div className="modal-card w-full max-w-xl bg-[#0b1220] border border-[#1f2937] rounded-2xl p-5 grid gap-3 shadow-2xl">
        <div className="text-lg font-semibold">{title}</div>
        <div>{children}</div>
        <div className="flex gap-2 justify-end">
          <button className="secondary" onClick={onClose}>Cancelar</button>
          {onOk ? <button onClick={onOk}>{okText}</button> : null}
        </div>
      </div>
    </div>
  );
}
