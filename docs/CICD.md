# CI/CD

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

The root `sonar-project.properties` analyzes `client` and `server`. Configure `SONAR_TOKEN` as a GitHub secret and `SONAR_HOST_URL` as a repository variable when using self-hosted SonarQube. For SonarCloud, configure the organization/project in SonarCloud and disable Automatic Analysis when CI analysis is enabled; CI analysis and Automatic Analysis cannot run together. Set repository variable `SONAR_ENABLE_CI_SCAN=true` only when Automatic Analysis is disabled and you want GitHub Actions to run SonarQube scan and quality gate steps.

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
