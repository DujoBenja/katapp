import { useEffect, useMemo, useState } from 'react'
import { listProducts, listCategories } from '../data'
import CategoryCard from '../components/CategoryCard'
import ProductCard from '../components/ProductCard'
import ProductModal from '../components/ProductModal'

// Category grid plus featured products; typing in search switches to product results.
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

  const q = search.trim().toLowerCase()
  const results = useMemo(
    () => (q ? products.filter((p) => p.name.toLowerCase().includes(q)) : []),
    [products, q]
  )
  // listProducts already returns featured first, most recently starred first.
  const featured = products.filter((p) => p.is_featured)
  const topCategories = categories.filter((c) => !c.parent_id)

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

      {loading && <p className="muted">Učitavanje…</p>}
      {error && <p className="error">{error}</p>}

      {!loading && !error && q && (
        <>
          {results.length === 0 ? (
            <p className="muted empty-state">Nijedan proizvod ne odgovara pretrazi.</p>
          ) : (
            <div className="grid">
              {results.map((p) => (
                <ProductCard key={p.id} product={p} onOpen={setSelected} />
              ))}
            </div>
          )}
        </>
      )}

      {!loading && !error && !q && (
        <>
          {topCategories.length === 0 ? (
            <p className="muted empty-state">Još nema kategorija. Provjerite uskoro!</p>
          ) : (
            <div className="grid">
              {topCategories.map((c) => (
                <CategoryCard key={c.id} category={c} />
              ))}
            </div>
          )}

          {featured.length > 0 && (
            <section className="home-section">
              <h2 className="section-title">Izdvojeno</h2>
              <div className="grid">
                {featured.map((p) => (
                  <ProductCard key={p.id} product={p} onOpen={setSelected} />
                ))}
              </div>
            </section>
          )}
        </>
      )}

      <ProductModal product={selected} onClose={() => setSelected(null)} />
    </div>
  )
}
