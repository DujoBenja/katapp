import { useEffect, useState } from 'react'
import { buildCategoryTree } from '../data'

const empty = { name: '', description: '', price: '', category_id: '', is_featured: false }

// `product` is set when editing; null/undefined when creating.
export default function ProductForm({ product, categories, onSubmit, onCancel }) {
  const [fields, setFields] = useState(empty)
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (product) {
      setFields({
        name: product.name ?? '',
        description: product.description ?? '',
        price: product.price ?? '',
        category_id: product.category_id ?? '',
        is_featured: !!product.is_featured,
      })
      setPreview(product.image_url ?? null)
    } else {
      setFields(empty)
      setPreview(null)
    }
    setFile(null)
  }, [product])

  function update(key, value) {
    setFields((f) => ({ ...f, [key]: value }))
  }

  function handleFile(e) {
    const f = e.target.files?.[0] ?? null
    setFile(f)
    setPreview(f ? URL.createObjectURL(f) : product?.image_url ?? null)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!fields.name.trim()) {
      setError('Naziv je obavezan.')
      return
    }
    setError('')
    setBusy(true)
    try {
      await onSubmit({
        ...fields,
        file,
        image_url: product?.image_url ?? null,
        featured_at: product?.featured_at ?? null,
      })
      if (!product) {
        // Reset after a successful create.
        setFields(empty)
        setFile(null)
        setPreview(null)
      }
    } catch (err) {
      setError(err.message || 'Spremanje proizvoda nije uspjelo')
    } finally {
      setBusy(false)
    }
  }

  const noCategories = categories.length === 0

  return (
    <form className="form card-form" onSubmit={handleSubmit}>
      <h3>{product ? 'Uredi proizvod' : 'Dodaj proizvod'}</h3>

      <label>
        Naziv
        <input
          className="input"
          value={fields.name}
          onChange={(e) => update('name', e.target.value)}
          required
        />
      </label>

      <label>
        Opis
        <textarea
          className="input"
          rows={3}
          value={fields.description}
          onChange={(e) => update('description', e.target.value)}
        />
      </label>

      <div className="form-row">
        <label>
          Cijena (€)
          <input
            className="input"
            type="number"
            min="0"
            step="0.01"
            value={fields.price}
            onChange={(e) => update('price', e.target.value)}
          />
        </label>

        <label>
          Kategorija
          <select
            className="input"
            value={fields.category_id}
            onChange={(e) => update('category_id', e.target.value)}
          >
            <option value="">
              {noCategories ? 'Prvo dodajte kategoriju' : 'Bez kategorije'}
            </option>
            {buildCategoryTree(categories).flatMap((c) => [
              <option key={c.id} value={c.id}>
                {c.name}
              </option>,
              ...c.children.map((s) => (
                <option key={s.id} value={s.id}>
                  {'   ↳ '}{s.name}
                </option>
              )),
            ])}
          </select>
        </label>
      </div>

      <label className="checkbox-label">
        <input
          type="checkbox"
          checked={fields.is_featured}
          onChange={(e) => update('is_featured', e.target.checked)}
        />
        ★ Omiljeni proizvod (prikazuje se prvi)
      </label>

      <label>
        Slika
        <input type="file" accept="image/*" onChange={handleFile} />
      </label>

      {preview && (
        <img className="form-preview" src={preview} alt="pregled" />
      )}

      {error && <p className="error">{error}</p>}

      <div className="form-actions">
        <button className="btn btn-primary" type="submit" disabled={busy}>
          {busy ? 'Spremanje…' : product ? 'Spremi promjene' : 'Dodaj proizvod'}
        </button>
        {product && (
          <button className="btn btn-ghost" type="button" onClick={onCancel}>
            Odustani
          </button>
        )}
      </div>
    </form>
  )
}
