// Shared subject color palette so a subject's chip color matches across the
// weekly calendar and the grades page. Index is based on the subject's
// position in an alphabetically sorted list of the student's subjects.
export const SUBJECT_CHIP_COLORS: { bg: string; text: string; border: string }[] = [
  { bg: "#dbeafe", text: "#1e40af", border: "#bfdbfe" },
  { bg: "#ede9fe", text: "#5b21b6", border: "#ddd6fe" },
  { bg: "#d1fae5", text: "#065f46", border: "#a7f3d0" },
  { bg: "#ffedd5", text: "#9a3412", border: "#fed7aa" },
  { bg: "#fce7f3", text: "#9d174d", border: "#fbcfe8" },
  { bg: "#ccfbf1", text: "#134e4a", border: "#99f6e4" },
];

export function getSubjectChipColor(sortedSubjects: string[], subject: string) {
  const idx = sortedSubjects.indexOf(subject);
  return SUBJECT_CHIP_COLORS[Math.max(0, idx) % SUBJECT_CHIP_COLORS.length];
}
