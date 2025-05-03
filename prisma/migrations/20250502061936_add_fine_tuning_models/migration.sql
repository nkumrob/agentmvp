-- AlterTable
ALTER TABLE "ModelConfig" ADD COLUMN "activeModelId" TEXT;

-- CreateTable
CREATE TABLE "FineTuningJob" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "jobId" TEXT,
    "status" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "fineTunedModel" TEXT,
    "trainingFile" TEXT,
    "validationFile" TEXT,
    "hyperparameters" TEXT,
    "resultMetrics" TEXT,
    "modelConfigId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "completedAt" DATETIME,
    CONSTRAINT "FineTuningJob_modelConfigId_fkey" FOREIGN KEY ("modelConfigId") REFERENCES "ModelConfig" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TrainingExample" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "messages" TEXT NOT NULL,
    "fineTuningJobId" TEXT,
    "userId" TEXT NOT NULL,
    "source" TEXT,
    "tags" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TrainingExample_fineTuningJobId_fkey" FOREIGN KEY ("fineTuningJobId") REFERENCES "FineTuningJob" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
