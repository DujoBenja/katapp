import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { listCategories, listProductsByCategories } from '../data'
import CategoryCard from '../components/CategoryCard'
import ProductCard from '../components/ProductCard'
import ProductModal from '../components/ProductModal'

export default function CategoryPage() {
  const { id } = useParams()
  const [category, setCategory] = useState(null)
  const [parent, setParent] = useState(null)
  const [subcategories, setSubcategories] = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    listCategories()
      .then(async (cats) => {
        const cat = cats.find((c) => c.id === id)
        if (!cat) throw new Error('Kategorija ne postoji.')
        const subs = cats.filter((c) => c.parent_id === id)
        // A category page also lists the products of all its subcategories.
        const prods = await listProductsByCategories([id, ...subs.map((s) => s.id)])
        if (!active) return
        setCategory(cat)
        setParent(cats.find((c) => c.id === cat.parent_id) ?? null)
        setSubcategories(subs)
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
      {parent ? (
        <Link to={`/kategorija/${parent.id}`} className="back-link">← Natrag na {parent.name}</Link>
      ) : (
        <Link to="/" className="back-link">← Natrag na kategorije</Link>
      )}
      <h1 className="page-title">{category ? category.name : 'Kategorija'}</h1>

      {subcategories.length > 0 && (
        <div className="grid subcategory-grid">
          {subcategories.map((s) => (
            <CategoryCard key={s.id} category={s} />
          ))}
        </div>
      )}

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
