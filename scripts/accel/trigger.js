import { writeFile } from "node:fs/promises";

const required = [
  "ACCEL_API_URL",
  "ACCEL_PROJECT",
  "ACCEL_PIPELINE",
  "ACCEL_TOKEN",
];

const missing = required.filter((name) => !process.env[name]);
if (missing.length > 0) {
  console.warn(
    `Accel integration is not configured. Skipping deployment handoff. Missing: ${missing.join(", ")}`,
  );
  process.exit(0);
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

if (Object.values(metadata).some((value) => !value)) {
  console.error("Accel deployment metadata is incomplete.");
  process.exit(1);
}

await writeFile("accel-deployment.json", `${JSON.stringify(metadata, null, 2)}\n`);
console.log(JSON.stringify({
  message: "Accel deployment contract validated",
  project: process.env.ACCEL_PROJECT,
  pipeline: process.env.ACCEL_PIPELINE,
  apiUrl: process.env.ACCEL_API_URL,
  metadata,
}, null, 2));
console.error(
  "No Accel request was sent: the repository contains no documented Accel API contract. Connect this adapter to the organization-owned Accel interface before enabling deployment.",
);
