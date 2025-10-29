"use client";
import { useEffect, useState } from 'react';

type ToastItem = { id: string; message: string; type?: 'info'|'success'|'error'|'warning' };

export default function Toaster(){
  const [items, setItems] = useState<ToastItem[]>([]);
  useEffect(()=>{
    function onEvt(e: Event){
      const ce = e as CustomEvent; const d = ce.detail || {}; const id = Math.random().toString(36).slice(2,9);
      const item: ToastItem = { id, message: d.message || '', type: d.type || 'info' };
      setItems(prev => [...prev, item]);
      setTimeout(()=> setItems(prev => prev.filter(x=>x.id!==id)), 2600);
    }
    window.addEventListener('app:toast', onEvt as any);
    return ()=> window.removeEventListener('app:toast', onEvt as any);
  }, []);
  const bg = (t?:string) => t==='success' ? 'bg-emerald-500' : t==='error' ? 'bg-rose-500' : t==='warning' ? 'bg-amber-500' : 'bg-slate-700';
  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 grid gap-2">
      {items.map(it => (
        <div key={it.id} className={`text-sm text-white px-3 py-2 rounded-lg shadow-lg ${bg(it.type)}`}>{it.message}</div>
      ))}
    </div>
  );
}

