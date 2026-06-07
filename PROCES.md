# Pivska tvrđa — katalog: kompletan vodič

Ovaj dokument opisuje **cijeli proces** izrade, postavljanja i održavanja web kataloga
`pivskatvrdja.hr`. Možeš ga uvijek ponovno pregledati.

---

## 1. Što je aplikacija

Web katalog proizvoda za trgovinu. Posjetitelji pregledavaju proizvode (slika, naziv,
cijena, opis). Ti kroz **admin sučelje** sam dodaješ kategorije i proizvode.

**Tijek za posjetitelja:**
1. Naslovnica → tražilica + gumbi kategorija + mreža svih proizvoda
2. Klik na gumb kategorije → stranica s proizvodima te kategorije
3. Klik na proizvod → skočni prozor (modal) s velikom slikom, nazivom, cijenom i opisom

**Cijene:** EUR, hrvatski format (npr. `12,00 €`).

---

## 2. Arhitektura (kako je posloženo)

| Dio | Tehnologija | Gdje živi |
|---|---|---|
| Frontend (sama stranica) | React + Vite (statičke datoteke) | tvoj **Contabo** server (nginx) |
| Baza, slike, prijava | **Supabase** (cloud, besplatni plan) | Supabase oblak |

Frontend komunicira **izravno** sa Supabaseom — nema zasebnog backend servera koji bi
trebalo održavati. Gotova stranica je samo skup statičkih datoteka.

```
Posjetitelj  ─►  pivskatvrdja.hr (nginx na Contabu)  ─►  React aplikacija
                                                          │
                                                          ▼
                                              Supabase (proizvodi, slike, prijava)
```

**Ključni podaci:**
- Domena: `pivskatvrdja.hr`
- Server (Contabo VPS): IP `<IP-servera>`, Ubuntu 24.04, nginx, root pristup
- Supabase projekt: `bqphymxtomemwkcimqay`
- Lokalni projekt na Macu: `/Users/dujobenja/Desktop/katApp`

---

## 3. Supabase (baza i prijava)

### 3a. Tablice i sigurnost
U Supabase dashboardu → **SQL Editor** pokrenuta je sljedeća skripta (jednom):

```sql
create table categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  image_url text,                 -- postoji, ali se trenutno ne koristi
  created_at timestamptz default now()
);

create table products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  price numeric(10,2) not null default 0,
  category_id uuid references categories(id) on delete set null,
  image_url text,
  created_at timestamptz default now()
);

alter table categories enable row level security;
alter table products  enable row level security;

create policy "public read categories" on categories for select using (true);
create policy "auth write categories" on categories for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "public read products" on products for select using (true);
create policy "auth write products" on products for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

insert into storage.buckets (id, name, public) values ('product-images','product-images', true);
create policy "public read images" on storage.objects for select using (bucket_id = 'product-images');
create policy "auth upload images" on storage.objects for insert
  with check (bucket_id = 'product-images' and auth.role() = 'authenticated');
create policy "auth update images" on storage.objects for update
  using (bucket_id = 'product-images' and auth.role() = 'authenticated');
create policy "auth delete images" on storage.objects for delete
  using (bucket_id = 'product-images' and auth.role() = 'authenticated');
```

**Sigurnost (RLS):** svatko može **čitati** proizvode/kategorije; samo prijavljeni admin
može **mijenjati**.

### 3b. Admin korisnik
Supabase → **Authentication → Users → Add user** (e-pošta + lozinka). Tom prijavom se
ulazi na `/admin`.

### 3c. Ključevi (`.env`)
U datoteci `.env` (u projektu, **ne ide na GitHub**) su:
```
VITE_SUPABASE_URL=https://bqphymxtomemwkcimqay.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...   (publishable ključ — smije biti javan)
```
Nalaze se u Supabase: **Settings → API**.

> ⚠️ Ovi ključevi se **ugrađuju u build**, pa `.env` mora biti postavljen **prije**
> `npm run build` / `./deploy.sh`.

---

## 4. Lokalni razvoj (na Macu)

```bash
cd /Users/dujobenja/Desktop/katApp
npm install        # samo prvi put
npm run dev        # otvori http://localhost:5173
```

Vidiš stranicu lokalno; promjene u kodu se odmah osvježe.

---

## 5. Postavljanje servera (Contabo) — napravljeno jednom

> Ovo je već odrađeno. Dokumentirano za slučaj ponovne instalacije.

### 5a. Reinstalacija OS-a
Contabo panel (`my.contabo.com`) → VPS → **Reinstall** → **Ubuntu 24.04 LTS**, postaviti
root lozinku. (Briše sve na serveru.)

### 5b. Postavljanje (preko SSH-a kao root)
```bash
ssh root@<IP-servera>
```
Zatim (jednom):
```bash
export DEBIAN_FRONTEND=noninteractive
apt update && apt -y upgrade
apt install -y nginx certbot python3-certbot-nginx ufw rsync
ufw allow OpenSSH; ufw allow 'Nginx Full'; ufw --force enable
mkdir -p /var/www/katapp
cat > /etc/nginx/sites-available/katapp <<'EOF'
server {
    listen 80;
    listen [::]:80;
    server_name pivskatvrdja.hr www.pivskatvrdja.hr;
    root /var/www/katapp;
    index index.html;
    gzip on;
    gzip_types text/css application/javascript image/svg+xml;
    gzip_min_length 1024;
    location /assets/ { expires 1y; add_header Cache-Control "public, immutable"; }
    location = /index.html { add_header Cache-Control "no-cache"; }
    location / { try_files $uri $uri/ /index.html; }
}
EOF
ln -sf /etc/nginx/sites-available/katapp /etc/nginx/sites-enabled/katapp
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl restart nginx && systemctl enable nginx
```

