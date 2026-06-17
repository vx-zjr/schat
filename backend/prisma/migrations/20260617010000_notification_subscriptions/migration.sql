ALTER TABLE "NotificationSubscription"
ADD COLUMN "p256dh" TEXT,
ADD COLUMN "auth" TEXT,
ADD COLUMN "platform" TEXT,
ADD COLUMN "deviceId" TEXT,
ADD COLUMN "revokedAt" TIMESTAMP(3),
ADD COLUMN "lastSeenAt" TIMESTAMP(3);
