CREATE TABLE "InternalUserPermission" (
  "userId" TEXT NOT NULL,
  "permissionId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "InternalUserPermission_pkey" PRIMARY KEY ("userId", "permissionId")
);

ALTER TABLE "InternalUserPermission"
ADD CONSTRAINT "InternalUserPermission_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "InternalUser"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "InternalUserPermission"
ADD CONSTRAINT "InternalUserPermission_permissionId_fkey"
FOREIGN KEY ("permissionId") REFERENCES "Permission"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
