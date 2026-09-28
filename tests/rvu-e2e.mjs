// Integration coverage against an isolated local development server/database.
// Run: RVU_DB_PATH=<isolated path> node tests/rvu-e2e.mjs http://127.0.0.1:3100
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { randomUUID, randomBytes, scryptSync } from "node:crypto";
import path from "node:path";
const base = process.argv[2] || "http://127.0.0.1:3100";
if (
  !["127.0.0.1", "localhost"].includes(new URL(base).hostname) ||
  !process.env.RVU_DB_PATH?.includes(".test-data")
)
  throw new Error("Use localhost and an explicit .test-data database.");
const dbPath = path.resolve(process.env.RVU_DB_PATH);
const password = "Test-only-password-2026!";
let passed = 0;
function check(condition, message) {
  assert.ok(condition, message);
  passed++;
  console.log(`PASS ${message}`);
}
class Client {
  cookie = "";
  async post(action, payload = {}, expected = 200) {
    return this.postAt('',action,payload,expected);
  }
  async postAt(path,action,payload={},expected=200){
    const r = await fetch(`${base}/api/rvu${path}`, {
      method: "POST",
      headers: {
        Origin: base,
        "Content-Type": "application/json",
        Cookie: this.cookie,
      },
      body: JSON.stringify({ action, ...payload }),
    });
    const set = r.headers.get("set-cookie");
    if (set) this.cookie = set.split(";")[0];
    const json = await r.json();
    assert.equal(r.status, expected, `${action}: ${JSON.stringify(json)}`);
    return json;
  }
  async get() {
    const r = await fetch(`${base}/api/rvu`, {
      headers: { Cookie: this.cookie },
    });
    assert.equal(r.status, 200);
    return r.json();
  }
}
const owner = new Client(),
  finder = new Client(),
  staff = new Client(),
  stranger = new Client();
check(
  (await owner.get()).user === null,
  "anonymous response contains no user or reports",
);
await owner.post("create_report", {}, 401);
passed++;
const badOrigin = await fetch(`${base}/api/rvu`, {
  method: "POST",
  headers: {
    Origin: "https://attacker.example",
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ action: "signup" }),
});
check(badOrigin.status === 403, "cross-origin mutation rejected");
await owner.post("signup", { email: "wrong@gmail.com" }, 400);
passed++;
const stamp = Date.now();
for (const [client, name] of [
  [owner, "Owner"],
  [finder, "Finder"],
  [stranger, "Stranger"],
]) {
  const result = await client.post("signup", {
    name: `Test ${name}`,
    email: `${name.toLowerCase()}.${stamp}@rvu.edu.in`,
    password,
    studentId: `RVU-${name}`,
    department: "School of Computer Science & Engineering",
    role: "staff",
  });
  check(
    Boolean(result.developmentLink),
    "development signup produces local verification preview",
  );
  check(
    !(await client.get()).user.verified,
    "unverified signup is not treated as verified",
  );
  check(
    (await client.get()).user.role === "student",
    "signup cannot self-assign a staff role",
  );
  await client.post("create_report", {}, 403);
  passed++;
  const token = new URL(result.developmentLink).searchParams.get("token");
  await client.post("verify", { token });
  check(
    (await client.get()).user.verified,
    "one-time email token verifies account",
  );
  await client.post("verify", { token }, 400);
  passed++;
}
const db = new DatabaseSync(dbPath),
  staffId = `staff-${randomUUID()}`,
  staffEmail = `staff.${stamp}@rvu.edu.in`,
  salt = randomBytes(32).toString("hex");
