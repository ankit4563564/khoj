import Link from "next/link";
import {
  ScanLine,
  GraduationCap,
  ShieldCheck,
  BellRing,
  ArrowUpRight,
  MoveRight,
} from "lucide-react";
import { Mark } from "./Shell";
export default function About() {
  return (
    <div className="rv-about">
      <section className="rv-about-hero">
        <Mark large />
        <span className="rv-eyebrow">LOST & FOUND · RV UNIVERSITY</span>
        <h1>
          Some things deserve
          <br />
          to <em>find their way back.</em>
        </h1>
        <p>
          Your campus recovery platform. Report a lost item, help someone find
          theirs, and leave the handover in safe hands.
        </p>
        <div className="rv-actions">
          <Link href="/login" className="rv-button primary">
            Open KHOJ <ArrowUpRight size={18} />
          </Link>
          <Link href="/report/found" className="rv-button">
            I found something
          </Link>
        </div>
        <span className="rv-hero-caption">
          For the things you carry. And the people who care.
        </span>
      </section>
      <section className="rv-mission">
        <div>
          <span className="rv-eyebrow">A SMALL ACT. A BIG DIFFERENCE.</span>
          <h2>Our campus mission.</h2>
        </div>
        <div>
          <p>
            A forgotten notebook. A misplaced pair of earbuds. The ID card you
            need before your next class. Losing something on campus shouldn’t
            mean losing hope.
          </p>
          <p>
            KHOJ brings RV University’s lost and found into one place,
            connecting students through item reports, possible matches, and
            staff-verified returns.
          </p>
        </div>
      </section>
      <section className="rv-capabilities">
        <div className="rv-section-heading">
          <div>
            <span className="rv-eyebrow">BUILT AROUND YOUR CAMPUS</span>
            <h2>A better way to bring it back.</h2>
          </div>
          <span className="rv-section-number">01 — 04</span>
        </div>
        <div className="rv-feature-grid">
          {[
            {
              Icon: ScanLine,
              title: "Smarter item discovery",
              text: "Search campus reports by category, location and colour. Get possible matches when a similar item is reported.",
            },
            {
              Icon: GraduationCap,
              title: "Your RVU community",
              text: "University email verification keeps the board within the @rvu.edu.in community.",
            },
            {
              Icon: ShieldCheck,
              title: "Staff desk",
              text: "Campus staff keep found items safe, check ownership claims, and confirm every return.",
            },
            {
              Icon: BellRing,
              title: "Stay in the loop",
              text: "In-app notifications keep you updated on possible matches, claim reviews and successful returns.",
            },
          ].map(({ Icon, title, text }, i) => (
            <article key={title} className="rv-feature">
              <div className="rv-between">
                <Icon size={25} strokeWidth={1.5} />
                <span>0{i + 1}</span>
              </div>
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="rv-how">
        <div className="rv-section-heading">
          <div>
            <span className="rv-eyebrow">FROM LOST TO REUNITED</span>
            <h2>Three steps closer to home.</h2>
          </div>
        </div>
        <div className="rv-steps">
          {[
            [
              "Report it",
              "Add the item details, where it went missing or was found, and a photo if you have one.",
            ],
            [
              "Find a possible match",
              "Browse the board or check your match suggestions. Submit a private claim with identifying details.",
            ],
            [
              "Collect it safely",
              "Staff check the evidence and your identity, then record the return at the custody desk.",
            ],
          ].map(([title, description], i) => (
            <article key={title}>
              <span className="rv-step-number">0{i + 1}</span>
              <h3>{title}</h3>
              <p>{description}</p>
            </article>
          ))}
        </div>
        <Link href="/signup" className="rv-inline-link">
          Be part of the campus that cares <MoveRight size={19} />
        </Link>
      </section>
    </div>
  );
}