### 5c. DNS
A-zapis za `pivskatvrdja.hr` i `www` → `<IP-servera>`. (Već postavljeno.)

### 5d. HTTPS (SSL certifikat)
```bash
certbot --nginx -d pivskatvrdja.hr -d www.pivskatvrdja.hr \
  --redirect -m <tvoja-email> --agree-tos -n
```
Certbot sam obnavlja certifikat prije isteka.

---

## 6. Objava promjena na živu stranicu (deploy)

Kad god promijeniš **kod** (izgled, tekstove, funkcije), objavi ovako — **u terminalu na
Macu**, iz mape projekta:

```bash
cd /Users/dujobenja/Desktop/katApp
./deploy.sh
```

Skripta `deploy.sh`:
1. izgradi aplikaciju (`npm run build`)
2. prebaci datoteke na server (`rsync` u `/var/www/katapp`)

Pri spajanju traži **root lozinku** (moguće dva puta, bez SSH ključa je to normalno).
Nakon par sekundi promjene su uživo na `https://pivskatvrdja.hr`.

> 💡 IP i korisnik su već upisani u `deploy.sh`. Ako ikad treba ručno:
> `SERVER_HOST=<IP-servera> ./deploy.sh`

---

## 7. Dvije vrste izmjena — VAŽNO

### A) Sadržaj (proizvodi i kategorije) — BEZ deploya
Radi se kroz preglednik, promjene su **trenutne**:
1. `https://pivskatvrdja.hr/login` → prijava (admin e-pošta + lozinka)
2. **Administracija**:
   - **Kategorije**: upiši naziv + „Dodaj" (obriši preko ✕). *Prvo dodaj kategoriju.*
   - **Proizvodi**: naziv, opis, cijena, odabir kategorije, slika → „Dodaj proizvod".
     Uređivanje i brisanje preko gumba u popisu.

✅ Čim spremiš, vidljivo je svima. **Ovo radiš najčešće.**

### B) Kod / dizajn — TREBA deploy
Izmjena datoteka u `src/` na Macu, zatim `./deploy.sh`.

| Što mijenjaš | Gdje | Treba deploy? |
|---|---|---|
| Proizvodi, kategorije, slike, cijene, opisi | `/admin` u pregledniku | ❌ Ne |
| Boje, raspored, tekst sučelja, nove funkcije | kod (`src/…`) + `./deploy.sh` | ✅ Da |

---

## 8. Struktura projekta (datoteke)

```
katApp/
├── .env                      Supabase ključevi (NE na GitHub)
├── deploy.sh                 build + objava na server
├── deploy/
│   ├── nginx.conf.example    nginx konfiguracija (predložak)
│   └── server-setup.sh       skripta za postavljanje servera
├── README.md                 tehničke upute (engleski)
├── PROCES.md                 ovaj vodič
└── src/
    ├── main.jsx              ulazna točka + rute
    ├── App.jsx               zaglavlje, podnožje, navigacija
    ├── supabase.js           spajanje na Supabase
    ├── data.js               dohvat/spremanje proizvoda i kategorija
    ├── auth.jsx              prijava / zaštita /admin
    ├── format.js             format cijene (EUR)
    ├── styles.css            cijeli izgled (boje, raspored)
    ├── pages/
    │   ├── Home.jsx          naslovnica (tražilica + kategorije + proizvodi)
    │   ├── CategoryPage.jsx  stranica jedne kategorije
    │   ├── Login.jsx         prijava
    │   └── Admin.jsx         administracija
    └── components/
        ├── ProductCard.jsx   kartica proizvoda
        ├── ProductModal.jsx  skočni prozor s opisom
        └── CategoryManager.jsx  upravljanje kategorijama
```

---

## 9. Korisne naredbe / rješavanje problema

```bash
# Lokalni pregled prije objave
npm run dev

# Objava na živu stranicu
./deploy.sh

# Spajanje na server
ssh root@<IP-servera>

# Na serveru: stanje nginxa / ponovno učitavanje
systemctl status nginx
nginx -t && systemctl reload nginx

# Na serveru: ručno obnavljanje SSL-a (inače automatski)
certbot renew --dry-run
```

**Ako stranica ne radi nakon deploya:** provjeri `nginx -t` na serveru i je li `.env`
ispravan prije builda. **Ako se proizvodi ne učitavaju:** provjeri Supabase ključeve u
`.env` i da su tablice/RLS na mjestu (poglavlje 3).

---

## 10. Najlakši način za promjene

Ako želiš promjenu koda/dizajna, a ne želiš sam dirati datoteke — samo opiši što želiš
(npr. „dodaj polje za zalihu" ili „promijeni boju gumba"), i to se napravi + objavi.
```
