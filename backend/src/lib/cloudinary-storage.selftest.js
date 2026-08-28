// Standalone regression check for diagram cache-bust helpers - no test
// framework is configured in this project, so this runs with plain node:
//
//   node src/lib/cloudinary-storage.selftest.js
//
// Pins the version derivation that makes replace/crop actually show the
// new image: same public_id, different created_at => different version.
import { assetCacheVersion } from "./diagram-cache-version.js";

const cases = [
  {
    name: "Date input keeps millisecond precision",
    input: new Date("2026-08-27T12:00:00.500Z"),
    expected: Date.parse("2026-08-27T12:00:00.500Z"),
  },
  {
    name: "ISO string input matches Date input",
    input: "2026-08-27T12:00:00.500Z",
    expected: Date.parse("2026-08-27T12:00:00.500Z"),
  },
  {
    name: "replace (new created_at) produces a different version than extract",
    extractAt: "2026-08-01T00:00:00.000Z",
    replaceAt: "2026-08-27T12:00:00.000Z",
  },
  {
    name: "crop in the same second as replace still differs",
    extractAt: "2026-08-27T12:00:00.100Z",
    replaceAt: "2026-08-27T12:00:00.800Z",
  },
];

let failed = 0;
for (const testCase of cases) {
  if (testCase.extractAt) {
    const extractVersion = assetCacheVersion(testCase.extractAt);
    const replaceVersion = assetCacheVersion(testCase.replaceAt);
    if (extractVersion === replaceVersion) {
      failed += 1;
      console.error(`FAIL: ${testCase.name}`);
      console.error(`  extract=${extractVersion} replace=${replaceVersion}`);
    } else {
      console.log(`ok  - ${testCase.name}`);
    }
    continue;
  }
  const actual = assetCacheVersion(testCase.input);
  if (actual !== testCase.expected) {
    failed += 1;
    console.error(`FAIL: ${testCase.name}`);
    console.error(`  expected ${testCase.expected}, got ${actual}`);
  } else {
    console.log(`ok  - ${testCase.name}`);
  }
}

const invalid = assetCacheVersion("not-a-date");
if (!Number.isInteger(invalid) || invalid <= 0) {
  failed += 1;
  console.error("FAIL: invalid date should fall back to a positive unix timestamp");
} else {
  console.log("ok  - invalid date falls back to now");
}

if (failed > 0) {
  console.error(`\n${failed} failing`);
  process.exitCode = 1;
} else {
  console.log("\nall passed");
}
