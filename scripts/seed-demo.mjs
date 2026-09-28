/**
 * Seeds demo accounts and sample reports for tomorrow's presentation.
 * Run against a local server after it has initialised the SQLite database:
 *   node scripts/seed-demo.mjs http://127.0.0.1:3100
 */
import { spawnSync } from "node:child_process";
import path from "node:path";

const base = process.argv[2] || "http://127.0.0.1:3100";
const ORIGIN = base;
const student = {
  name: "Aanya Sharma",
  email: "aanya.demo@rvu.edu.in",
  password: "DemoStudent2026!",
  studentId: "RVU24CSE001",
  department: "School of Computer Science & Engineering",
};
const finder = {
  name: "Rohan Mehta",
  email: "rohan.demo@rvu.edu.in",
  password: "DemoFinder2026!",
  studentId: "RVU24CSE014",
  department: "School of Computer Science & Engineering",
};
const staffEmail = "staff.demo@rvu.edu.in";
const staffPassword = "DemoStaff2026!!";
const staffName = "Campus Lost & Found Desk";

class Client {
  cookie = "";
  async post(action, payload = {}, expected = 200) {
    const r = await fetch(`${base}/api/rvu`, {
      method: "POST",
      headers: {
        Origin: ORIGIN,
        "Content-Type": "application/json",
        Cookie: this.cookie,
      },
      body: JSON.stringify({ action, ...payload }),
    });
    const set = r.headers.get("set-cookie");
    if (set) this.cookie = set.split(";")[0];
    const json = await r.json().catch(() => ({}));
    if (r.status !== expected) {
      throw new Error(`${action} → ${r.status}: ${JSON.stringify(json)}`);
    }
    return json;
  }
}

async function ensureStudent(client, profile) {
  try {
    const signup = await client.post("signup", { ...profile, role: "student" });
    if (signup.developmentLink) {
      const token = new URL(signup.developmentLink).searchParams.get("token");
      await client.post("verify", { token });
    }
  } catch (e) {
    const msg = String(e.message);
    if (!msg.includes("already") && !msg.includes("exists") && !msg.includes("400")) {
      // Try login if account may already exist
    }
  }
  await client.post("login", {
    email: profile.email,
    password: profile.password,
  });
}

async function main() {
  // Warm-up so SQLite file is created
  const warm = await fetch(`${base}/api/rvu`);
  if (!warm.ok) throw new Error(`Server not ready at ${base}`);

  const result = spawnSync(
    process.execPath,
    [
      "--env-file-if-exists=.env.local",
      path.join("scripts", "staff.mjs"),
      staffEmail,
      staffName,
    ],
    {
      cwd: process.cwd(),
      env: {
        ...process.env,
        RVU_STAFF_PASSWORD: staffPassword,
        // Always seed into the app database, never a leftover test DB path.
        RVU_DB_PATH: path.join(process.cwd(), "data", "rvu.sqlite"),
      },
      encoding: "utf8",
    },
  );
  if (result.status !== 0 && !String(result.stderr + result.stdout).includes("already exists")) {
    console.error(result.stdout);
    console.error(result.stderr);
    throw new Error("Staff provisioning failed");
  }

  const owner = new Client();
  const foundBy = new Client();
  await ensureStudent(owner, student);
  await ensureStudent(foundBy, finder);

  const today = new Date().toLocaleDateString("en-CA", {
    timeZone: "Asia/Kolkata",
  });

  const lost = await owner.post("create_report", {
    kind: "lost",
    title: "Black Sony WH-1000XM4 headphones",
    category: "Electronics",
    color: "Black",
    brand: "Sony",
    description:
      "Over-ear wireless headphones with a small scratch on the left ear cup.",
    location: "Library",
    date: today,
    department: student.department,
    privateDetail: "Left ear cup has a silver scratch near the hinge.",
  });

  const found = await foundBy.post("create_report", {
    kind: "found",
    title: "Black Sony headphones",
    category: "Electronics",
    color: "Black",
    brand: "Sony",
    description:
      "Black over-ear headphones found near the reading tables. Soft case missing.",
    location: "Library",
    date: today,
    department: finder.department,
    privateDetail: "Scratch on the left ear cup near the hinge.",
  });

  await foundBy.post("create_report", {
    kind: "found",
    title: "Blue metal water bottle",
    category: "Other",
    color: "Blue",
    brand: "Milton",
    description: "Blue steel bottle with a dent near the base.",
    location: "Cafeteria",
    date: today,
    department: finder.department,
    privateDetail: "Dented near the base; sticker of a mountain on the side.",
  });

  console.log(`
Demo ready at ${base}

STUDENT (owner / claimant)
  Email:    ${student.email}
  Password: ${student.password}

STUDENT (finder)
  Email:    ${finder.email}
  Password: ${finder.password}

STAFF (Staff Login tab)
  Email:    ${staffEmail}
  Password: ${staffPassword}

Sample data
  Lost report:  ${lost.id || "(created)"}
  Found match:  ${found.id || "(created)"}
  Extra found:  Blue metal water bottle

Demo script tip:
  1. Log in as Aanya → Home / Campus Board / My Reports
  2. Log in as Rohan (or guest) → I Found Something
  3. Staff Login → Staff Desk → Custody inventory → Claims → Return
`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
