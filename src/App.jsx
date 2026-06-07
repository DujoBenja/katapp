import { Link, Route, Routes, useNavigate } from 'react-router-dom'
import { useAuth, ProtectedRoute } from './auth'
import { supabase } from './supabase'
import Home from './pages/Home'
import CategoryPage from './pages/CategoryPage'
import Login from './pages/Login'
import Admin from './pages/Admin'

function Header() {
  const { session } = useAuth()
  const navigate = useNavigate()

  async function logout() {
    await supabase.auth.signOut()
    navigate('/login')
  }

  return (
    <header className="site-header">
      <Link to="/" className="brand">🛍️ Pivska tvrđa</Link>
      <nav className="nav">
        <Link to="/">Katalog</Link>
        {session ? (
          <>
            <Link to="/admin">Administracija</Link>
            <button className="btn btn-ghost" onClick={logout}>Odjava</button>
          </>
        ) : (
          <Link to="/login">Prijava</Link>
        )}
      </nav>
    </header>
  )
}

export default function App() {
  return (
    <div className="app">
      <Header />
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/kategorija/:id" element={<CategoryPage />} />
          <Route path="/login" element={<Login />} />
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <Admin />
              </ProtectedRoute>
            }
          />
        </Routes>
      </main>
      <footer className="site-footer">
        <div className="footer-cols">
          <div className="footer-col footer-brand">
            <h3>🛍️ Pivska tvrđa</h3>
            <p>Naša ponuda proizvoda na jednom mjestu.</p>
          </div>
          <div className="footer-col">
            <h4>Tvrtka</h4>
            <p>PIVSKA TVRĐA j.d.o.o.</p>
            <p>Dragašev prolaz 10<br />21230 Sinj, Hrvatska</p>
            <p>OIB: 38720825556</p>
          </div>
          <div className="footer-col">
            <h4>Kontakt</h4>
            <p><span className="fi" aria-hidden="true">📞</span><a href="tel:+385911210508">091 1210 508</a></p>
            <p><span className="fi" aria-hidden="true">📞</span><a href="tel:+385911210500">091 1210 500</a></p>
            <p><span className="fi" aria-hidden="true">✉️</span><a href="mailto:stipe.sepcek@gmail.com">stipe.sepcek@gmail.com</a></p>
          </div>
        </div>
        <div className="footer-eu">
          <img src="/hamag-eu.png" alt="Sufinancirano sredstvima HAMAG-BICRO i Europske unije" />
        </div>
        <div className="footer-bottom">
          © {new Date().getFullYear()} PIVSKA TVRĐA j.d.o.o. — Sva prava pridržana.
        </div>
      </footer>
    </div>
  )
}
