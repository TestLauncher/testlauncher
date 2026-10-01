# Secure submission checklist

Status: preview source; NOT submitted, approved or published in the directory.
Hosted endpoint/OAuth readiness is not verified by this package work. Directory
launch is pending hosted OAuth/reviewer verification and publisher access.
This checklist is a release gate, not a record of successful directory review.

## Reported implementation progress

- Backend implementer confirms capture_get_profile is implemented and report_id
  is a UUID. See MCP-CONTRACT.md for the remaining assumptions.
- Parent reports two passing focused local database/UI smoke checks. These were
  not independently rerun here and do not verify hosted OAuth, reviewer access,
  directory approval, or execution of the eight proposed review cases.

## Public content and package

- [ ] Review every allowlisted file and final ZIP for private source, internal
  infrastructure, customer identifiers, personal data and secrets. Automated
  scanning is a limited backstop, not a substitute for human inspection.
- [ ] Run offline Node tests, source validation, deterministic build and ZIP
  validation. Record the SHA-256, source revision and exact file inventory.
- [ ] Run the opt-in portable-schema check; record fetched schema hashes. Review
  OpenAI extension requirements separately, including an approved primary listing
  icon and composer icon before distribution. No listing assets are bundled yet.
- [ ] Review the public GitHub diff separately: ZIP allowlisting does not protect
  other committed files. Do not publish test output or private reviewer details.
- [ ] Confirm package MIT notice and existing bugAgent license wording. Confirm
  publisher identity and public product/repository URLs before release.

## Endpoint and review gates

- [ ] Confirm deployment and independently verify the intended restricted HTTPS endpoint;
  do not replace it with the broader MCP service. Remove preview claims only when
  the corresponding checks have evidence.
- [ ] Confirm every assumption in MCP-CONTRACT.md with tools/list. Verify secure
  authentication, entitlements, expiry/revocation, tenant isolation, denied-scope
  failures, the five-tool allowlist, input limits and rate limiting.
- [ ] Verify capture_get_profile accepts only an empty object, uses validated
  credentials, returns a stable opaque id, and publishes the official profile
  metadata/outputSchema. Test identity stability across reconnect and token
  refresh, distinct identities for distinct accounts, and failure on invalid auth.
- [ ] Verify write approval and request-id validation, idempotency/retry behavior,
  accurate tool annotations and no unintended downstream writes or uploads.
- [ ] Prepare a dedicated sample-data reviewer account, never customer data. Supply
  access details only through private portal review fields, never GitHub or ZIP.
  Verify the complete hosted OAuth sign-in and reviewer flow before submission.
- [ ] Run and record all five positive and three negative cases in REVIEW-CASES.md
  against that account after separate authorization for live tests. They are
  currently unexecuted; offline unit tests are not substitutes.
- [ ] Confirm public privacy policy, service terms, support contact, retention and
  deletion disclosures with the publisher. Add verified metadata only using the
  then-current official schema; do not invent URLs, contacts or registration IDs.
  Public website, support, privacy and terms destinations have been HTTP-verified
  and are recorded in README.md; this does not complete disclosure review.
- [ ] Require a complete working runtime before submission. Listing descriptions
  omit preview/trial/demo wording; the README still records the preview state.

## OpenAI submission (manual, not performed by build)

- [ ] Re-read the official submission guide; confirm verified publisher identity
  and the publisher's submission access (currently pending). Include the MCP
  configuration in the initial ZIP.
- [ ] Upload the reviewed ZIP, resolve package/skill findings, configure the MCP
  connection and complete the portal's domain challenge and secure authentication.
- [ ] Review discovered tools and server scan findings; correct and rescan as needed.
- [ ] Enter private reviewer credentials separately; supply executed review cases,
  accessible walkthrough video, release notes and required listing information.
- [ ] Submit for review. Only after approval make a separate publishing decision.
  Local discovery, package validation and upload are not directory approval.

Sources: [package format](https://developers.openai.com/plugins/build/plugins),
[submission process](https://developers.openai.com/plugins/deploy/submission).
