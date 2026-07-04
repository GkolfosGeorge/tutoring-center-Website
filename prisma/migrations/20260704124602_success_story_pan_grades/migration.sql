-- SuccessStory table is currently empty; recreate with the new shape.
DROP TABLE "SuccessStory";

CREATE TABLE "SuccessStory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "academicYear" INTEGER NOT NULL,
    "direction" TEXT NOT NULL,
    "directionTrack" TEXT,
    "university" TEXT NOT NULL,
    "department" TEXT,
    "grades" TEXT,
    "generalScore" REAL,
    "admissionPoints" REAL,
    "photoUrl" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