db.prepare(
  "INSERT INTO users (id,name,email,studentId,department,role,verified,password,createdAt) VALUES (?,?,?,?,?,'staff',1,?,?)",
).run(
  staffId,
  "Test Staff",
  staffEmail,
  "RVU-STAFF",
  "Other",
  `${salt}:${scryptSync(password, salt, 64).toString("hex")}`,
  new Date().toISOString(),
);
db.close();
await staff.post("login", { email: staffEmail, password, role: "staff" });
check(
  (await staff.get()).user.role === "staff",
  "staff login uses server role",
);
await owner.post(
  "custody",
  { reportId: "fake", custodyLocation: "Library" },
  403,
);
passed++;
const fields = {
  title: "Black Sony headphones",
  category: "Electronics",
  color: "Black",
  brand: "Sony",
  description: "Black Sony wireless headphones with a padded headband",
  privateDetail: "Private orange star engraving under left ear cup",
  location: "Library",
  date: new Date().toISOString().slice(0, 10),
  department: "School of Computer Science & Engineering",
};
const lost = await owner.post("create_report", { ...fields, kind: "lost" });
const found = await finder.post("create_report", { ...fields, kind: "found" });
const ownerData = await owner.get();
check(
  ownerData.matches.some((m) => m.foundId === found.id),
  "lost-first matching creates a suggestion",
);
check(
  ownerData.notifications.some((n) => n.href === `/items/${found.id}`),
  "match notification created",
);
const external = (await stranger.get()).reports.find((r) => r.id === found.id);
check(
  !("privateDetail" in external) &&
    !("reporterName" in external) &&
    external.userId === "",
  "private identifying details and reporter identity are not exposed",
);
await finder.post(
  "claim",
  {
    reportId: found.id,
    proof: "This item has a unique private engraving under the left ear cup.",
  },
  400,
);
passed++;
await owner.post("claim", {
  reportId: found.id,
  lostReportId: lost.id,
  proof: "Private orange star engraving under left ear cup, bought last month.",
});
check(
  (await stranger.get()).claims.length === 0,
  "claims are scoped to the claimant",
);
await owner.post(
  "claim",
  {
    reportId: found.id,
    proof: "Repeated claim with sufficiently long evidence.",
  },
  409,
);
passed++;
let c = (await staff.get()).claims.find((c) => c.reportId === found.id);
check(c.proof.includes("orange star"), "staff can inspect ownership evidence");
await staff.post(
  "review_claim",
  {
    claimId: c.id,
    decision: "approved",
    note: "Verified the private engraving.",
  },
  409,
);
passed++;
await staff.post(
  "return_item",
  { claimId: c.id, note: "Identity verified." },
  409,
);
passed++;
await staff.post("custody", {
  reportId: found.id,
  custodyLocation: "RVU Library reception",
});
await staff.post("review_claim", {
  claimId: c.id,
  decision: "approved",
  note: "Verified the orange engraving against the physical item.",
});
check(
  (await owner.get()).claims[0].status === "approved",
  "claim advances after staff custody and evidence review",
);
await staff.post("return_item", {
  claimId: c.id,
  note: "Checked physical RVU ID; handed item to owner.",
});
check((await owner.get()).reports.find(r=>r.id===found.id).status==='approved','custodian alone cannot complete the return');
await stranger.postAt('/items','confirm_owner',{reportId:found.id},403);passed++;
await owner.postAt('/items','confirm_owner',{reportId:found.id});
const returned = await owner.get();
check(
  returned.reports.find((r) => r.id === lost.id).status === "returned" &&
    returned.reports.find((r) => r.id === found.id).status === "returned",
  "handover atomically closes both reports",
);
await staff.post(
  "return_item",
  { claimId: c.id, note: "Repeated handover attempt." },
  409,
);
passed++;
check(
  (await staff.get()).audit.some((a) =>
    a.action.includes("Returned to verified owner"),
  ),
  "handover audit is recorded",
);
check(returned.matches.length === 0, "resolved matches no longer shown");
const secondFound = await finder.post("create_report", {
  ...fields,
  title: "Blue water bottle",
  category: "Other",
  color: "Blue",
  brand: "Milton",
  description: "Blue Milton steel water bottle near library",
  kind: "found",
});
await owner.post("create_report", {
  ...fields,
  title: "Blue water bottle",
  category: "Other",
  color: "Blue",
  brand: "Milton",
  description: "Blue Milton steel water bottle near library",
  kind: "lost",
});
check(
  (await owner.get()).matches.some((m) => m.foundId === secondFound.id),
  "found-first matching also works",
);
await owner.post("read_notifications");
check(
  (await owner.get()).notifications.every((n) => n.read),
  "notifications can be marked read",
);
const privateBefore = (await owner.get()).reports.find((r) => r.id === lost.id);
check(
  privateBefore.privateDetail === fields.privateDetail,
  "owner retains access to private evidence",
);
const ownerEmail = (await owner.get()).user.email;
const reset = await owner.post("forgot", { email: ownerEmail });
const token = new URL(reset.developmentLink).searchParams.get("token");
const oldSession = owner.cookie;
await owner.post("reset", { token, password: "New-test-only-password!" });
const old = new Client();
old.cookie = oldSession;
check((await old.get()).user === null, "password reset revokes old sessions");
await owner.post("logout");
check((await owner.get()).user === null, "logout invalidates session");
await owner.post("login", { email: ownerEmail, password }, 401);
passed++;
await owner.post("login", {
  email: ownerEmail,
  password: "New-test-only-password!",
});
check(
  (await owner.get()).user.email === ownerEmail,
  "new password works after reset",
);
const oldApi = await fetch(`${base}/api/db`);
check(oldApi.status === 410, "legacy insecure API retired");
const upload = new FormData();
upload.set(
  "file",
  new Blob(["<svg>bad</svg>"], { type: "image/svg+xml" }),
  "bad.svg",
);
const badFile = await fetch(`${base}/api/rvu/upload`, {
  method: "POST",
  headers: { Origin: base, Cookie: finder.cookie },
  body: upload,
});
check(badFile.status === 400, "unsafe image type rejected");
const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a+XQAAAAASUVORK5CYII=",
  "base64",
);
const imageForm = new FormData();
imageForm.set("file", new Blob([png], { type: "image/png" }), "pixel.png");
const goodFile = await fetch(`${base}/api/rvu/upload`, {
  method: "POST",
  headers: { Origin: base, Cookie: finder.cookie },
  body: imageForm,
});
check(goodFile.status === 200, "valid photo upload accepted");
const uploaded = await goodFile.json();
const noImageAccess = await fetch(`${base}/api/rvu/images/${uploaded.id}`);
check(noImageAccess.status === 401, "photos require authentication");
const otherImage = await fetch(`${base}/api/rvu/images/${uploaded.id}`, {
  headers: { Cookie: owner.cookie },
});
check(otherImage.status === 404, "unattached photos are private to uploader");
await owner.post(
  "create_report",
  { ...fields, kind: "lost", imageId: uploaded.id },
  400,
);
passed++;
console.log(`\n${passed} checks passed. Test records exist only in ${dbPath}.`);
console.log(`Browser test owner: ${ownerEmail} / New-test-only-password!`);
console.log(`Browser test staff: ${staffEmail} / ${password}`);
