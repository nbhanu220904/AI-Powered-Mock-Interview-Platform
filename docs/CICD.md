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

## Current architecture

Pull requests targeting `dev` run client validation, server validation, the optional PyTest job, SonarQube analysis, and a final required gate. The `dev` branch workflow then prepares release metadata for the exact merged commit and validates the Accel deployment contract.

This repository currently contains no documented Accel action, API contract, deployment command, container definition, registry, or hosting configuration. The Accel adapter therefore deliberately does not send a fabricated request. It fails until the organization supplies the real interface.

## Required repository configuration

Configure these values on the `DEV` GitHub environment:

- Variables: `ACCEL_API_URL`, `ACCEL_PROJECT`, `ACCEL_PIPELINE`
- Secret: `ACCEL_TOKEN`

The adapter is `scripts/accel/trigger.js`. An Accel owner must replace its final validation-only section with the approved organization interface. That interface must accept `COMMIT_SHA`, `RELEASE_ID`, `ARTIFACT_VERSION`, `ENVIRONMENT`, `BRANCH`, `TRIGGERED_BY`, and the deployment timestamp.

Do not enable the DEV workflow as a successful deployment until that interface is implemented and verified. UAT and PROD promotion, including the two four-hour waits, must remain in Accel so the same immutable artifact can be promoted without rebuilding.

## SonarQube

The root `sonar-project.properties` analyzes `client` and `server`. Configure `SONAR_TOKEN` as a GitHub secret and `SONAR_HOST_URL` as a repository variable when using self-hosted SonarQube. For SonarCloud, configure the organization/project in SonarCloud and disable Automatic Analysis when this CI workflow is enabled; CI analysis and Automatic Analysis cannot run together.

## Branch protection

Protect `dev` with a pull request requirement, at least one approval, required status check `PR Validation - Final Gate`, up-to-date branches, disabled force pushes, and no direct pushes. Configure these rules in GitHub repository settings; this repository does not modify branch protection automatically.

## Promotion contract

The release identity is derived from the merged commit SHA. Accel must build or publish once, record the resulting immutable artifact, deploy it to DEV, wait four hours after DEV success before UAT, and wait four hours after UAT success before PROD. A failed DEV blocks UAT; a failed UAT blocks PROD. Every promotion must verify that the commit SHA, release ID, and artifact version are unchanged.

## Local checks

```bash
cd client && npm ci && npm run build
cd ../server && npm ci && node --check server.js
```

There are currently no JavaScript or Python test files in the repository, so the test jobs remain real no-op checks rather than fabricated tests.
