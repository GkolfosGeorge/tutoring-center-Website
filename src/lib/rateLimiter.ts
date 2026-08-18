const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;

type Entry = { count: number; firstAttempt: number };

const attempts = new Map<string, Entry>();

// Ευκαιριακός καθαρισμός παλιών εγγραφών, ώστε το Map να μη μεγαλώνει επ' άπειρον
// σε ένα μακρόβιο process (η εφαρμογή τρέχει σαν μόνιμο process σε VPS, όχι serverless).
let lastSweep = Date.now();
function sweep() {
  const now = Date.now();
  if (now - lastSweep < WINDOW_MS) return;
  lastSweep = now;
  for (const [key, entry] of attempts) {
    if (now - entry.firstAttempt > WINDOW_MS) attempts.delete(key);
  }
}

export function registerLoginAttempt(key: string): { blocked: boolean; retryAfterSeconds: number } {
  sweep();
  const now = Date.now();
  const entry = attempts.get(key);

  if (!entry || now - entry.firstAttempt > WINDOW_MS) {
    attempts.set(key, { count: 1, firstAttempt: now });
    return { blocked: false, retryAfterSeconds: 0 };
  }

  if (entry.count >= MAX_ATTEMPTS) {
    return { blocked: true, retryAfterSeconds: Math.ceil((entry.firstAttempt + WINDOW_MS - now) / 1000) };
  }

  entry.count++;
  return { blocked: false, retryAfterSeconds: 0 };
}

export function clearLoginAttempts(key: string) {
  attempts.delete(key);
}
