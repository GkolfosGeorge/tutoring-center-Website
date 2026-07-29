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

// All subjects offered for a class year across every direction/track — used
// where there's no single student's direction to narrow down (e.g. admin file uploads).
export function getAllSubjectsForClassYear(classYear: string): string[] {
  const general = GENERAL_SUBJECTS_BY_CLASS[classYear] ?? [];
  const directionMap = DIRECTION_SUBJECTS[classYear] ?? {};
  const set = new Set(general);
  for (const subs of Object.values(directionMap)) for (const s of subs) set.add(s);
  return Array.from(set);
}

// Top-level folders for the course-files browser (admin + student). ΕΠΑΛ grades
// share the same subjects, so they're grouped under one folder rather than three.
export const FILE_FOLDER_GROUPS = [
  { label: "Α' Γυμνασίου", classYear: "Α' Γυμνασίου" },
  { label: "Β' Γυμνασίου", classYear: "Β' Γυμνασίου" },
  { label: "Γ' Γυμνασίου", classYear: "Γ' Γυμνασίου" },
  { label: "Α' Λυκείου", classYear: "Α' Λυκείου" },
  { label: "Β' Λυκείου", classYear: "Β' Λυκείου" },
  { label: "Γ' Λυκείου", classYear: "Γ' Λυκείου" },
  { label: "ΕΠΑΛ", classYear: "ΕΠΑΛ" },
];

export function getSubjectsForFileFolder(classYear: string): string[] {
  if (classYear === "ΕΠΑΛ") {
    const set = new Set<string>();
    for (const cy of EPAL_CLASSES) for (const s of getAllSubjectsForClassYear(cy)) set.add(s);
    return Array.from(set);
  }
  return getAllSubjectsForClassYear(classYear);
}

export const DAYS_GR = ["Δευτέρα", "Τρίτη", "Τετάρτη", "Πέμπτη", "Παρασκευή", "Σάββατο"];
export const DAY_SHORT = ["Δευ", "Τρί", "Τετ", "Πέμ", "Παρ", "Σάβ"];

export const EPAL_CLASSES = ["Α' ΕΠΑΛ", "Β' ΕΠΑΛ", "Γ' ΕΠΑΛ"];
export const LYCEUM_WITH_DIRECTIONS = ["Β' Λυκείου", "Γ' Λυκείου"];
