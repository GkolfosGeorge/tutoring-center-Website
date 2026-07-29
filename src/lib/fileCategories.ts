export const FILE_CATEGORIES = [
  "Σημειώσεις Μαθήματος",
  "Λύσεις Ασκήσεων",
  "Διαγωνίσματα",
  "Τυπολόγιο",
  "Επανάληψη",
  "Θεωρία",
] as const;

export type FileCategory = (typeof FILE_CATEGORIES)[number];
