import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getCategory, listProductsByCategory } from '../data'
import ProductCard from '../components/ProductCard'
import ProductModal from '../components/ProductModal'

export default function CategoryPage() {
  const { id } = useParams()
  const [category, setCategory] = useState(null)
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    let active = true
    setLoading(true)
    Promise.all([getCategory(id), listProductsByCategory(id)])
      .then(([cat, prods]) => {
        if (!active) return
        setCategory(cat)
        setProducts(prods)
      })
      .catch((e) => active && setError(e.message || 'Učitavanje nije uspjelo'))
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [id])

  return (
    <div className="container">
      <Link to="/" className="back-link">← Natrag na kategorije</Link>
      <h1 className="page-title">{category ? category.name : 'Kategorija'}</h1>

      {loading && <p className="muted">Učitavanje…</p>}
      {error && <p className="error">{error}</p>}

      {!loading && !error && products.length === 0 && (
        <p className="muted empty-state">Nema proizvoda u ovoj kategoriji.</p>
      )}

      <div className="grid">
        {products.map((p) => (
          <ProductCard key={p.id} product={p} onOpen={setSelected} />
        ))}
      </div>

      <ProductModal product={selected} onClose={() => setSelected(null)} />
    </div>
  )
}
