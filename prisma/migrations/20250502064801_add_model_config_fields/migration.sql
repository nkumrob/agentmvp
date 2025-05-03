-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ModelConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "baseModel" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'openai',
    "temperature" REAL NOT NULL DEFAULT 0.7,
    "maxTokens" INTEGER NOT NULL DEFAULT 1000,
    "topP" REAL,
    "frequencyPenalty" REAL,
    "presencePenalty" REAL,
    "systemPrompt" TEXT,
    "finetuningMethod" TEXT,
    "status" TEXT NOT NULL,
    "checkpoints" TEXT,
    "agentId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "activeModelId" TEXT,
    CONSTRAINT "ModelConfig_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_ModelConfig" ("activeModelId", "agentId", "baseModel", "checkpoints", "createdAt", "finetuningMethod", "id", "status", "updatedAt") SELECT "activeModelId", "agentId", "baseModel", "checkpoints", "createdAt", "finetuningMethod", "id", "status", "updatedAt" FROM "ModelConfig";
DROP TABLE "ModelConfig";
ALTER TABLE "new_ModelConfig" RENAME TO "ModelConfig";
CREATE UNIQUE INDEX "ModelConfig_agentId_key" ON "ModelConfig"("agentId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
