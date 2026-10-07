import { formatEUR } from '../format'
import { categoryLabel } from '../data'

// Clickable card; opens the product modal via onOpen. Shows image, name, price.
export default function ProductCard({ product, onOpen }) {
  const label = categoryLabel(product.categories)
  return (
    <button type="button" className="card product-card" onClick={() => onOpen(product)}>
      <div className={`card-image${product.image_url ? '' : ' placeholder'}`}>
        {product.image_url ? (
          <img src={product.image_url} alt={product.name} loading="lazy" />
        ) : (
          'Nema slike'
        )}
      </div>
      <div className="card-body">
        <h3 className="card-title">{product.name}</h3>
        {label && <span className="badge">{label}</span>}
        <span className="price">{formatEUR(product.price)}</span>
      </div>
    </button>
  )
}
