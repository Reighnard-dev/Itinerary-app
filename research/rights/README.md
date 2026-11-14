# Rights evidence and release checks

See [COPYRIGHT-AUDIT.md](../../COPYRIGHT-AUDIT.md) for the remediation, scope limits and launch handoff. Current machine-readable results are in inventory.json, needs-review.json and validation.json. Source-photo API snapshots are in commons-evidence/; exact retained asset hashes are in asset-evidence.json.

The release gate checks technical evidence and delivery controls, not ownership warranties or jurisdiction-specific legal clearance. Unresolved former assets are held privately in gitignored data/rights-quarantine/ and must never be deployed. A passing gate is not a statement of zero legal risk.

Run npm run build, npm test, npm run test:e2e and npm run release:check. New assets require new evidence; never bypass the gate to publish an uncleared catalog.
