-- AlterTable
ALTER TABLE "StudentProfile" ADD COLUMN "address" TEXT;
ALTER TABLE "StudentProfile" ADD COLUMN "comments" TEXT;
ALTER TABLE "StudentProfile" ADD COLUMN "email" TEXT;
ALTER TABLE "StudentProfile" ADD COLUMN "firstName" TEXT;
ALTER TABLE "StudentProfile" ADD COLUMN "groupName" TEXT;
ALTER TABLE "StudentProfile" ADD COLUMN "lastName" TEXT;
ALTER TABLE "StudentProfile" ADD COLUMN "parentEmail" TEXT;
ALTER TABLE "StudentProfile" ADD COLUMN "parentName" TEXT;
ALTER TABLE "StudentProfile" ADD COLUMN "parentPhone" TEXT;
ALTER TABLE "StudentProfile" ADD COLUMN "phone" TEXT;
ALTER TABLE "StudentProfile" ADD COLUMN "schoolYear" TEXT;

-- CreateTable
CREATE TABLE "SessionStatus" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "enrollmentId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "held" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SessionStatus_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "SubjectEnrollment" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Payment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studentId" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "date" DATETIME NOT NULL,
    "description" TEXT NOT NULL,
    "paymentMethod" TEXT,
    "isPaid" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Payment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "StudentProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Payment" ("amount", "createdAt", "date", "description", "id", "isPaid", "studentId") SELECT "amount", "createdAt", "date", "description", "id", "isPaid", "studentId" FROM "Payment";
DROP TABLE "Payment";
ALTER TABLE "new_Payment" RENAME TO "Payment";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "SessionStatus_enrollmentId_date_key" ON "SessionStatus"("enrollmentId", "date");
