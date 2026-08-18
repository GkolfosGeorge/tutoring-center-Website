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

## Backup στρατηγική (2026-08-18)
Δύο επίπεδα: (α) Neon point-in-time restore (PITR) για γρήγορη ανάκτηση πρόσφατων λαθών, (β) daily `pg_dump` σε Google Drive για ανεξάρτητο, μακροπρόθεσμο αντίγραφο ασφαλείας εκτός Neon.

**(α) Neon PITR** — **επιβεβαιώθηκε: το project είναι σε Free tier (2026-08-18) → μόνο 6 ώρες point-in-time restore**, χωρίς δυνατότητα ρύθμισης σε μεγαλύτερο retention (χρειάζεται paid πλάνο για αυτό — Launch έως 7 μέρες, Scale έως 30 μέρες). 6 ώρες είναι πολύ στενό περιθώριο για πραγματικά δεδομένα μαθητών (αν ένα λάθος/διαγραφή ανακαλυφθεί την επόμενη μέρα, το PITR δεν θα βοηθήσει πια) — το daily backup παρακάτω είναι το πραγματικό δίχτυ ασφαλείας, όχι το Neon PITR. Άξιο σκέψης για το μέλλον: upgrade σε Launch plan όποτε το επιτρέπει ο προϋπολογισμός, αλλά όχι επείγον όσο τρέχει το daily backup.

**(β) Daily pg_dump → Google Drive**: `scripts/backup-db.sh` — τρέχει `pg_dump -Fc` πάνω στο `DATABASE_URL_SITE`, ανεβάζει με `rclone` σε Google Drive (φάκελος `frontistirio-backups`), κρατάει τοπικά αντίγραφα 7 ημερών (ρυθμίσιμο μέσω `RETENTION_DAYS`), προαιρετικό ping σε healthchecks.io (`BACKUP_HEALTHCHECK_URL`) ώστε να έρθει email αν το backup αποτύχει σιωπηλά — δεν χρειάζεται να θυμάσαι να ελέγχεις χειροκίνητα.

**Πλήρως δοκιμασμένο end-to-end στις 2026-08-18** (pg_dump → rclone → πραγματικό Google Drive, όλο το `scripts/backup-db.sh` έτρεξε reference και πέτυχε — υπάρχει ήδη ένα πρώτο πραγματικό backup στο Drive). Σημαντικά ευρήματα από το testing:
- Η Neon τρέχει PostgreSQL **18.4** — χρειάζεται `pg_dump`/`pg_restore` **v18** (όχι v17), αλλιώς "server version mismatch". Στο Hetzner (`apt install postgresql-client`) βεβαιώσου ότι παίρνεις την v18 σειρά (π.χ. PGDG apt repo αν το default Debian/Ubuntu repo έχει παλαιότερη έκδοση).
- Το rclone remote `gdrive-backup` έχει ήδη ρυθμιστεί και εξουσιοδοτηθεί (scope `drive.file` — βλέπει μόνο ό,τι δημιουργεί το ίδιο, όχι όλο το Drive) με **δικό μας** Google Cloud OAuth client_id (project `frontistirio-backup` στο Google Cloud Console), όχι το προεπιλεγμένο/κοινόχρηστο client_id του rclone — αυτό αγνοήθηκε επίτηδες γιατί το shared client_id **καταργείται μέσα στο 2026** και θα σταματούσε να δουλεύει σιωπηλά. Το client_secret ΔΕΝ γράφεται εδώ (μυστικό, το CLAUDE.md είναι committed στο git) — βρίσκεται στο Google Cloud Console του χρήστη, στο ίδιο project.
- Η ρύθμιση (`client_id`, `client_secret`, `refresh_token`) ζει προς το παρόν μόνο τοπικά στο dev μηχάνημα, στο `C:\Users\georg\AppData\Roaming\rclone\rclone.conf`. Όταν γίνει το deployment στο Hetzner, το πιο απλό είναι να αντιγραφεί αυτό το αρχείο (μέσω scp, όχι git) στο VPS ως `~/.config/rclone/rclone.conf` — έτσι δεν χρειάζεται να ξαναγίνει το OAuth consent. Αν προτιμηθεί νέο consent από την αρχή στο VPS, βλ. rclone headless auth flow (`rclone authorize "drive"`).

Υπόλοιπο setup στο Hetzner VPS (εφόσον δεν είναι ακόμα live — προς εκτέλεση όταν γίνει το deployment):
1. `sudo apt install postgresql-client-18 rclone` (βεβαιώσου ότι είναι η v18, βλ. παραπάνω)
2. Αντίγραψε το τοπικό `rclone.conf` στο VPS (βλ. παραπάνω) — ΟΧΙ μέσω git/commit, μυστικό αρχείο
3. Προαιρετικό: λογαριασμός στο [healthchecks.io](https://healthchecks.io) (δωρεάν), δημιουργία ενός check, βάλε το URL του στο `BACKUP_HEALTHCHECK_URL` στο `.env`
4. `chmod +x scripts/backup-db.sh`
5. Crontab: `30 3 * * * /path/to/frontistirio-app/scripts/backup-db.sh >> /var/log/frontistirio-backup.log 2>&1`
6. **Test restore** (ένα backup που δεν έχεις δοκιμάσει να το επαναφέρεις δεν είναι αξιόπιστο backup): `pg_restore --list backup.dump` για γρήγορο sanity check, ή σε ξεχωριστή/δοκιμαστική βάση: `pg_restore -d "<test-db-url>" backup.dump`

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
- Γενικός έλεγχος `npm run build` + access-control audit έγινε 2026-08-18 πριν την εισαγωγή πραγματικών δεδομένων: βρέθηκαν και διορθώθηκαν 2 προϋπάρχοντα bugs (`GET /api/files` και `GET /api/blog?admin=1` δεν έλεγχαν σωστά `role === ADMIN`, μόνο "logged in"/τίποτα). Δεν ήταν σχετικά με την αφαίρεση του ρόλου γραμματείας — προϋπήρχαν. Κάθε νέο API route κάτω από admin-only λειτουργία πρέπει να καλεί `checkAdmin()`/`checkStaff()`, ποτέ μόνο `if (!session)`.
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
- [x] Backup στρατηγική: pg_dump→Google Drive πλήρως δοκιμασμένο 2026-08-18 (δικό μας OAuth client_id, όχι το shared του rclone), υπάρχει ήδη ένα πρώτο πραγματικό backup στο Drive. Neon PITR επιβεβαιωμένο: Free tier = 6 ώρες μόνο.
- [ ] Backup: crontab στο Hetzner ΔΕΝ έχει μπει ακόμα (δεν είναι live) — εκκρεμεί όταν γίνει το deployment (βλ. "Backup στρατηγική" για ακριβή βήματα)
- [x] Ακεραιότητα δεδομένων μετά τη μετάβαση SQLite→Postgres: επαληθεύτηκε 2026-08-18, καμία απώλεια/ανεξήγητη εγγραφή (βλ. "Database connection")
- [ ] `playing_with_neon` demo table ακόμα μέσα στη Neon βάση — προς DROP όποτε βολεύει