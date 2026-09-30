import { writeFile } from "node:fs/promises";

const required = [
  "ACCEL_API_URL",
  "ACCEL_PROJECT",
  "ACCEL_PIPELINE",
  "ACCEL_TOKEN",
  "COMMIT_SHA",
  "BRANCH",
  "RELEASE_ID",
  "ARTIFACT_VERSION",
  "ENVIRONMENT",
  "TRIGGERED_BY",
];

const missing = required.filter((name) => !process.env[name]);
if (missing.length > 0) {
  console.error(`Accel contract is not configured. Missing: ${missing.join(", ")}`);
  process.exit(1);
}

const metadata = {
  commitSha: process.env.COMMIT_SHA,
  branch: process.env.BRANCH,
  releaseId: process.env.RELEASE_ID,
  artifactVersion: process.env.ARTIFACT_VERSION,
  environment: process.env.ENVIRONMENT,
  triggeredBy: process.env.TRIGGERED_BY,
  deploymentTimestamp: new Date().toISOString(),
};

await writeFile("accel-deployment.json", `${JSON.stringify(metadata, null, 2)}\n`);
console.log(JSON.stringify(metadata, null, 2));
console.error(
  "No Accel request was sent: no documented Accel API or action exists in this repository. Replace this adapter with the organization-owned interface before enabling deployment.",
);
process.exit(1);