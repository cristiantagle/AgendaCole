export const metadata = {
  title: 'Agendamiento Colegios',
  description: 'Gestion de colegios, cursos y agenda',
};

import './globals.css';

import Toaster from '@/components/Toaster';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <header className="topbar">
          <div className="brand">
            <span className="logo" aria-hidden="true">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="3" y="4" width="8" height="16" rx="2" fill="#22c55e"/>
                <rect x="13" y="4" width="8" height="16" rx="2" fill="#16a34a"/>
                <path d="M5 8h4M15 8h4" stroke="#0b1220" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </span>
            <h1>Agendamiento Colegios</h1>
          </div>
          <nav className="topbar-nav desktop-nav" aria-label="Navegacion principal">
            <a href="#colegios">Colegios</a>
            <a href="#agenda">Proximos</a>
            <a href="#importar">Importar</a>
          </nav>
          <details className="topbar-nav mobile-nav">
            <summary aria-label="Abrir menu principal">
              <span className="hamburger" aria-hidden="true">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M4 6h16M4 12h16M4 18h16" stroke="#0f172a" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </span>
            </summary>
            <div>
              <a href="#colegios">Colegios</a>
              <a href="#agenda">Proximos agendamientos</a>
              <a href="#importar">Importar/Exportar</a>
            </div>
          </details>
        </header>
        <main className="container">{children}</main>
        <Toaster />
        <footer className="footer"><small>Creado por FireKiring / DegS</small></footer>
      </body>
    </html>
  );
}
