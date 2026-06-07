# Store Catalogue (katApp)

A simple product catalogue web app. Customers browse products (image, description,
price) with search + category filtering. You manage **categories** and **products**
through a password-protected admin area.

Built with **React + Vite** on the frontend and **Supabase** (hosted Postgres +
file storage + auth) as the backend — no custom server to run.

---

## 1. Create your Supabase project (one time)

1. Go to <https://supabase.com>, sign up (free), and create a **new project**.
   Pick a strong database password and a region near you.
2. Wait ~1 minute for it to provision.

### 1a. Create the database tables, security rules, and image bucket

In the Supabase dashboard, open **SQL Editor → New query**, paste the SQL below,
and click **Run**:

```sql
-- Categories (each has a name and an optional image)
create table categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  image_url text,
  created_at timestamptz default now()
);

-- Products (category optional; set null if its category is deleted)
create table products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  price numeric(10,2) not null default 0,
  category_id uuid references categories(id) on delete set null,
  image_url text,
  created_at timestamptz default now()
);

-- Enable Row Level Security
alter table categories enable row level security;
alter table products  enable row level security;

-- Anyone can read; only signed-in admins can write
create policy "public read categories" on categories for select using (true);
create policy "auth write categories" on categories for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "public read products" on products for select using (true);
create policy "auth write products" on products for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- Storage bucket for product images (public read)
insert into storage.buckets (id, name, public) values ('product-images','product-images', true);
create policy "public read images" on storage.objects for select
  using (bucket_id = 'product-images');
create policy "auth upload images" on storage.objects for insert
  with check (bucket_id = 'product-images' and auth.role() = 'authenticated');
create policy "auth update images" on storage.objects for update
  using (bucket_id = 'product-images' and auth.role() = 'authenticated');
create policy "auth delete images" on storage.objects for delete
  using (bucket_id = 'product-images' and auth.role() = 'authenticated');
```

### 1b. Create your admin login

Go to **Authentication → Users → Add user**. Enter the email + password you want
to log in with. (Tip: turn off "Send confirmation email" / mark it confirmed so you
can log in immediately.)

### 1c. Copy your project keys

Go to **Settings → API** and copy:

- **Project URL**
- **publishable** key (`sb_publishable_…`) — or the legacy **anon public** key

---

## 2. Configure the app

```bash
cp .env.example .env
```

Open `.env` and paste your values:

```
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxxxxxxxxxxx
```

> The publishable key is safe to use in the frontend — your data is protected by the
> Row Level Security policies created above (public read, admin-only write).

---

## 3. Run it

```bash
npm install
npm run dev
```

Open <http://localhost:5173>.

- `/` — public catalogue (search + category filter)
- `/login` — admin login (the user you created in step 1b)
- `/admin` — manage categories and products (protected)

### First steps in the admin area

1. Log in at `/login`.
2. Under **Categories**, add a category (e.g. "Shoes"). *Create categories before
   products so you can assign them.*
3. Under **Add product**, fill in name / description / price, choose a category,
   upload an image, and save. It appears on the catalogue immediately.

---

## 4. Build for production

```bash
npm run build      # outputs static files to dist/
npm run preview    # preview the production build locally
```

> ⚠️ The Supabase URL + publishable key are baked into the build, so `.env` must be
> set **before** you run `npm run build`.

---

## 5. Deploy to your Contabo server (self-hosted)

The app is just static files served by **nginx**; the database/images/auth stay on
Supabase Cloud. You only need to (a) put the built files on the server and (b) point
your domain at it with HTTPS.

### 5a. One-time server setup (run on the Contabo box via SSH)

```bash
ssh youruser@your.server.ip

sudo apt update
sudo apt install -y nginx
sudo mkdir -p /var/www/katapp

# nginx site config
sudo nano /etc/nginx/sites-available/katapp     # paste deploy/nginx.conf.example, edit server_name
sudo ln -s /etc/nginx/sites-available/katapp /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default      # optional: remove the default page
sudo nginx -t && sudo systemctl reload nginx
```

Point your **domain's DNS** A record (and a `www` record) at the server's IP. Wait for
it to propagate (usually minutes), then add free HTTPS:

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

Certbot edits the nginx config to serve HTTPS and auto-renews the certificate.

### 5b. Deploy / update the site (run locally, from this folder)

Edit `SERVER_USER`, `SERVER_HOST`, and `REMOTE_DIR` at the top of `deploy.sh`, then:

```bash
./deploy.sh
```

This builds the app and `rsync`s `dist/` to the server. Re-run it any time you change
the code. (It needs `rsync` and `ssh` locally — both standard on macOS/Linux.)

> Note: editing **products and categories** does *not* require redeploying — that data
> lives in Supabase and updates instantly through the `/admin` page. You only redeploy
> when the app's **code** changes.

---

## Project structure

```
deploy.sh               build + upload to your server
deploy/nginx.conf.example   nginx site config template
src/
  main.jsx              app entry + router
  App.jsx               layout, header/nav, routes
  supabase.js           Supabase client
  data.js               products & categories CRUD + image upload helpers
  auth.jsx              session context + ProtectedRoute
  format.js             EUR price formatting
  pages/
    Catalogue.jsx       public grid + search + category filter
    Login.jsx           admin sign-in
    Admin.jsx           dashboard: categories + products
  components/
    ProductCard.jsx     catalogue card
    ProductForm.jsx     create/edit product + image upload
    CategoryManager.jsx add/delete categories
```
