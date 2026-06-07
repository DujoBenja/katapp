import { useEffect } from 'react'
import { formatEUR } from '../format'

export default function ProductModal({ product, onClose }) {
  // Close on Escape and lock background scroll while open.
  useEffect(() => {
    if (!product) return
    function onKey(e) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [product, onClose])

  if (!product) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <button className="modal-close" onClick={onClose} aria-label="Zatvori">✕</button>
        <div className={`modal-image${product.image_url ? '' : ' placeholder'}`}>
          {product.image_url ? (
            <img src={product.image_url} alt={product.name} />
          ) : (
            'Nema slike'
          )}
        </div>
        <div className="modal-body">
          <h2 className="modal-title">{product.name}</h2>
          <p className="price modal-price">{formatEUR(product.price)}</p>
          {product.description ? (
            <p className="modal-desc">{product.description}</p>
          ) : (
            <p className="muted">Nema opisa.</p>
          )}
        </div>
      </div>
    </div>
  )
}
