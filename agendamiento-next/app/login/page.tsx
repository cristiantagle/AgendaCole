'use client';
import { useEffect, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase-browser';

export default function LoginPage(){
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [info, setInfo] = useState<string>('');

  async function signIn(){
    try{
      const sb = supabaseBrowser();
      const { data, error } = await sb.auth.signInWithPassword({ email, password });
      if (error) { setInfo(error.message); return; }
      const token = data.session?.access_token; if (token) localStorage.setItem('sb_token', token);
      location.href = '/';
    }catch(e:any){ setInfo(e.message||'Error'); }
  }

  async function signUp(){
    try{
      const sb = supabaseBrowser();
      const { data, error } = await sb.auth.signUp({ email, password });
      if (error) { setInfo(error.message); return; }
      setInfo('Usuario creado. Por favor verifica tu correo e inicia sesión.');
    }catch(e:any){ setInfo(e.message||'Error'); }
  }

  return (
    <div className="grid max-w-md mx-auto">
      <h2 style={{margin:0}}>Iniciar sesión</h2>
      <input placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} />
      <input placeholder="Contraseña" type="password" value={password} onChange={e=>setPassword(e.target.value)} />
      <div className="flex gap-2">
        <button onClick={signIn}>Entrar</button>
        <button className="secondary" onClick={signUp}>Crear cuenta</button>
      </div>
      {info ? <div className="meta">{info}</div> : null}
    </div>
  );
}

