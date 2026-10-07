import { useState } from 'react'
import { buildCategoryTree, createCategory, deleteCategory, updateCategory } from '../data'

function normalize(s) {
  return s.trim().toLocaleLowerCase('hr')
}

// Unique-constraint violations come back as Postgres error code 23505.
function saveErrorMessage(err, duplicateMessage, fallback) {
  return err.code === '23505' ? duplicateMessage : err.message || fallback
}

// Inline editor shown in place of a category chip: name + image.
function CategoryEditor({ category, onSaved, onCancel }) {
  const [name, setName] = useState(category.name)
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(category.image_url ?? null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  function handleFile(e) {
    const f = e.target.files?.[0] ?? null
    setFile(f)
    setPreview(f ? URL.createObjectURL(f) : category.image_url ?? null)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!name.trim()) {
      setError('Naziv je obavezan.')
      return
    }
    setError('')
    setBusy(true)
    try {
      await updateCategory(category.id, { name, file, image_url: category.image_url })
      await onSaved()
    } catch (err) {
      setError(saveErrorMessage(err, 'Kategorija s tim nazivom već postoji.', 'Spremanje nije uspjelo'))
      setBusy(false)
    }
  }

  return (
    <form className="form category-editor" onSubmit={handleSubmit}>
      <label>
        Naziv
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
      </label>
      <label>
        Slika
        <input type="file" accept="image/*" onChange={handleFile} />
      </label>
      {preview && <img className="form-preview" src={preview} alt="pregled" />}
      {error && <p className="error">{error}</p>}
      <div className="form-actions">
        <button className="btn btn-primary" type="submit" disabled={busy}>
          {busy ? 'Spremanje…' : 'Spremi'}
        </button>
        <button className="btn btn-ghost" type="button" onClick={onCancel}>
          Odustani
        </button>
      </div>
    </form>
  )
}

export default function CategoryManager({ categories, onChange }) {
  const [name, setName] = useState('')
  const [subName, setSubName] = useState('')
  const [file, setFile] = useState(null)
  const [fileKey, setFileKey] = useState(0) // bump to clear the file input
  const [editingId, setEditingId] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const tree = buildCategoryTree(categories)
  // Typing the name of an existing top-level category switches the form to
  // adding a subcategory under it.
  const existing = name.trim() ? tree.find((c) => normalize(c.name) === normalize(name)) : null

  async function handleAdd(e) {
    e.preventDefault()
    const trimmed = (existing ? subName : name).trim()
    if (!trimmed) return
    setError('')
    setBusy(true)
    try {
      await createCategory(trimmed, existing?.id, file)
      if (existing) setSubName('')
      else setName('')
      setFile(null)
      setFileKey((k) => k + 1)
      await onChange()
    } catch (err) {
      setError(
        saveErrorMessage(
          err,
          existing ? `Potkategorija „${subName.trim()}” već postoji.` : 'Ta kategorija već postoji.',
          'Dodavanje kategorije nije uspjelo'
        )
      )
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete(category) {
    if (!confirm('Obrisati ovu kategoriju? Njezini proizvodi postat će "Bez kategorije".')) {
      return
    }
    setError('')
    try {
      await deleteCategory(category)
      await onChange()
    } catch (err) {
      // Foreign-key violation (23503): the category still has subcategories.
      setError(
        err.code === '23503'
          ? 'Kategorija ima potkategorije. Prvo obrišite njih.'
          : err.message || 'Brisanje kategorije nije uspjelo'
      )
    }
  }

  function item(c) {
    if (editingId === c.id) {
      return (
        <CategoryEditor
          category={c}
          onSaved={async () => {
            setEditingId(null)
            await onChange()
          }}
          onCancel={() => setEditingId(null)}
        />
      )
    }
    return (
      <span className="chip">
        {c.image_url && <img className="chip-thumb" src={c.image_url} alt="" />}
        {c.name}
        <button className="chip-x" title="Uredi kategoriju" onClick={() => setEditingId(c.id)}>
          ✎
        </button>
        <button className="chip-x" title="Obriši kategoriju" onClick={() => handleDelete(c)}>
          ✕
        </button>
      </span>
    )
  }

  return (
    <section className="panel">
      <h2>Kategorije</h2>
      <p className="muted">
        Prvo izradite kategoriju, zatim joj dodijelite proizvode. Za potkategoriju upišite
        naziv postojeće kategorije.
      </p>

      <form className="category-add" onSubmit={handleAdd}>
        <div className="inline-form category-form">
          <input
            className="input"
            placeholder="Naziv nove kategorije"
            list="category-names"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <datalist id="category-names">
            {tree.map((c) => (
              <option key={c.id} value={c.name} />
            ))}
          </datalist>
          {existing && (
            <input
              className="input"
              placeholder={`Naziv potkategorije za „${existing.name}”`}
              value={subName}
              onChange={(e) => setSubName(e.target.value)}
            />
          )}
          <button className="btn btn-primary" type="submit" disabled={busy}>
            {busy ? 'Spremanje…' : existing ? 'Dodaj potkategoriju' : 'Dodaj'}
          </button>
        </div>
        <label className="category-file">
          Slika {existing ? 'potkategorije' : 'kategorije'} (opcionalno)
          <input
            key={fileKey}
            type="file"
            accept="image/*"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </label>
      </form>
      {existing && (
        <p className="muted hint">
          Kategorija „{existing.name}” već postoji. Dodajte joj potkategoriju.
        </p>
      )}
      {error && <p className="error">{error}</p>}

      {tree.length === 0 ? (
        <p className="muted">Još nema kategorija.</p>
      ) : (
        <ul className="category-tree">
          {tree.map((c) => (
            <li key={c.id}>
              {item(c)}
              {c.children.length > 0 && (
                <ul className="chip-list subcategory-list">
                  {c.children.map((s) => (
                    <li key={s.id}>{item(s)}</li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
