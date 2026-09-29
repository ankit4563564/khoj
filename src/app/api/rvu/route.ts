import { NextResponse } from "next/server";
import {
  account,
  all,
  audit,
  claim,
  id,
  matchReport,
  notify,
  now,
  one,
  report,
  run,
  transaction,
} from "@/lib/rvu/db";
import {
  choice,
  createSession,
  domains,
  emailAllowed,
  hash,
  HttpError,
  logout,
  originCheck,
  passwordHash,
  passwordMatches,
  rateLimit,
  requireUser,
  sessionUser,
  text,
} from "@/lib/rvu/auth";
import { sendAccountLink } from "@/lib/rvu/email";
import { completeHandover, ensureHandover } from '@/lib/rvu/recovery';
import {
  categories,
  departments,
  type Claim,
  type Report,
} from "@/lib/rvu/types";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const json = (data: unknown, status = 200) =>
  NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } });
const fail = (error: unknown) => {
  if (error instanceof HttpError)
    return json({ error: error.message }, error.status);
  console.error("RVU request failed:", error);
  return json({ error: "Something went wrong. Please try again." }, 500);
};

export async function GET() {
  try {
    const user = await sessionUser();
    const config = {
      google: Boolean(
        (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) ||
          (process.env.NEXT_PUBLIC_SUPABASE_URL &&
            (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
              process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)),
      ),
      vision: Boolean(process.env.GEMINI_API_KEY),
      email: Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM),
      domains: domains(),
    };
    if (!user || !user.verified)
      return json({
        user: user || null,
        config,
        reports: [],
        claims: [],
        matches: [],
        notifications: [],
        audit: [],
        registeredItems: [],activity: [],handovers: [],foundIds: [],
        pipeline: {found:0,matching:0,verification:0,returned:0},identityStats: {total:0,linked:0,pending:0},
        stats: { lost: 0, found: 0, returned: 0, custody: 0 },
      });
    const staff = user.role === "staff";
    const reports = all<Report & { reporterName: string }>(
      "SELECT r.*,u.name AS reporterName FROM reports r JOIN users u ON u.id=r.userId ORDER BY r.createdAt DESC",
    ).map(({ privateDetail, reporterName, userId, ...r }) => ({
      ...r,
      userId: userId === user.id || staff ? userId : "",
      isMine: userId === user.id,
      ...(staff || userId === user.id ? { privateDetail, reporterName } : {}),
    }));
    const claims = staff
      ? all<Claim>(
          "SELECT c.*,u.name AS claimantName,u.email AS claimantEmail,u.studentId AS claimantStudentId,r.title AS reportTitle FROM claims c JOIN users u ON u.id=c.userId JOIN reports r ON r.id=c.reportId ORDER BY c.createdAt DESC",
        )
      : all<Claim>(
          "SELECT c.*,r.title AS reportTitle FROM claims c JOIN reports r ON r.id=c.reportId WHERE c.userId=? ORDER BY c.createdAt DESC",
          user.id,
        );
    const matches = all(
      "SELECT m.*,f.title,f.imageId,f.location FROM matches m JOIN reports l ON l.id=m.lostId JOIN reports f ON f.id=m.foundId WHERE l.userId=? AND l.status='open' AND f.status IN ('open','in_custody') ORDER BY m.score DESC",
      user.id,
    );
    const notifications = all(
      "SELECT id,title,href,read,createdAt FROM notifications WHERE userId=? ORDER BY createdAt DESC LIMIT 100",
      user.id,
    );
    const events = staff
      ? all(
          "SELECT a.*,u.name AS actorName FROM audit a JOIN users u ON u.id=a.actorId ORDER BY a.createdAt DESC LIMIT 100",
        )
      : [];
    return json({
      user,
      config,
      reports,
      claims,
      matches,
      notifications,
      audit: events,
      registeredItems: all('SELECT * FROM protected_items WHERE userId=? ORDER BY createdAt DESC',user.id),
      activity: all('SELECT * FROM activity ORDER BY createdAt DESC LIMIT 40'),
      pipeline: {
        found: one<{n:number}>("SELECT COUNT(*) AS n FROM reports WHERE kind='found' AND status IN ('open','in_custody')")!.n,
        matching: one<{n:number}>("SELECT COUNT(DISTINCT m.foundId) AS n FROM matches m JOIN reports f ON f.id=m.foundId JOIN reports l ON l.id=m.lostId WHERE f.status IN ('open','in_custody') AND l.status='open'")!.n,
        verification: one<{n:number}>("SELECT COUNT(*) AS n FROM claims WHERE status IN ('pending','approved')")!.n,
        returned: one<{n:number}>("SELECT COUNT(*) AS n FROM reports WHERE kind='found' AND status='returned'")!.n,
      },
      identityStats: staff ? {total:one<{n:number}>("SELECT COUNT(*) AS n FROM users WHERE role='student'")!.n,linked:one<{n:number}>("SELECT COUNT(*) AS n FROM identity_links WHERE status='LINKED'")!.n,pending:one<{n:number}>("SELECT COUNT(*) AS n FROM identity_links WHERE status='REQUIRES_REVIEW'")!.n} : {total:0,linked:0,pending:0},
      handovers: all<import('@/lib/rvu/types').Handover>('SELECT * FROM handovers WHERE ownerId=? OR finderId=?',user.id,user.id).map(h=>({...h,ownerId:h.ownerId===user.id?h.ownerId:'',finderId:h.finderId===user.id?h.finderId:'',isOwner:h.ownerId===user.id,isFinder:h.finderId===user.id,ownerConfirmed:Boolean(h.ownerConfirmed),finderConfirmed:Boolean(h.finderConfirmed)})),
      foundIds: all("SELECT f.reportId,r.location,r.status,f.createdAt FROM found_ids f JOIN reports r ON r.id=f.reportId WHERE f.targetUserId=? ORDER BY f.createdAt DESC",user.id),
      stats: {
        lost: reports.filter((r) => r.kind === "lost" && r.status === "open")
          .length,
        found: reports.filter(
          (r) =>
            r.kind === "found" && !["closed", "returned"].includes(r.status),
        ).length,
        returned: reports.filter(
          (r) => r.kind === "found" && r.status === "returned",
        ).length,
        custody: reports.filter((r) => r.status === "in_custody").length,
      },
    });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(req: Request) {
  try {
    originCheck(req);
    if (Number(req.headers.get("content-length")) > 50000)
      throw new HttpError(413, "Request is too large.");
    const raw = await req.text();
    if (raw.length > 50000) throw new HttpError(413, "Request is too large.");
    let body;
    try {
      body = JSON.parse(raw);
    } catch {
      throw new HttpError(400, "Invalid request.");
    }
    if (!body || typeof body !== "object" || Array.isArray(body))
      throw new HttpError(400, "Invalid request.");
    const { action, ...p } = body;
    if (action === "signup") {
      const email = text(p.email, "Email", 3, 254).toLowerCase();
      rateLimit(`signup:${email}`, 5);
      if (!emailAllowed(email))
        throw new HttpError(
          400,
          `Use your @${domains().join(" or @")} email address.`,
        );
      if (
        process.env.NODE_ENV === "production" &&
        (!process.env.RESEND_API_KEY || !process.env.EMAIL_FROM)
      )
        throw new HttpError(
          503,
          "Email verification is not configured yet. Contact the site administrator.",
        );
      const name = text(p.name, "Full name", 2, 100),
        studentId = text(p.studentId, "Student ID", 3, 50),
        department = choice(p.department, departments, "school");
      const password = await passwordHash(
        text(p.password, "Password", 10, 128),
      );
      if (one("SELECT id FROM users WHERE email=?", email))
        throw new HttpError(
          409,
          "An account already exists. Log in or reset your password.",
        );
      const userId = id("user");
      run(
        "INSERT INTO users (id,name,email,studentId,department,password,createdAt) VALUES (?,?,?,?,?,?,?)",
        userId,
        name,
        email,
        studentId,
        department,
        password,
        now(),
      );
      await createSession(userId);
      const developmentLink = await sendAccountLink(
        userId,
        email,
        "verify",
        new URL(req.url).origin,
      );
      return json({
        ok: true,
        developmentLink,
        message: "Check your university email to verify your account.",
      });
    }
    if (action === "login") {
      const email = text(p.email, "Email", 3, 254).toLowerCase();
      rateLimit(`login:${email}`, 15);
      const user = one<{ id: string; password: string | null; role: string }>(
        "SELECT id,password,role FROM users WHERE email=?",
        email,
      );
      const valid = await passwordMatches(
        text(p.password, "Password", 1, 128),
        user?.password || "",
      );
      if (!user || !valid)
        throw new HttpError(401, "Email or password is incorrect.");
      if (p.role === "staff" && user.role !== "staff")
        throw new HttpError(403, "This account does not have staff access.");
      await createSession(user.id);
      run("DELETE FROM rate_limits WHERE key=?", `login:${email}`);
      return json({ ok: true, user: account(user.id) });
    }
    if (action === "logout") {
      await logout();
      return json({ ok: true });
    }
    if (action === "resend") {
      const user = await sessionUser();
      if (!user) throw new HttpError(401, "Please log in first.");
      if (user.verified) return json({ ok: true });
      rateLimit(`resend:${user.id}`, 3, 3600);
      const developmentLink = await sendAccountLink(
        user.id,
        user.email,
        "verify",
        new URL(req.url).origin,
      );
      return json({
        ok: true,
        developmentLink,
        message: "Verification email sent.",
      });
    }
    if (action === "forgot") {
      const email = text(p.email, "Email", 3, 254).toLowerCase();
      rateLimit(`reset:${email}`, 3, 3600);
      const user = one<{ id: string }>(
        "SELECT id FROM users WHERE email=?",
        email,
      );
      const developmentLink = user
        ? await sendAccountLink(
            user.id,
            email,
            "reset",
            new URL(req.url).origin,
          )
        : undefined;
      return json({
        ok: true,
        developmentLink,
        message: "If that account exists, a password reset link has been sent.",
      });
    }
    if (action === "verify" || action === "reset") {
      const token = hash(text(p.token, "Token", 32, 128));
      const entry = one<{ userId: string }>(
        "SELECT userId FROM tokens WHERE token=? AND purpose=? AND expires>?",
        token,
        action,
        Date.now(),
      );
      if (!entry)
        throw new HttpError(
          400,
          "This link is invalid or expired. Request a new link.",
        );
      const password =
        action === "reset"
          ? await passwordHash(text(p.password, "Password", 10, 128))
          : undefined;
      transaction(() => {
        // Re-read inside the transaction so a token cannot be consumed twice.
        if (!one("SELECT token FROM tokens WHERE token=?", token))
          throw new HttpError(400, "This link has already been used.");
        if (password) {
          run("UPDATE users SET password=? WHERE id=?", password, entry.userId);
          run("DELETE FROM sessions WHERE userId=?", entry.userId);
        } else run("UPDATE users SET verified=1 WHERE id=?", entry.userId);
        run("DELETE FROM tokens WHERE token=?", token);
      });
      await createSession(entry.userId);
      return json({ ok: true });
    }
    const user = await requireUser();
    if (action === "create_report") {
      rateLimit(`reports:${user.id}`, 30, 3600);
      const kind = choice(p.kind, ["lost", "found"] as const, "report type");
      const date = text(p.date, "Date", 10, 10);
      if (
        !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
        !Number.isFinite(Date.parse(date)) ||
        new Date(date).toISOString().slice(0, 10) !== date ||
        date >
          new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" })
      )
        throw new HttpError(
          400,
          "Choose a valid date that is not in the future.",
        );
      const imageId =
        typeof p.imageId === "string" && p.imageId ? p.imageId : null;
      if (
        imageId &&
        !one("SELECT id FROM uploads WHERE id=? AND userId=?", imageId, user.id)
      )
        throw new HttpError(
          400,
          "Photo upload was not found. Please upload it again.",
        );
      const record: Report = {
        id: `RVU-${new Date().getFullYear()}-${id("").replaceAll("-", "").slice(0, 12).toUpperCase()}`,
        userId: user.id,
        kind,
        title: text(p.title, "Item name", 3, 100),
        category: choice(p.category, categories, "category"),
        color: text(p.color || "", "Colour", 0, 60),
        brand: text(p.brand || "", "Brand", 0, 80),
        description: text(p.description, "Description", 10, 2000),
        privateDetail: text(
          p.privateDetail || "",
          "Private identifying detail",
          0,
          1000,
        ),
        location: text(p.location, "Location", 2, 150),
        date,
        department: choice(p.department, departments, "school"),
        status: "open",
        imageId,
        createdAt: now(),
        custodyLocation: "",
      };
      transaction(() => {
        run(
          "INSERT INTO reports (id,userId,kind,title,category,color,brand,description,privateDetail,location,date,department,status,imageId,createdAt,custodyLocation) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
          record.id,
          record.userId,
          record.kind,
          record.title,
          record.category,
          record.color,
          record.brand,
          record.description,
          record.privateDetail!,
          record.location,
          record.date,
          record.department,
          record.status,
          record.imageId,
          record.createdAt,
          "",
        );
        matchReport(record);
        audit(
          user.id,
          record.id,
          `${kind === "lost" ? "Lost" : "Found"} report submitted`,
        );
      });
      return json({ ok: true, id: record.id });
    }
    if (action === "claim") {
      rateLimit(`claims:${user.id}`, 20, 3600);
      const reportId = text(p.reportId, "Report ID"),
        proof = text(p.proof, "Ownership evidence", 20, 2000);
      const lostReportId =
        typeof p.lostReportId === "string" && p.lostReportId
          ? p.lostReportId
          : null;
      transaction(() => {
        const found = report(reportId);
        if (
          !found ||
          found.kind !== "found" ||
          !["open", "in_custody"].includes(found.status)
        )
          throw new HttpError(409, "This item is not accepting claims.");
        if (found.userId === user.id)
          throw new HttpError(
            400,
            "You cannot claim an item you reported as found.",
          );
        if (lostReportId) {
          const lost = report(lostReportId);
          if (
            !lost ||
            lost.userId !== user.id ||
            lost.kind !== "lost" ||
            lost.status !== "open"
          )
            throw new HttpError(400, "Select one of your open lost reports.");
        }
        if (
          one(
            "SELECT id FROM claims WHERE userId=? AND reportId=?",
            user.id,
            reportId,
          )
        )
          throw new HttpError(
            409,
            "You already have a claim for this item. Check My Reports.",
          );
        run(
          "INSERT INTO claims (id,reportId,userId,lostReportId,proof,createdAt) VALUES (?,?,?,?,?,?)",
          id("claim"),
          reportId,
          user.id,
          lostReportId,
          proof,
          now(),
        );
        audit(user.id, reportId, "Ownership claim submitted");
        for (const staff of all<{ id: string }>(
          "SELECT id FROM users WHERE role='staff'",
        ))
          notify(staff.id, `New claim: ${found.title}`, "/hod");
        notify(user.id, `Claim submitted for ${found.title}`, "/status");
      });
      return json({ ok: true });
    }
    if (action === "close_report") {
      const record = report(text(p.reportId, "Report ID"));
      if (!record || record.userId !== user.id)
        throw new HttpError(404, "Report not found.");
      if (record.kind !== "lost" || record.status !== "open")
        throw new HttpError(409, "Only open lost reports can be closed.");
      transaction(() => {
        run("UPDATE reports SET status='closed' WHERE id=?", record.id);
        run("UPDATE protected_items SET status='safe',lostReportId=NULL WHERE lostReportId=?",record.id);
        audit(user.id, record.id, "Owner closed lost report");
      });
      return json({ ok: true });
    }
    if (action === "read_notifications") {
      run("UPDATE notifications SET read=1 WHERE userId=?", user.id);
      return json({ ok: true });
    }
    if (action === "custody") {
      await requireUser(true);
      const reportId = text(p.reportId, "Report ID"),
        location = text(p.custodyLocation, "Custody desk", 3, 150);
      transaction(() => {
        const found = report(reportId);
        if (!found || found.kind !== "found" || found.status !== "open")
          throw new HttpError(
            409,
            "Only open found items can be accepted into custody.",
          );
        run(
          "UPDATE reports SET status='in_custody',custodyLocation=? WHERE id=?",
          location,
          reportId,
        );
        audit(user.id, reportId, `Received into custody at ${location}`);
        notify(
          found.userId,
          `${found.title} received at ${location}`,
          "/status",
        );
      });
      return json({ ok: true });
    }
    if (action === "review_claim") {
      await requireUser(true);
      const claimId = text(p.claimId, "Claim ID"),
        decision = choice(
          p.decision,
          ["approved", "rejected"] as const,
          "decision",
        ),
        note = text(p.note, "Review note", 5, 1000);
      transaction(() => {
        const c = claim(claimId);
        if (!c || c.status !== "pending")
          throw new HttpError(409, "This claim has already been reviewed.");
        const found = report(c.reportId)!;
        if (c.userId === user.id || found.userId === user.id)
          throw new HttpError(
            403,
            "Another staff member must review a claim involving your own report or account.",
          );
        if (decision === "approved" && found.status !== "in_custody")
          throw new HttpError(
            409,
            "Receive the item into staff custody before approving ownership.",
          );
        if (
          decision === "approved" &&
          one(
            "SELECT id FROM claims WHERE reportId=? AND status IN ('approved','returned')",
            c.reportId,
          )
        )
          throw new HttpError(409, "An owner has already been approved.");
        run(
          "UPDATE claims SET status=?,staffNote=? WHERE id=?",
          decision,
          note,
          claimId,
        );
        if (decision === "approved") {
          run("UPDATE reports SET status='approved' WHERE id=?", found.id);
          ensureHandover(found.id,c.userId,found.custodyLocation||'RVU campus reception');
          const others = all<Claim>(
            "SELECT * FROM claims WHERE reportId=? AND id<>? AND status='pending'",
            found.id,
            claimId,
          );
          for (const other of others) {
            run(
              "UPDATE claims SET status='rejected',staffNote='Another claim was verified by staff.' WHERE id=?",
              other.id,
            );
            notify(other.userId, `Claim update: ${found.title}`, "/status");
          }
        }
        audit(user.id, found.id, `Claim ${decision}: ${note}`);
        notify(
          c.userId,
          `Your claim for ${found.title} was ${decision}`,
          "/status",
        );
      });
      return json({ ok: true });
    }
    if (action === "return_item") {
      await requireUser(true);
      const claimId = text(p.claimId, "Claim ID"),
        note = text(p.note, "Handover note", 5, 1000);
      transaction(() => {
        const c = claim(claimId);
        if (!c || c.status !== "approved")
          throw new HttpError(409, "An approved ownership claim is required.");
        const found = report(c.reportId)!;
        if (found.status !== "approved")
          throw new HttpError(409, "This item is not awaiting handover.");
        if (c.userId === user.id || found.userId === user.id)
          throw new HttpError(
            403,
            "Another staff member must complete this handover.",
          );
        ensureHandover(found.id,c.userId,found.custodyLocation||'RVU campus reception');
        const handover=one<{finderConfirmed:number}>('SELECT finderConfirmed FROM handovers WHERE reportId=?',found.id)!;
        if(handover.finderConfirmed)throw new HttpError(409,'Custodian confirmation is already recorded. Waiting for the owner.');
        run('UPDATE handovers SET finderConfirmed=1 WHERE reportId=?',found.id);
        audit(user.id, found.id, `Custodian confirmed handover: ${note}`);
        notify(c.userId,'Please confirm you received your item to complete the return.','/status');
        completeHandover(found.id,user.id);
      });
      return json({ ok: true });
    }
    throw new HttpError(400, "Unknown action.");
  } catch (error) {
    return fail(error);
  }
}
