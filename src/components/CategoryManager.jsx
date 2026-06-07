import { useState } from 'react'
import { createCategory, deleteCategory } from '../data'

export default function CategoryManager({ categories, onChange }) {
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleAdd(e) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    setError('')
    setBusy(true)
    try {
      await createCategory(trimmed)
      setName('')
      await onChange()
    } catch (err) {
      // Unique-constraint violations come back as Postgres error code 23505.
      setError(
        err.code === '23505'
          ? 'Ta kategorija već postoji.'
          : err.message || 'Dodavanje kategorije nije uspjelo'
      )
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete(id) {
    if (!confirm('Obrisati ovu kategoriju? Njezini proizvodi postat će "Bez kategorije".')) {
      return
    }
    setError('')
    try {
      await deleteCategory(id)
      await onChange()
    } catch (err) {
      setError(err.message || 'Brisanje kategorije nije uspjelo')
    }
  }

  return (
    <section className="panel">
      <h2>Kategorije</h2>
      <p className="muted">Prvo izradite kategoriju, zatim joj dodijelite proizvode.</p>

      <form className="inline-form" onSubmit={handleAdd}>
        <input
          className="input"
          placeholder="Naziv nove kategorije"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button className="btn btn-primary" type="submit" disabled={busy}>
          Dodaj
        </button>
      </form>
      {error && <p className="error">{error}</p>}

      {categories.length === 0 ? (
        <p className="muted">Još nema kategorija.</p>
      ) : (
        <ul className="chip-list">
          {categories.map((c) => (
            <li key={c.id} className="chip">
              {c.name}
              <button
                className="chip-x"
                title="Obriši kategoriju"
                onClick={() => handleDelete(c.id)}
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
