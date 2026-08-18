# Apex Academy — Φροντιστήριο App

## Stack
- Next.js 16.2.9 (App Router), TypeScript
- Prisma 5 ORM — βάση: Neon PostgreSQL (επιβεβαιωμένο, βλ. "Database connection" παρακάτω)
- NextAuth v5 (auth)
- Tailwind CSS + Framer Motion (styling/animations)
- Recharts (γραφήματα)
- Hosting: Hetzner VPS

## Database connection — γνωστά προβλήματα & λύσεις (ενημερώθηκε 2026-08-18)
- Η env var λέγεται **`DATABASE_URL_SITE`**, ΟΧΙ `DATABASE_URL` — ο χρήστης έχει ένα system-level (Windows User) `DATABASE_URL` δεσμευμένο για άλλο project του (Python/psycopg2). Ποτέ μην ξαναονομάσεις σε `DATABASE_URL` απλό, θα συγκρουστεί σιωπηλά.
- Χρησιμοποιείται το **direct** Neon connection string (χωρίς `-pooler` στο hostname), όχι το pooled/PgBouncer endpoint — το pooled έδινε σποραδικά `Error { kind: Closed }` επειδή η εφαρμογή τρέχει σαν μόνιμο process (Hetzner VPS), όχι serverless.
- Το δίκτυο του dev μηχανήματος έχει σπασμένο IPv6 routing (η IPv6 διεύθυνση αντιστοιχίζεται αλλά δεν δρομολογείται). Χρειάστηκε entry στο `C:\Windows\System32\drivers\etc\hosts` που καρφώνει το τρέχον Neon hostname σε IPv4 — αν αλλάξει ξανά το connection string (host ή IP), ενημέρωσε και το hosts file, αλλιώς θα ξαναφανεί `P1001 Can't reach database server`.
- Το Neon free-tier project μπαίνει σε "archived" state μετά από αδράνεια· ξυπνάει μόνο του με την πρώτη σύνδεση, αλλά αυτή η πρώτη προσπάθεια συνήθως αποτυγχάνει — περίμενε ~30-60s και ξαναδοκίμασε, ή τρέξε ένα `select 1;` στο Neon SQL Editor για να το πυροδοτήσεις χειροκίνητα.
- Ιστορικό: το project ήταν αρχικά σε SQLite (`prisma/dev.db`). Η μετάβαση σε Postgres (πριν 2026-08-18) δημιούργησε νέο "init" migration με άδειους πίνακες, χωρίς να μεταφερθούν δεδομένα. Στις 2026-08-18 μεταφέρθηκαν όλα τα δεδομένα (μαθητές, διαγωνίσματα, βαθμολογίες, ομάδες, πληρωμές, απουσίες, ημερολόγιο, course files) από το `dev.db` στη Neon με custom script· οι λογαριασμοί admin/γραμματείας ΔΕΝ αντικαταστάθηκαν (κρατήθηκαν οι ήδη-seeded στη Neon). Το `prisma/dev.db` παραμένει ως backup, μην το διαγράψεις χωρίς λόγο.
- **Επαληθεύτηκε (2026-08-18) ότι δεν υπήρξε καμία απώλεια δεδομένων**: κατά το διάστημα που η Neon ήταν άδεια (03/08 → 18/08) δεν έγινε καμία επιτυχής σύνδεση από την εφαρμογή (το branch αρχειοθετήθηκε λόγω αδράνειας στις 17/08, ο admin seed δεν ξαναπειράχτηκε ποτέ μετά τη δημιουργία του). Εξαντλητικός έλεγχος όλων των 57 εγγραφών της Neon επιβεβαίωσε ότι όλες προέρχονται είτε από το migration script είτε από το αρχικό admin seed — καμία ανεξήγητη εγγραφή.
- Εκκρεμεί: το table `playing_with_neon` (demo table που βάζει αυτόματα η Neon σε νέα projects) υπάρχει ακόμα μέσα στην ίδια τη Neon βάση (αφαιρέθηκε μόνο από το `schema.prisma`). Μπορεί να γίνει `DROP TABLE playing_with_neon;` όποτε βολεύει.

