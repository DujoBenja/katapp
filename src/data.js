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

export async function getCategory(id) {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

export async function createCategory(name) {
  const { data, error } = await supabase
    .from('categories')
    .insert({ name: name.trim() })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteCategory(id) {
  const { error } = await supabase.from('categories').delete().eq('id', id)
  if (error) throw error
}

// ---- Products -------------------------------------------------------------

// Each product carries its category name via the FK join (categories(name)).
export async function listProducts() {
  const { data, error } = await supabase
    .from('products')
    .select('*, categories(name)')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

// Products belonging to a single category (used on the category page).
export async function listProductsByCategory(categoryId) {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('category_id', categoryId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function createProduct({ name, description, price, category_id, file }) {
  const image_url = file ? await uploadImage(file) : null
  const { data, error } = await supabase
    .from('products')
    .insert({
      name: name.trim(),
      description: description?.trim() || null,
      price: Number(price) || 0,
      category_id: category_id || null,
      image_url,
    })
    .select('*, categories(name)')
    .single()
  if (error) throw error
  return data
}

export async function updateProduct(id, { name, description, price, category_id, file, image_url }) {
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
      image_url: newImageUrl,
    })
    .eq('id', id)
    .select('*, categories(name)')
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
