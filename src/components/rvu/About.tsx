"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ShieldCheck,
  Search,
  Sparkles,
  ArrowRight,
  ArrowUpRight,
  Lock,
  CheckCircle2,
  QrCode,
  MapPin,
  HeartHandshake,
  Layers,
  Clock,
  EyeOff,
} from "lucide-react";
import { Mark } from "./Shell";
import {
  FadeUp,
  StaggerList,
  StaggerChild,
  InteractiveJourney,
} from "./MotionPrimitives";
import {
  fadeUpVariants,
  staggerContainerVariants,
  staggerItemVariants,
} from "@/lib/motion";

export default function About() {
  const steps = [
    {
      num: "01",
      title: "Protect",
      summary: "Register your essentials before anything happens.",
      detail:
        "Add your AirPods, laptop, or backpack with a private detail only you know (e.g. sticker under case, scratch near hinge).",
      icon: ShieldCheck,
      badge: "Pre-Loss Protection",
    },
    {
      num: "02",
      title: "Find",
      summary: "Anyone who finds it can report it in seconds.",
      detail:
        "Zero friction. The finder doesn't need to create an account or download an app. Just upload a photo and location.",
      icon: Sparkles,
      badge: "No Account Needed",
    },
    {
      num: "03",
      title: "Match",
      summary: "Intelligent matching connects the dots.",
      detail:
        "KHOJ flags potential matches privately. We never broadcast your personal phone number, roll number, or name.",
      icon: Search,
      badge: "Blind Algorithm",
    },
    {
      num: "04",
      title: "Recover",
      summary: "Verified ownership and safe desk handover.",
      detail:
        "Answer the blind challenge to confirm ownership. Collect at the campus reception desk with dual verification.",
      icon: CheckCircle2,
      badge: "Safe Return",
    },
  ];

  const trustPillars = [
    {
      icon: EyeOff,
      title: "Blind Ownership Verification",
      desc: "Finders and public browsers never see who owns what. Claims are verified only through your pre-registered secret details.",
    },
    {
      icon: Lock,
      title: "Campus-Verified Network",
      desc: "Owners and staff authenticate via official institutional credentials, ensuring zero spam or fabricated claims.",
    },
    {
      icon: HeartHandshake,
      title: "Dual-Confirmed Handover",
      desc: "Both owner and finder or staff confirm physical receipt on their devices before any case is closed.",
    },
  ];

  return (
    <div className="rv-about">
      {/* Hero Section */}
      <section className="rv-about-hero">
        <motion.div
          variants={staggerContainerVariants}
          initial="hidden"
          animate="visible"
          style={{ width: "100%", display: "flex", flexDirection: "column", alignItems: "center" }}
        >
          <motion.div variants={staggerItemVariants} className="kh-journey-pill" style={{ marginBottom: 20 }}>
            <span className="kh-pulse-dot" />
            <span>CAMPUS RECOVERY PROTOCOL • RV UNIVERSITY</span>
          </motion.div>

          <motion.div variants={staggerItemVariants}>
            <Mark large />
          </motion.div>

          <motion.h1
            variants={staggerItemVariants}
            style={{
              fontSize: "clamp(2.5rem, 5.5vw, 4.4rem)",
              fontWeight: 800,
              letterSpacing: "-0.04em",
              lineHeight: 1.08,
              textAlign: "center",
              marginTop: 18,
              marginBottom: 16,
              maxWidth: 820,
            }}
          >
            Lost something?
            <br />
            <span style={{ color: "var(--rv-blue)" }}>Let&apos;s get it back.</span>
          </motion.h1>

          <motion.p
            variants={staggerItemVariants}
            style={{
              fontSize: "clamp(1.05rem, 1.8vw, 1.25rem)",
              color: "var(--rv-muted)",
              textAlign: "center",
              maxWidth: 620,
              lineHeight: 1.55,
              marginBottom: 28,
            }}
          >
            Register your important belongings once. If they ever go missing,
            KHOJ helps connect them with the people who find them.
          </motion.p>

          <motion.div variants={staggerItemVariants} className="kh-cta-row">
            <Link href="/report/lost" className="kh-primary-glow-btn">
              <Search size={18} />
              I Lost Something
            </Link>
            <Link href="/report/found" className="kh-secondary-outline-btn">
              <Sparkles size={18} />
              I Found Something
              <span className="kh-zero-login-badge">30s • No login</span>
            </Link>
          </motion.div>

          <motion.div
            variants={staggerItemVariants}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 20,
              marginTop: 22,
              fontSize: "0.82rem",
              color: "var(--rv-ghost)",
              flexWrap: "wrap",
              justifyContent: "center",
            }}
          >
            <span>✓ Verified Campus Desks</span>
            <span>•</span>
            <span>✓ Blind Privacy Guard</span>
            <span>•</span>
            <span>✓ Optional ₹20 Thank-You</span>
          </motion.div>
        </motion.div>

        {/* Visual Storytelling Element */}
        <FadeUp delay={0.2}>
          <InteractiveJourney />
        </FadeUp>
      </section>

      {/* How KHOJ Works Section */}
      <section className="rv-how" style={{ paddingTop: 64, paddingBottom: 64 }}>
        <FadeUp>
          <div className="rv-section-heading">
            <div>
              <span className="rv-eyebrow">HOW KHOJ WORKS</span>
              <h2>Four steps from missing to recovered.</h2>
            </div>
            <span className="rv-section-number">01 — 04</span>
          </div>
        </FadeUp>

        <StaggerList className="rv-steps" style={{ marginTop: 32 }}>
          {steps.map((s) => {
            const Icon = s.icon;
            return (
              <StaggerChild key={s.num}>
                <article
                  style={{
                    background: "var(--rv-panel)",
                    border: "1px solid var(--rv-line)",
                    borderRadius: 14,
                    padding: 26,
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
                    position: "relative",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: 16,
                    }}
                  >
                    <div
                      style={{
                        width: 42,
                        height: 42,
                        borderRadius: 10,
                        background: "var(--rv-soft)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "var(--rv-blue)",
                      }}
                    >
                      <Icon size={22} strokeWidth={1.75} />
                    </div>
                    <span
                      style={{
                        fontFamily: "Manrope, sans-serif",
                        fontSize: "1.4rem",
                        fontWeight: 800,
                        color: "var(--rv-ghost)",
                      }}
                    >
                      {s.num}
                    </span>
                  </div>

                  <span
                    style={{
                      fontSize: "0.68rem",
                      fontWeight: 750,
                      letterSpacing: "0.08em",
                      color: "var(--rv-blue)",
                      textTransform: "uppercase",
                      marginBottom: 6,
                    }}
                  >
                    {s.badge}
                  </span>

                  <h3
                    style={{
                      fontSize: "1.25rem",
                      fontWeight: 750,
                      color: "var(--rv-text)",
                      marginBottom: 8,
                    }}
                  >
                    {s.title}
                  </h3>

                  <p
                    style={{
                      fontSize: "0.94rem",
                      fontWeight: 550,
                      color: "var(--rv-text)",
                      marginBottom: 8,
                      lineHeight: 1.45,
                    }}
                  >
                    {s.summary}
                  </p>

                  <p
                    style={{
                      fontSize: "0.85rem",
                      color: "var(--rv-muted)",
                      lineHeight: 1.5,
                      marginTop: "auto",
                    }}
                  >
                    {s.detail}
                  </p>
                </article>
              </StaggerChild>
            );
          })}
        </StaggerList>
      </section>

      {/* Trust & Privacy Section */}
      <section className="rv-capabilities" style={{ paddingTop: 32, paddingBottom: 64 }}>
        <FadeUp>
          <div className="rv-section-heading">
            <div>
              <span className="rv-eyebrow">PRIVACY & TRUST PROTOCOL</span>
              <h2>Designed to protect, not expose.</h2>
            </div>
          </div>
        </FadeUp>

        <StaggerList className="rv-feature-grid" style={{ marginTop: 28 }}>
          {trustPillars.map((p) => {
            const Icon = p.icon;
            return (
              <StaggerChild key={p.title}>
                <article className="rv-feature" style={{ height: "100%" }}>
                  <div className="rv-between" style={{ marginBottom: 16 }}>
                    <div
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 10,
                        background: "rgba(99, 102, 241, 0.1)",
                        border: "1px solid rgba(99, 102, 241, 0.25)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "var(--rv-blue)",
                      }}
                    >
                      <Icon size={24} strokeWidth={1.75} />
                    </div>
                  </div>
                  <h3 style={{ fontSize: "1.1rem", marginBottom: 8 }}>{p.title}</h3>
                  <p style={{ fontSize: "0.9rem", lineHeight: 1.55 }}>{p.desc}</p>
                </article>
              </StaggerChild>
            );
          })}
        </StaggerList>
      </section>

      {/* Quick Action Banner */}
      <section
        style={{
          background: "var(--rv-panel)",
          border: "1px solid var(--rv-line)",
          borderRadius: 16,
          padding: "44px 28px",
          textAlign: "center",
          maxWidth: 980,
          margin: "0 auto 60px",
          boxShadow: "0 18px 45px rgba(0,0,0,0.3)",
        }}
      >
        <FadeUp>
          <span className="rv-eyebrow" style={{ color: "var(--rv-emerald)" }}>
            CAMPUS-WIDE RECOVERY
          </span>
          <h2 style={{ fontSize: "clamp(1.6rem, 3vw, 2.2rem)", marginTop: 8, marginBottom: 12 }}>
            Never lose peace of mind on campus again.
          </h2>
          <p
            style={{
              maxWidth: 540,
              margin: "0 auto 24px",
              color: "var(--rv-muted)",
              fontSize: "1rem",
            }}
          >
            Join hundreds of RV University students protecting their everyday essentials.
          </p>
          <div className="kh-cta-row">
            <Link href="/signup" className="kh-primary-glow-btn">
              Get Started with RVU Email <ArrowRight size={17} />
            </Link>
            <Link href="/found-id" className="kh-secondary-outline-btn">
              <QrCode size={17} />
              Found an ID Card?
            </Link>
          </div>
        </FadeUp>
      </section>
    </div>
  );
}
