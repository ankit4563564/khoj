"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  fadeUpVariants,
  staggerContainerVariants,
  staggerItemVariants,
  modalVariants,
  backdropVariants,
  successCheckVariants,
  TRANSITION_NORMAL,
} from "@/lib/motion";
import {
  ShieldCheck,
  Search,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  MapPin,
  Lock,
  Headphones,
  Briefcase,
  HelpCircle,
} from "lucide-react";

export function PageTransition({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}

export function FadeUp({
  children,
  delay = 0,
  className = "",
  style,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <motion.div
      variants={fadeUpVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-40px" }}
      transition={{ delay }}
      className={className}
      style={style}
    >
      {children}
    </motion.div>
  );
}

export function StaggerList({
  children,
  className = "",
  style,
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <motion.div
      variants={staggerContainerVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-30px" }}
      className={className}
      style={style}
    >
      {children}
    </motion.div>
  );
}

export function StaggerChild({
  children,
  className = "",
  style,
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <motion.div variants={staggerItemVariants} className={className} style={style}>
      {children}
    </motion.div>
  );
}

export function MotionModal({
  isOpen,
  onClose,
  title,
  children,
}: {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="kh-modal-backdrop-wrap">
          <motion.div
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="kh-modal-scrim"
            onClick={onClose}
          />
          <motion.div
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="kh-modal-panel"
            role="dialog"
            aria-modal="true"
          >
            {title && (
              <div className="kh-modal-header">
                <h3>{title}</h3>
                <button
                  type="button"
                  onClick={onClose}
                  className="kh-modal-close-btn"
                  aria-label="Close dialog"
                >
                  ✕
                </button>
              </div>
            )}
            <div className="kh-modal-body">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export function SuccessCheckmark({ size = 52 }: { size?: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: "50%",
        background: "rgba(16, 185, 129, 0.12)",
        border: "1.5px solid rgba(16, 185, 129, 0.35)",
        boxShadow: "0 0 24px rgba(16, 185, 129, 0.2)",
      }}
    >
      <svg
        width={size * 0.55}
        height={size * 0.55}
        viewBox="0 0 24 24"
        fill="none"
        stroke="#10B981"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <motion.path
          d="M20 6L9 17L4 12"
          variants={successCheckVariants}
          initial="hidden"
          animate="visible"
        />
      </svg>
    </div>
  );
}

/**
 * Interactive Object Journey Card
 * Visual storytelling element showing:
 * Registered -> Lost -> Found -> Matched -> Verified -> Returned
 */
export function InteractiveJourney() {
  const [activeStep, setActiveStep] = useState(0);

  const steps = [
    {
      id: "registered",
      badge: "01 PROTECTED",
      title: "AirPods Pro (2nd Gen)",
      sub: "Registered with encrypted secret: 'Small scratch left earbud hinge'",
      icon: ShieldCheck,
      color: "emerald",
      status: "Safe & Active",
    },
    {
      id: "lost",
      badge: "02 REPORTED MISSING",
      title: "Missing at Library Floor 3",
      sub: "Marked missing with 1 click. Blind notification armed across campus.",
      icon: Search,
      color: "amber",
      status: "Searching...",
    },
    {
      id: "found",
      badge: "03 FOUND BY STUDENT",
      title: "Found near silent study desk",
      sub: "Finder reported in 24 seconds without needing an account.",
      icon: Sparkles,
      color: "blue",
      status: "Report In Custody",
    },
    {
      id: "matched",
      badge: "04 BLIND MATCH",
      title: "Secret Detail Matched",
      sub: "Owner correctly identified secret detail. Identity remains private.",
      icon: Lock,
      color: "indigo",
      status: "Ownership Verified",
    },
    {
      id: "returned",
      badge: "05 REUNITED",
      title: "Safe Handover Complete",
      sub: "Dual OTP confirmation at campus desk. ₹20 thank-you sent via UPI.",
      icon: CheckCircle2,
      color: "emerald",
      status: "Reunited",
    },
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % steps.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [steps.length]);

  const current = steps[activeStep];
  const Icon = current.icon;

  return (
    <div className="kh-journey-container">
      <div className="kh-journey-header">
        <div className="kh-journey-pill">
          <span className="kh-pulse-dot" />
          <span>LIVE RECOVERY ENGINE SIMULATION</span>
        </div>
        <div className="kh-journey-tabs">
          {steps.map((s, idx) => (
            <button
              key={s.id}
              onClick={() => setActiveStep(idx)}
              className={`kh-journey-tab-btn ${activeStep === idx ? "active" : ""}`}
            >
              Step 0{idx + 1}
            </button>
          ))}
        </div>
      </div>

      <div className="kh-journey-card">
        <div className="kh-journey-track">
          {steps.map((s, idx) => {
            const isCompleted = idx < activeStep;
            const isCurrent = idx === activeStep;
            return (
              <div
                key={s.id}
                className={`kh-journey-node ${isCurrent ? "current" : ""} ${isCompleted ? "completed" : ""}`}
                onClick={() => setActiveStep(idx)}
              >
                <div className="kh-node-dot">
                  {isCompleted ? "✓" : idx + 1}
                </div>
                <span className="kh-node-label">{s.id.toUpperCase()}</span>
              </div>
            );
          })}
        </div>

        <div className="kh-journey-content">
          <AnimatePresence mode="wait">
            <motion.div
              key={current.id}
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={TRANSITION_NORMAL}
              className="kh-journey-details"
            >
              <div className="kh-journey-hero-item">
                <div className={`kh-icon-avatar ${current.color}`}>
                  <Icon size={26} strokeWidth={1.75} />
                </div>
                <div>
                  <span className="kh-step-badge">{current.badge}</span>
                  <h3 className="kh-step-title">{current.title}</h3>
                  <p className="kh-step-desc">{current.sub}</p>
                </div>
              </div>

              <div className="kh-journey-meta-grid">
                <div className="kh-meta-box">
                  <span className="kh-meta-key">ITEM ARTIFACT</span>
                  <span className="kh-meta-val">AirPods Pro #KHJ-8821</span>
                </div>
                <div className="kh-meta-box">
                  <span className="kh-meta-key">CAMPUS LOCATION</span>
                  <span className="kh-meta-val">Central Library • Desk 14</span>
                </div>
                <div className="kh-meta-box">
                  <span className="kh-meta-key">PRIVACY SHIELD</span>
                  <span className="kh-meta-val">Blind Verified • Encrypted</span>
                </div>
                <div className="kh-meta-box">
                  <span className="kh-meta-key">STATUS</span>
                  <span className={`kh-status-tag ${current.color}`}>
                    {current.status}
                  </span>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