## Δομή
- `/src/app` — Next.js App Router (public pages, /admin, /dashboard, /api)
- `/src/components` — admin, dashboard, home, layout, ui
- `/src/lib` — auth, prisma client, helper constants
- `/prisma` — schema, migrations, seed

## Ρόλοι χρηστών
- ADMIN — πλήρης πρόσβαση
- STUDENT — μόνο /dashboard: βαθμοί, απουσίες, οφειλόμενο υπόλοιπο, αρχεία, πρόγραμμα

(Ο ρόλος ΓΡΑΜΜΑΤΕΙΑ/SECRETARY καταργήθηκε στις 2026-08-18 — αποφασίστηκε να υπάρχουν μόνο δύο ρόλοι. Ό,τι έκανε πριν η γραμματεία καλύπτεται πλέον από τον ADMIN.)

## Design philosophy — "σεμνό ύφος"
- Χωρίς avatars, χωρίς initials circles, χωρίς emoji icons
- Χωρίς trophy banners ή βαθμούς σε δημόσιες σελίδες επιτυχόντων — μόνο όνομα + σχολή
- Απλό, μετρημένο, όχι flashy

## Κανόνες ασφάλειας
- Αποδείξεις/παραστατικά πληρωμών ΔΕΝ εμφανίζονται ποτέ online — μόνο outstanding balance
- Prisma parameterized queries παντού (καμία raw SQL χωρίς λόγο)
- Ρόλοι/δικαιώματα ελέγχονται σε κάθε API route, όχι μόνο στο UI
- **Rate limiting στο login** (`src/lib/rateLimiter.ts`, ενσωματωμένο στο `authorize()` του `src/lib/auth.ts`): max 5 αποτυχημένες προσπάθειες ανά 15 λεπτά, ξεχωριστά ανά IP και ανά username (μπλοκάρει αν ξεπεραστεί το ένα από τα δύο). Απλό in-memory Map, χωρίς Redis — επαρκές γιατί η εφαρμογή τρέχει σαν ένα μόνιμο Node process σε ένα VPS, όχι πολλά instances/serverless. **Θα σταματήσει να δουλεύει σωστά αν στο μέλλον τρέξει σε πολλαπλά processes** (π.χ. PM2 cluster mode, ή scaling σε πολλά VPS) — τότε θα χρειαστεί shared store (Redis) γιατί κάθε process θα έχει το δικό του ξεχωριστό Map. Επίσης εξαρτάται από σωστό `X-Forwarded-For` header — αν η εφαρμογή μπει πίσω από reverse proxy (Nginx στο Hetzner), βεβαιώσου ότι το proxy υπερεγγράφει (δεν εμπιστεύεται τυφλά) αυτό το header από τον client.

## Git conventions
- Commit messages στα Ελληνικά
- ΧΩΡΙΣ Co-Authored-By γραμμές
- Μικρά, καθαρά commits ανά task

## Τρέχουσα κατάσταση (ενημέρωσε όποτε αλλάζει κάτι σημαντικό)
- [x] Βάση: Neon PostgreSQL, επιβεβαιωμένο και λειτουργικό (βλ. "Database connection" παραπάνω για gotchas)
- [ ] Deployment στο Hetzner: όχι ακόμα live
- [x] Seed κωδικός admin: αλλαγμένος από default τιμή
- [x] Ρόλος ΓΡΑΜΜΑΤΕΙΑ: καταργήθηκε 2026-08-18, μόνο ADMIN/STUDENT πλέον
- [x] Rate limiting στο login: ενεργό 2026-08-18 (βλ. "Κανόνες ασφάλειας")
- [x] Ακεραιότητα δεδομένων μετά τη μετάβαση SQLite→Postgres: επαληθεύτηκε 2026-08-18, καμία απώλεια/ανεξήγητη εγγραφή (βλ. "Database connection")
- [ ] `playing_with_neon` demo table ακόμα μέσα στη Neon βάση — προς DROP όποτε βολεύει