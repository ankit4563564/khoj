import { DatabaseSync } from "node:sqlite";
import { randomUUID, randomBytes, scryptSync } from "node:crypto";
import path from "node:path";
import fs from "node:fs";
const [emailArg, nameArg] = process.argv.slice(2);
const email = emailArg?.trim().toLowerCase();
const domains = (process.env.RVU_EMAIL_DOMAINS || "rvu.edu.in")
  .split(",")
  .map((s) => s.trim());
if (
  !email ||
  !domains.includes(email.split("@")[1]) ||
  !nameArg ||
  !process.env.RVU_STAFF_PASSWORD ||
  process.env.RVU_STAFF_PASSWORD.length < 12
) {
  console.error(
    'Usage: set RVU_STAFF_PASSWORD to a password of at least 12 characters, then run npm run staff -- staff@rvu.edu.in "Staff Name". The email must belong to an allowed university domain.',
  );
  process.exit(1);
}
const file =
  process.env.RVU_DB_PATH || path.join(process.cwd(), "data", "rvu.sqlite");
if (!fs.existsSync(file)) {
  console.error("Start the app and open it once to initialise the database.");
  process.exit(1);
}
const db = new DatabaseSync(file);
db.exec("PRAGMA busy_timeout=5000;");
const existing = db.prepare("SELECT id FROM users WHERE email=?").get(email);
if (existing) {
  console.error(
    "That account already exists. This command never silently promotes or overwrites accounts. Use a new staff email, or have the operator explicitly update an existing account after verifying identity.",
  );
  process.exit(1);
}
const salt = randomBytes(32).toString("hex"),
  password = `${salt}:${scryptSync(process.env.RVU_STAFF_PASSWORD, salt, 64).toString("hex")}`;
db.prepare(
  "INSERT INTO users (id,name,email,studentId,department,role,verified,password,createdAt) VALUES (?,?,?,?,?,'staff',1,?,?)",
).run(
  `user-${randomUUID()}`,
  nameArg,
  email,
  "STAFF",
  "Other",
  password,
  new Date().toISOString(),
);
db.close();
console.log(
  `Staff account provisioned for ${email}. Share credentials securely and verify the staff member's identity before granting access.`,
);
