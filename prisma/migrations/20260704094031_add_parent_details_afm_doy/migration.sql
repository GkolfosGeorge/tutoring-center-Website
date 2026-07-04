-- Add new parent/tax columns
ALTER TABLE "StudentProfile" ADD COLUMN "fatherName" TEXT;
ALTER TABLE "StudentProfile" ADD COLUMN "fatherPhone" TEXT;
ALTER TABLE "StudentProfile" ADD COLUMN "motherName" TEXT;
ALTER TABLE "StudentProfile" ADD COLUMN "motherPhone" TEXT;
ALTER TABLE "StudentProfile" ADD COLUMN "primaryContact" TEXT;
ALTER TABLE "StudentProfile" ADD COLUMN "afm" TEXT;
ALTER TABLE "StudentProfile" ADD COLUMN "doy" TEXT;

-- Preserve existing single-parent data into fatherName/fatherPhone as a best-effort default
UPDATE "StudentProfile" SET "fatherName" = "parentName" WHERE "parentName" IS NOT NULL;
UPDATE "StudentProfile" SET "fatherPhone" = "parentPhone" WHERE "parentPhone" IS NOT NULL;
UPDATE "StudentProfile" SET "primaryContact" = 'FATHER' WHERE "parentPhone" IS NOT NULL;

-- Drop old single-parent columns (superseded by fatherName/fatherPhone/motherName/motherPhone)
ALTER TABLE "StudentProfile" DROP COLUMN "parentName";
ALTER TABLE "StudentProfile" DROP COLUMN "parentPhone";
