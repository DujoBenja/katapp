import { supabase, IMAGE_BUCKET } from './supabase'

// ---- Categories -----------------------------------------------------------

export async function listCategories() {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('name', { ascending: true })
  if (error) throw error
  return data
}

// parentId set → subcategory; empty → top-level category.
export async function createCategory(name, parentId, file) {
  const image_url = file ? await uploadImage(file) : null
  const { data, error } = await supabase
    .from('categories')
    .insert({ name: name.trim(), parent_id: parentId || null, image_url })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateCategory(id, { name, file, image_url }) {
  let newImageUrl = image_url ?? null
  if (file) newImageUrl = await uploadImage(file)

  const { data, error } = await supabase
    .from('categories')
    .update({ name: name.trim(), image_url: newImageUrl })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  // Best-effort cleanup of the previous image once the row points at the new one.
  if (file && image_url) await removeImageByUrl(image_url).catch(() => {})
  return data
}

// Top-level categories, each with its `children` (subcategories), both sorted by name.
export function buildCategoryTree(categories) {
  const top = categories.filter((c) => !c.parent_id)
  return top.map((c) => ({
    ...c,
    children: categories.filter((s) => s.parent_id === c.id),
  }))
}

// "Kategorija › Potkategorija" label for a product's embedded category.
export function categoryLabel(category) {
  if (!category) return ''
  return category.parent?.name ? `${category.parent.name} › ${category.name}` : category.name
}

export async function deleteCategory(category) {
  const { error } = await supabase.from('categories').delete().eq('id', category.id)
  if (error) throw error
  if (category.image_url) await removeImageByUrl(category.image_url).catch(() => {})
}

// ---- Products -------------------------------------------------------------

// Each product carries its category (and that category's parent) name via FK joins.
const PRODUCT_SELECT = '*, categories(name, parent:parent_id(name))'

// Featured products first (most recently starred first), then newest first.
// featured_at is null for products that aren't featured.
const byFeaturedThenNewest = (query) =>
  query
    .order('featured_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })

// is_featured + featured_at for a write; keeps the original star time when an
// already-featured product is saved again, so it doesn't jump back to first place.
function featuredFields(isFeatured, previousFeaturedAt) {
  return {
    is_featured: !!isFeatured,
    featured_at: isFeatured ? previousFeaturedAt || new Date().toISOString() : null,
  }
}

export async function listProducts() {
  const { data, error } = await byFeaturedThenNewest(
    supabase.from('products').select(PRODUCT_SELECT)
  )
  if (error) throw error
  return data
}

// Products in any of the given categories (a category plus its subcategories).
export async function listProductsByCategories(categoryIds) {
  const { data, error } = await byFeaturedThenNewest(
    supabase.from('products').select(PRODUCT_SELECT).in('category_id', categoryIds)
  )
  if (error) throw error
  return data
}

export async function setProductFeatured(id, isFeatured) {
  const { error } = await supabase
    .from('products')
    .update(featuredFields(isFeatured, null))
    .eq('id', id)
  if (error) throw error
}

export async function createProduct({ name, description, price, category_id, is_featured, file }) {
  const image_url = file ? await uploadImage(file) : null
  const { data, error } = await supabase
    .from('products')
    .insert({
      name: name.trim(),
      description: description?.trim() || null,
      price: Number(price) || 0,
      category_id: category_id || null,
      ...featuredFields(is_featured, null),
      image_url,
    })
    .select(PRODUCT_SELECT)
    .single()
  if (error) throw error
  return data
}

export async function updateProduct(
  id,
  { name, description, price, category_id, is_featured, featured_at, file, image_url }
) {
  let newImageUrl = image_url ?? null

  if (file) {
    newImageUrl = await uploadImage(file)
    // Best-effort cleanup of the previous image once the new one is in place.
    if (image_url) await removeImageByUrl(image_url).catch(() => {})
  }

  const { data, error } = await supabase
    .from('products')
    .update({
      name: name.trim(),
      description: description?.trim() || null,
      price: Number(price) || 0,
      category_id: category_id || null,
      ...featuredFields(is_featured, featured_at),
      image_url: newImageUrl,
    })
    .eq('id', id)
    .select(PRODUCT_SELECT)
    .single()
  if (error) throw error
  return data
}

export async function deleteProduct(product) {
  const { error } = await supabase.from('products').delete().eq('id', product.id)
  if (error) throw error
  if (product.image_url) await removeImageByUrl(product.image_url).catch(() => {})
}

// ---- Image storage helpers ------------------------------------------------

async function uploadImage(file) {
  const ext = file.name.includes('.') ? file.name.split('.').pop() : 'jpg'
  // Random, collision-resistant object name (timestamp helpers are fine at runtime).
  const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

  const { error } = await supabase.storage
    .from(IMAGE_BUCKET)
    .upload(path, file, { cacheControl: '3600', upsert: false })
  if (error) throw error

  const { data } = supabase.storage.from(IMAGE_BUCKET).getPublicUrl(path)
  return data.publicUrl
}

// Public URLs look like .../object/public/<bucket>/<path>; extract <path> to delete.
async function removeImageByUrl(url) {
  const marker = `/${IMAGE_BUCKET}/`
  const idx = url.indexOf(marker)
  if (idx === -1) return
  const path = url.slice(idx + marker.length)
  await supabase.storage.from(IMAGE_BUCKET).remove([path])
}
