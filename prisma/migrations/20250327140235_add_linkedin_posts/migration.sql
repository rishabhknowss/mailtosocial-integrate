-- CreateTable
CREATE TABLE "PostedLinkedInPost" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "postedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PostedLinkedInPost_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PostedLinkedInPost_userId_idx" ON "PostedLinkedInPost"("userId");

-- CreateIndex
CREATE INDEX "PostedLinkedInPost_postedAt_idx" ON "PostedLinkedInPost"("postedAt");

-- AddForeignKey
ALTER TABLE "PostedLinkedInPost" ADD CONSTRAINT "PostedLinkedInPost_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
