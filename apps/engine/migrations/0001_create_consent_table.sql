-- Create consent table for GDPR compliance
CREATE TABLE consents (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  campaign_id TEXT NOT NULL,
  subject_id TEXT NOT NULL, -- userId
  domain TEXT NOT NULL,
  
  -- Consent purposes as JSON text
  purposes TEXT NOT NULL, -- JSON object: {"essential": true, "analytics": true, "marketing": false, "functional": true}
  
  status TEXT NOT NULL CHECK(status IN ('active', 'withdrawn', 'expired')),
  given_at INTEGER NOT NULL, -- Unix timestamp
  expires_at INTEGER, -- Unix timestamp, NULL if no expiry
  
  -- Metadata
  ip TEXT,
  user_agent TEXT,
  
  -- Timestamps
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch())
);

-- Create indexes for efficient querying
CREATE INDEX idx_consent_subject ON consents(subject_id);
CREATE INDEX idx_consent_campaign ON consents(campaign_id, subject_id);
CREATE INDEX idx_consent_workspace ON consents(workspace_id, subject_id);
CREATE INDEX idx_consent_status ON consents(status);
CREATE INDEX idx_consent_expires ON consents(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX idx_consent_domain ON consents(domain);

-- Create unique constraint to prevent duplicate active consents for same subject/campaign/domain
CREATE UNIQUE INDEX idx_consent_unique_active ON consents(subject_id, campaign_id, domain, status) WHERE status = 'active';