import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { listProducts, listCategories } from '../data'
import ProductCard from '../components/ProductCard'
import ProductModal from '../components/ProductModal'

export default function Home() {
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    let active = true
    Promise.all([listProducts(), listCategories()])
      .then(([prods, cats]) => {
        if (!active) return
        setProducts(prods)
        setCategories(cats)
      })
      .catch((e) => active && setError(e.message || 'Učitavanje nije uspjelo'))
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return products
    return products.filter((p) => p.name.toLowerCase().includes(q))
  }, [products, search])

  return (
    <div className="container">
      <div className="catalogue-toolbar">
        <input
          type="search"
          className="input"
          placeholder="Pretraži proizvode…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {categories.length > 0 && (
        <div className="category-filter">
          {categories.map((c) => (
            <Link key={c.id} to={`/kategorija/${c.id}`} className="chip-btn">
              {c.name}
            </Link>
          ))}
        </div>
      )}

      {loading && <p className="muted">Učitavanje proizvoda…</p>}
      {error && <p className="error">{error}</p>}

      {!loading && !error && filtered.length === 0 && (
        <p className="muted empty-state">
          {products.length === 0
            ? 'Još nema proizvoda. Provjerite uskoro!'
            : 'Nijedan proizvod ne odgovara pretrazi.'}
        </p>
      )}

      <div className="grid">
        {filtered.map((p) => (
          <ProductCard key={p.id} product={p} onOpen={setSelected} />
        ))}
      </div>

      <ProductModal product={selected} onClose={() => setSelected(null)} />
    </div>
  )
}
