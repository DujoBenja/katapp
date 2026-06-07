import { useEffect, useState } from 'react'
import {
  listCategories,
  listProducts,
  createProduct,
  updateProduct,
  deleteProduct,
} from '../data'
import { formatEUR } from '../format'
import CategoryManager from '../components/CategoryManager'
import ProductForm from '../components/ProductForm'

export default function Admin() {
  const [categories, setCategories] = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState(null) // product being edited, or null

  async function refresh() {
    const [cats, prods] = await Promise.all([listCategories(), listProducts()])
    setCategories(cats)
    setProducts(prods)
  }

  useEffect(() => {
    refresh()
      .catch((e) => setError(e.message || 'Učitavanje podataka nije uspjelo'))
      .finally(() => setLoading(false))
  }, [])

  async function handleCreate(values) {
    await createProduct(values)
    await refresh()
  }

  async function handleUpdate(values) {
    await updateProduct(editing.id, values)
    setEditing(null)
    await refresh()
  }

  async function handleDelete(product) {
    if (!confirm(`Obrisati "${product.name}"?`)) return
    try {
      await deleteProduct(product)
      await refresh()
    } catch (e) {
      setError(e.message || 'Brisanje proizvoda nije uspjelo')
    }
  }

  if (loading) return <div className="container loading">Učitavanje…</div>

  return (
    <div className="container">
      <h1>Administracija</h1>
      {error && <p className="error">{error}</p>}

      <CategoryManager categories={categories} onChange={refresh} />

      <section className="panel">
        <h2>{editing ? 'Uredi proizvod' : 'Dodaj proizvod'}</h2>
        <ProductForm
          key={editing?.id ?? 'new'}
          product={editing}
          categories={categories}
          onSubmit={editing ? handleUpdate : handleCreate}
          onCancel={() => setEditing(null)}
        />
      </section>

      <section className="panel">
        <h2>Proizvodi ({products.length})</h2>
        {products.length === 0 ? (
          <p className="muted">Još nema proizvoda. Dodajte prvi iznad.</p>
        ) : (
          <ul className="admin-list">
            {products.map((p) => (
              <li key={p.id} className="admin-row">
                <div className="admin-thumb">
                  {p.image_url ? (
                    <img src={p.image_url} alt={p.name} />
                  ) : (
                    <span className="placeholder">—</span>
                  )}
                </div>
                <div className="admin-info">
                  <strong>{p.name}</strong>
                  <span className="muted">
                    {formatEUR(p.price)}
                    {p.categories?.name ? ` · ${p.categories.name}` : ''}
                  </span>
                </div>
                <div className="admin-actions">
                  <button className="btn btn-ghost" onClick={() => setEditing(p)}>
                    Uredi
                  </button>
                  <button
                    className="btn btn-danger"
                    onClick={() => handleDelete(p)}
                  >
                    Obriši
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
