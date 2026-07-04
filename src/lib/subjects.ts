export const CLASS_YEARS = [
  "Α' Λυκείου",
  "Β' Λυκείου",
  "Γ' Λυκείου",
  "Β' ΕΠΑΛ",
  "Γ' ΕΠΑΛ",
];

export const DIRECTIONS_BY_CLASS: Record<string, string[]> = {
  "Β' Λυκείου": ["Θετική", "Θεωρητική"],
  "Γ' Λυκείου": ["Θετική", "Τεχνολογική", "Θεωρητική"],
};

// Always-available subjects regardless of direction
const GENERAL_SUBJECTS_BY_CLASS: Record<string, string[]> = {
  "Β' Λυκείου": ["Άλγεβρα", "Έκθεση"],
};

// Direction/track-specific subjects
const DIRECTION_SUBJECTS: Record<string, Record<string, string[]>> = {
  "Α' Λυκείου": {
    "": ["Μαθηματικά", "Φυσική", "Χημεία", "Έκθεση"],
  },
  "Β' Λυκείου": {
    "":           [],
    "Θετική":     ["Μαθηματικά Προσανατολισμού", "Φυσική Προσανατολισμού", "Χημεία"],
    "Θεωρητική":  ["Αρχαία", "Λατινικά"],
  },
  "Γ' Λυκείου": {
    "Θετική":      ["Μαθηματικά", "Φυσική", "Χημεία", "Βιολογία", "Έκθεση"],
    "Τεχνολογική": ["Μαθηματικά", "Οικονομία", "Πληροφορική", "Έκθεση"],
    "Θεωρητική":   ["Έκθεση", "Αρχαία", "Λατινικά", "Ιστορία"],
  },
  "Β' ΕΠΑΛ": {
    "": ["Μαθηματικά", "Έκθεση", "Ειδικότητα"],
  },
  "Γ' ΕΠΑΛ": {
    "": ["Μαθηματικά", "Έκθεση", "Ειδικότητα"],
  },
};

export function getSubjectsForStudent(
  classYear: string,
  direction?: string | null
): string[] {
  const general = GENERAL_SUBJECTS_BY_CLASS[classYear] ?? [];
  const dirSubjects = DIRECTION_SUBJECTS[classYear]?.[direction ?? ""] ?? [];
  return [...general, ...dirSubjects];
}

export const DAYS_GR = ["Δευτέρα", "Τρίτη", "Τετάρτη", "Πέμπτη", "Παρασκευή", "Σάββατο"];
export const DAY_SHORT = ["Δευ", "Τρί", "Τετ", "Πέμ", "Παρ", "Σάβ"];

export const EPAL_CLASSES = ["Β' ΕΠΑΛ", "Γ' ΕΠΑΛ"];
export const LYCEUM_WITH_DIRECTIONS = ["Β' Λυκείου", "Γ' Λυκείου"];
