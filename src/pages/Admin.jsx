import { useEffect, useState } from 'react'
import {
  listCategories,
  listProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  setProductFeatured,
  categoryLabel,
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
  const [search, setSearch] = useState('')

  const q = search.trim().toLowerCase()
  const visibleProducts = q
    ? products.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          categoryLabel(p.categories).toLowerCase().includes(q)
      )
    : products

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

  async function handleToggleFeatured(product) {
    try {
      await setProductFeatured(product.id, !product.is_featured)
      await refresh()
    } catch (e) {
      setError(e.message || 'Spremanje nije uspjelo')
    }
  }

  // Close the edit dialog on Escape and lock background scroll while it's open.
  useEffect(() => {
    if (!editing) return
    function onKey(e) {
      if (e.key === 'Escape') setEditing(null)
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [editing])

  if (loading) return <div className="container loading">Učitavanje…</div>

  return (
    <div className="container">
      <h1>Administracija</h1>
      {error && <p className="error">{error}</p>}

      {/* Product form on the left, categories on the right (stacked on narrow screens). */}
      <div className="admin-columns">
        <section className="panel">
          <h2>Dodaj proizvod</h2>
          <ProductForm categories={categories} onSubmit={handleCreate} />
        </section>

        <CategoryManager categories={categories} onChange={refresh} />
      </div>

      <section className="panel">
        <h2>
          Proizvodi ({q ? `${visibleProducts.length} od ${products.length}` : products.length})
        </h2>
        {products.length > 0 && (
          <input
            type="search"
            className="input admin-search"
            placeholder="Pretraži po nazivu ili kategoriji…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        )}
        {products.length === 0 ? (
          <p className="muted">Još nema proizvoda. Dodajte prvi iznad.</p>
        ) : visibleProducts.length === 0 ? (
          <p className="muted">Nijedan proizvod ne odgovara pretrazi.</p>
        ) : (
          <ul className="admin-list">
            {visibleProducts.map((p) => (
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
                    {p.categories ? ` · ${categoryLabel(p.categories)}` : ''}
                  </span>
                </div>
                <div className="admin-actions">
                  <button
                    className={`btn btn-ghost star-btn${p.is_featured ? ' active' : ''}`}
                    title={p.is_featured ? 'Makni iz omiljenih' : 'Označi kao omiljeni'}
                    aria-pressed={!!p.is_featured}
                    onClick={() => handleToggleFeatured(p)}
                  >
                    {p.is_featured ? '★' : '☆'}
                  </button>
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

      {/* Edit dialog over the list, so editing works wherever the list is scrolled.
          Clicking the backdrop doesn't close it, to avoid losing unsaved changes. */}
      {editing && (
        <div className="modal-overlay">
          <div className="modal edit-modal" role="dialog" aria-modal="true">
            <button className="modal-close" onClick={() => setEditing(null)} aria-label="Zatvori">
              ✕
            </button>
            <h2 className="edit-modal-title">Uredi proizvod</h2>
            <ProductForm
              key={editing.id}
              product={editing}
              categories={categories}
              onSubmit={handleUpdate}
              onCancel={() => setEditing(null)}
            />
          </div>
        </div>
      )}
    </div>
  )
}
