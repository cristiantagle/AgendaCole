"use client";
import { useEffect, useState } from "react";

export default function HeaderAuth() {
  const [hasToken, setHasToken] = useState<boolean>(false);
  useEffect(() => {
    setHasToken(Boolean(localStorage.getItem("sb_token")));
  }, []);
  return (
    <div style={{ display: "flex", gap: 8 }}>
      {hasToken ? (
        <>
          <a href="/" className="secondary" style={{ padding: "10px 12px", borderRadius: 8 }}>
            Dashboard
          </a>
          <button
            onClick={() => {
              localStorage.removeItem("sb_token");
              location.reload();
            }}
          >
            Salir
          </button>
        </>
      ) : (
        <a href="/login" className="secondary" style={{ padding: "10px 12px", borderRadius: 8 }}>
          Iniciar sesión
        </a>
      )}
    </div>
  );
}

