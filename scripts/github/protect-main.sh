#!/usr/bin/env bash
# WB-001: apply branch protection to main in the Webubble-owned repo.
# Run once the repo exists and the caller is an org admin:
#   scripts/github/protect-main.sh <org>/<repo>
set -euo pipefail

REPO="${1:?usage: protect-main.sh <org>/<repo>}"

gh api --method PUT "repos/${REPO}/branches/main/protection" --input - <<'JSON'
{
  "required_status_checks": {
    "strict": true,
    "contexts": ["ci-ok", "references-task"]
  },
  "enforce_admins": true,
  "required_pull_request_reviews": {
    "required_approving_review_count": 1,
    "require_code_owner_reviews": true,
    "dismiss_stale_reviews": true,
    "require_last_push_approval": true
  },
  "restrictions": null,
  "required_linear_history": true,
  "allow_force_pushes": false,
  "allow_deletions": false,
  "required_conversation_resolution": true
}
JSON

echo "Branch protection applied to ${REPO}@main."
