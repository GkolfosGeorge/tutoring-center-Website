-- AlterTable
ALTER TABLE "StudentProfile" ADD COLUMN "direction" TEXT;

-- CreateTable
CREATE TABLE "SubjectEnrollment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studentId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "costPerHour" REAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SubjectEnrollment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "StudentProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WeeklySlot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "enrollmentId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    CONSTRAINT "WeeklySlot_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "SubjectEnrollment" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
