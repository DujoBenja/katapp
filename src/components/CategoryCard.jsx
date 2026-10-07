import { Link } from 'react-router-dom'

// Linked card for a category: image (or placeholder) and name.
export default function CategoryCard({ category }) {
  return (
    <Link to={`/kategorija/${category.id}`} className="card category-card">
      <div className={`card-image${category.image_url ? '' : ' placeholder'}`}>
        {category.image_url ? (
          <img src={category.image_url} alt={category.name} loading="lazy" />
        ) : (
          'Nema slike'
        )}
      </div>
      <div className="card-body">
        <h3 className="card-title">{category.name}</h3>
      </div>
    </Link>
  )
}
