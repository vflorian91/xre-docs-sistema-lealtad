-- CreateTable
CREATE TABLE "CustomerCodeSequence" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "nextValue" INTEGER NOT NULL DEFAULT 1,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerCodeSequence_pkey" PRIMARY KEY ("id")
);
