UPDATE "User" SET "role" = 'USER' WHERE "role" = 'ADMIN';

ALTER TABLE "User" ALTER COLUMN "role" DROP DEFAULT;
ALTER TYPE "UserRole" RENAME TO "UserRole_old";
CREATE TYPE "UserRole" AS ENUM ('MASTER', 'USER');
ALTER TABLE "User" ALTER COLUMN "role" TYPE "UserRole"
  USING ("role"::text::"UserRole");
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'USER';
DROP TYPE "UserRole_old";

DO $$
BEGIN
  IF (SELECT COUNT(*) FROM "User" WHERE "role" = 'MASTER') > 1 THEN
    RAISE EXCEPTION 'role migration requires at most one MASTER';
  END IF;
END $$;

CREATE UNIQUE INDEX "User_single_master_key"
  ON "User" ((1)) WHERE "role" = 'MASTER';

ALTER TABLE "Conversation" ADD COLUMN "directUserId" TEXT;
CREATE UNIQUE INDEX "Conversation_directUserId_key"
  ON "Conversation"("directUserId");
ALTER TABLE "Conversation"
  ADD CONSTRAINT "Conversation_directUserId_fkey"
  FOREIGN KEY ("directUserId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

DO $$
DECLARE
  master_count INTEGER;
  user_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO master_count FROM "User" WHERE "role" = 'MASTER';
  SELECT COUNT(*) INTO user_count FROM "User" WHERE "role" = 'USER';
  IF user_count > 0 AND master_count <> 1 THEN
    RAISE EXCEPTION 'direct conversation backfill requires exactly one MASTER';
  END IF;
END $$;

INSERT INTO "Conversation" ("id", "title", "directUserId", "createdAt", "updatedAt")
SELECT 'direct-' || u."id", NULL, u."id", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "User" u
WHERE u."role" = 'USER'
  AND NOT EXISTS (
    SELECT 1 FROM "Conversation" c WHERE c."directUserId" = u."id"
  );

INSERT INTO "ConversationMember" ("id", "conversationId", "userId", "createdAt")
SELECT 'direct-user-' || u."id", c."id", u."id", CURRENT_TIMESTAMP
FROM "User" u
JOIN "Conversation" c ON c."directUserId" = u."id"
ON CONFLICT ("conversationId", "userId") DO NOTHING;

INSERT INTO "ConversationMember" ("id", "conversationId", "userId", "createdAt")
SELECT 'direct-master-' || u."id", c."id", m."id", CURRENT_TIMESTAMP
FROM "User" u
JOIN "Conversation" c ON c."directUserId" = u."id"
CROSS JOIN "User" m
WHERE u."role" = 'USER' AND m."role" = 'MASTER'
ON CONFLICT ("conversationId", "userId") DO NOTHING;
