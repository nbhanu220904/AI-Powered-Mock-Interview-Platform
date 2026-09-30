# CI/CD

## Implemented GitHub flow

Pull requests targeting `dev` run client validation, server validation, the optional PyTest job, SonarQube analysis, and the final gate. A push to `dev` checks out the exact merged SHA, builds the client once, validates the server, and publishes a SHA-named GitHub Actions artifact with release metadata.

The artifact identity is `mock-interview-${COMMIT_SHA}` and the release identity is `REL-${COMMIT_SHA}`. The artifact must be promoted unchanged through DEV, UAT, and PROD.

## Accel integration status

No Accel action, API contract, reusable workflow, deployment command, registry, or hosting configuration exists in this repository. `scripts/accel/trigger.js` is therefore a non-deploying adapter contract. It intentionally exits with failure after validating metadata so a placeholder cannot be mistaken for a successful deployment.

An Accel owner must replace the final section with the approved organization-owned interface. Do not invent an endpoint or action. The interface must accept `COMMIT_SHA`, `BRANCH`, `RELEASE_ID`, `ARTIFACT_VERSION`, `ENVIRONMENT`, `TRIGGERED_BY`, and the artifact reference.

## Required GitHub configuration

On the `DEV` environment, define variables `ACCEL_API_URL`, `ACCEL_PROJECT`, and `ACCEL_PIPELINE`, plus secret `ACCEL_TOKEN`. These names are placeholders only. Configure `SONAR_TOKEN` as a secret and `SONAR_HOST_URL` as a variable for self-hosted SonarQube. For SonarCloud, disable Automatic Analysis when CI analysis is enabled.

Accel must own DEV deployment, the four-hour DEV-to-UAT delay, UAT deployment, the four-hour UAT-to-PROD delay, PROD approval, promotion locks, smoke tests, notifications, and rollback. UAT and PROD must reference the published SHA-named artifact and stop on failed preceding gates.

## Branch protection

Protect `dev` with required pull requests, approvals, the `PR Validation - Final Gate` status check, up-to-date branches, disabled force pushes, and no direct pushes. Configure this in GitHub settings; workflows do not modify repository rules.

## Testing and troubleshooting

The repository currently has no JavaScript or Python test files, so the existing test jobs are successful N/A checks. Add real Jest/Vitest or PyTest tests and the existing conditional jobs will run them.

If Sonar reports that Automatic Analysis is enabled, disable it in SonarCloud project administration. If the DEV workflow fails at the Accel adapter, that is expected until the organization-specific Accel interface is supplied.