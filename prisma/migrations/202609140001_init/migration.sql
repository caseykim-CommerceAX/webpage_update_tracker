-- CreateTable
CREATE TABLE "Target" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "displayOrder" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "monitorMode" TEXT NOT NULL DEFAULT 'CONTENT',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
CREATE UNIQUE INDEX "Target_displayOrder_key" ON "Target"("displayOrder");

CREATE TABLE "Endpoint" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "targetId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "referenceUrl" TEXT,
    "lifecycle" TEXT NOT NULL DEFAULT 'EXISTING',
    "launchedAt" DATETIME,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "retiredAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Endpoint_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "Target" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "Endpoint_targetId_enabled_idx" ON "Endpoint"("targetId", "enabled");
CREATE INDEX "Endpoint_url_idx" ON "Endpoint"("url");

CREATE TABLE "Rule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "targetId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "selector" TEXT,
    "attribute" TEXT,
    "expectedValue" TEXT,
    "expectedStatuses" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Rule_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "Target" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "Rule_targetId_enabled_idx" ON "Rule"("targetId", "enabled");

CREATE TABLE "Run" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "source" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'QUEUED',
    "targetIdsJson" TEXT,
    "totalCount" INTEGER NOT NULL DEFAULT 0,
    "processedCount" INTEGER NOT NULL DEFAULT 0,
    "changedCount" INTEGER NOT NULL DEFAULT 0,
    "failureCount" INTEGER NOT NULL DEFAULT 0,
    "pendingCount" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" DATETIME,
    "completedAt" DATETIME
);
CREATE INDEX "Run_createdAt_idx" ON "Run"("createdAt");
CREATE INDEX "Run_status_idx" ON "Run"("status");

CREATE TABLE "EndpointCheck" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "runId" TEXT NOT NULL,
    "endpointId" TEXT NOT NULL,
    "requestedUrl" TEXT NOT NULL,
    "finalUrl" TEXT,
    "httpStatus" INTEGER,
    "availabilityStatus" TEXT NOT NULL,
    "changeStatus" TEXT NOT NULL,
    "responseMs" INTEGER,
    "errorMessage" TEXT,
    "snapshotId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EndpointCheck_runId_fkey" FOREIGN KEY ("runId") REFERENCES "Run" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "EndpointCheck_endpointId_fkey" FOREIGN KEY ("endpointId") REFERENCES "Endpoint" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "EndpointCheck_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "Snapshot" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "EndpointCheck_runId_idx" ON "EndpointCheck"("runId");
CREATE INDEX "EndpointCheck_endpointId_createdAt_idx" ON "EndpointCheck"("endpointId", "createdAt");

CREATE TABLE "Snapshot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "endpointId" TEXT NOT NULL,
    "hash" TEXT NOT NULL,
    "tokensJson" TEXT NOT NULL,
    "diffJson" TEXT,
    "previousSnapshotId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Snapshot_endpointId_fkey" FOREIGN KEY ("endpointId") REFERENCES "Endpoint" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "Snapshot_endpointId_createdAt_idx" ON "Snapshot"("endpointId", "createdAt");

CREATE TABLE "RuleResult" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "checkId" TEXT NOT NULL,
    "ruleId" TEXT,
    "ruleType" TEXT NOT NULL,
    "ruleLabel" TEXT NOT NULL,
    "configJson" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "actualValue" TEXT,
    "message" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RuleResult_checkId_fkey" FOREIGN KEY ("checkId") REFERENCES "EndpointCheck" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RuleResult_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "Rule" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "RuleResult_checkId_idx" ON "RuleResult"("checkId");
