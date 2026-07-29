-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_CourseFile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "category" TEXT,
    "classYear" TEXT,
    "isFlipbook" BOOLEAN NOT NULL DEFAULT false,
    "fileName" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "uploadedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_CourseFile" ("category", "classYear", "fileName", "filePath", "fileSize", "id", "subject", "title", "uploadedAt") SELECT "category", "classYear", "fileName", "filePath", "fileSize", "id", "subject", "title", "uploadedAt" FROM "CourseFile";
DROP TABLE "CourseFile";
ALTER TABLE "new_CourseFile" RENAME TO "CourseFile";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

