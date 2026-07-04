export const CLASS_YEARS = [
  "Α' Γυμνασίου",
  "Β' Γυμνασίου",
  "Γ' Γυμνασίου",
  "Α' Λυκείου",
  "Β' Λυκείου",
  "Γ' Λυκείου",
  "Α' ΕΠΑΛ",
  "Β' ΕΠΑΛ",
  "Γ' ΕΠΑΛ",
];

// Top-level groupings for hierarchical displays (e.g. the Μαθητές list).
// Buckets with more than one year render a collapsible year level inside them;
// single-year buckets (Α'/Β'/Γ' Λυκείου) go straight to τμήματα.
export const CLASS_YEAR_TREE = [
  { label: "Γυμνάσιο", years: ["Α' Γυμνασίου", "Β' Γυμνασίου", "Γ' Γυμνασίου"] },
  { label: "Α' Λυκείου", years: ["Α' Λυκείου"] },
  { label: "Β' Λυκείου", years: ["Β' Λυκείου"] },
  { label: "Γ' Λυκείου", years: ["Γ' Λυκείου"] },
  { label: "ΕΠΑΛ", years: ["Α' ΕΠΑΛ", "Β' ΕΠΑΛ", "Γ' ΕΠΑΛ"] },
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
  "Α' Γυμνασίου": {
    "": ["Μαθηματικά", "Νεοελληνική Γλώσσα", "Αρχαία Ελληνικά"],
  },
  "Β' Γυμνασίου": {
    "": ["Μαθηματικά", "Νεοελληνική Γλώσσα", "Αρχαία Ελληνικά", "Φυσική"],
  },
  "Γ' Γυμνασίου": {
    "": ["Μαθηματικά", "Νεοελληνική Γλώσσα", "Αρχαία Ελληνικά", "Φυσική", "Χημεία"],
  },
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
  "Α' ΕΠΑΛ": {
    "": ["Μαθηματικά", "Έκθεση", "Ειδικότητα"],
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

export const EPAL_CLASSES = ["Α' ΕΠΑΛ", "Β' ΕΠΑΛ", "Γ' ΕΠΑΛ"];
export const LYCEUM_WITH_DIRECTIONS = ["Β' Λυκείου", "Γ' Λυκείου"];
