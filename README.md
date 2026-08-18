# Apex Academy — Φροντιστήριο App

Πλήρης εφαρμογή διαχείρισης φροντιστηρίου: φοιτητικό portal (βαθμολογίες, απουσίες, πληρωμές, αποδείξεις, αρχεία) και admin panel (μαθητές, διαγωνίσματα, τμήματα, blog).

## Τεχνολογίες

Next.js 16 (App Router), Prisma 5 + PostgreSQL, NextAuth v5, Tailwind CSS, Framer Motion, Recharts.

## Πρώτη εγκατάσταση

```bash
npm install

# Αντέγραψε το .env.example σε .env και συμπλήρωσε τις τιμές
cp .env.example .env
```

Στο `.env`, όρισε οπωσδήποτε ένα δικό σου `NEXTAUTH_SECRET` (τυχαία τιμή, π.χ. `openssl rand -base64 32`) και το `DATABASE_URL_SITE` της Postgres βάσης σου (Neon/Supabase/Railway κ.λπ.) — ονομάζεται `DATABASE_URL_SITE` και όχι `DATABASE_URL` για να μη συγκρούεται με τυχόν `DATABASE_URL` ορισμένο στο περιβάλλον του συστήματος. Τα στοιχεία SMTP είναι προαιρετικά — χρειάζονται μόνο για το κουμπί "Email Γονέα" στη Σύνοψη μαθητή.

```bash
# Δημιουργία της βάσης (Postgres) και εφαρμογή του schema
npx prisma migrate deploy

# Δημιουργία αρχικών λογαριασμών admin/γραμματείας
npx prisma db seed

npm run dev
```

Η εφαρμογή θα τρέχει στο [http://localhost:3000](http://localhost:3000).

### Αρχικοί λογαριασμοί (seed)

Το `npx prisma db seed` δημιουργεί (ή επαναφέρει) τους λογαριασμούς `admin` και `grammateas` με **τυχαίο κωδικό που τυπώνεται μία φορά στο τερματικό** — δεν αποθηκεύεται πουθενά αλλού. Σημείωσέ τον αμέσως. Αν θέλεις συγκεκριμένους κωδικούς, όρισε `SEED_ADMIN_PASSWORD` / `SEED_SECRETARY_PASSWORD` στο `.env` πριν το τρέξεις.

## Δομή

- `/` — Δημόσια αρχική σελίδα
- `/login` — Σύνδεση (κοινή για όλους τους ρόλους)
- `/dashboard` — Portal μαθητή
- `/admin` — Πάνελ διαχείρισης
- `/blog`, `/teachers`, `/success-stories` — Δημόσιες σελίδες

## Σημαντικό — δεδομένα που ΔΕΝ ανεβαίνουν στο git

- `public/uploads/` — αναρτημένα αρχεία (διαγωνίσματα, αποδείξεις, υλικό μαθημάτων)
- `.env` — μυστικά/credentials (περιλαμβάνει το `DATABASE_URL_SITE` της Postgres βάσης)

Αυτά εξαιρούνται ήδη μέσω `.gitignore`. Σε νέο περιβάλλον (νέο clone, deployment) η βάση δημιουργείται από την αρχή με τα migrations + seed παραπάνω, και ο φάκελος uploads δημιουργείται αυτόματα όταν γίνει το πρώτο ανέβασμα αρχείου.
