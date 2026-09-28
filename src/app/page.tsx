'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useKhoj } from '@/lib/store';
import { 
  ShieldCheck, 
  Search, 
  Sparkles, 
  Camera, 
  CheckCircle2, 
  ArrowRight, 
  Lock, 
  EyeOff, 
  Gift, 
  ChevronRight,
  School,
  AlertTriangle,
  Zap,
  Play
} from 'lucide-react';

export default function HomePage() {
  const { metrics, currentRole, setCurrentRole, foundReports } = useKhoj();
  const [activeStepPreview, setActiveStepPreview] = useState(0);

  const activeCaseId = foundReports[0]?.id;

  const loopSteps = [
    {
      step: '01',
      title: 'Register Belonging',
      actor: 'Owner (Student)',
      desc: 'Takes < 1 minute. Upload front & side photos plus 1 secret unique distinguishing mark (e.g. scratch near hinge, marker dot).',
      badge: '< 1 min',
      detail: 'Registered items are protected by visual identity before loss occurs.',
      actionLink: '/dashboard',
      actionText: 'Open Student Desk',
    },
    {
      step: '02',
      title: 'Find & Snap',
      actor: 'Finder (Anyone)',
      desc: 'Zero friction: NO login, NO account, NO password, NO OTP. Finder snaps a photo, picks the campus spot, and hits submit.',
      badge: 'Zero Login',
      detail: 'Optional phone number for case status updates without exposing identity.',
      actionLink: '/found',
      actionText: 'Test Finder Report',
    },
    {
      step: '03',
      title: 'AI Weighted Match',
      actor: 'KHOJ Engine',
      desc: 'Evaluates 5 signals (50% unique detail, 25% visual, 10% context, 10% location, 5% precedence). Ambiguous ties (>= 85%) trigger manual review.',
      badge: 'Score Breakdown',
      detail: 'Separates "same product model" from "same physical item".',
      actionLink: '/lab',
      actionText: 'Open Matching Lab',
    },
    {
      step: '04',
      title: 'Blind Verification',
      actor: 'Owner Proves Ownership',
      desc: 'The found photo is strictly concealed. The potential owner must describe their secret mark to unlock evidence.',
      badge: 'Anti-Imposter',
      detail: 'Prevents fraudulent claims. Logs sequential attempt count.',
      actionLink: activeCaseId ? `/verify/${activeCaseId}` : '/found',
      actionText: activeCaseId ? `Verify Case #${activeCaseId}` : 'Submit Found Item to Verify',
    },
    {
      step: '05',
      title: 'Dual Confirmation',
      actor: 'Both Parties',
      desc: 'Handover takes place at daylight Campus Recovery Point. Both owner and finder confirm receipt. Status becomes RETURNED unconditionally.',
      badge: 'Zero Barrier',
      detail: 'Handover is never gated on or blocked by payment.',
      actionLink: activeCaseId ? `/recovery/${activeCaseId}` : '/dashboard',
      actionText: activeCaseId ? `Handover Case #${activeCaseId}` : 'View Handover Desk',
    },
    {
      step: '06',
      title: 'Optional ₹20 Thank-you',
      actor: 'Post-Recovery Payoff',
      desc: 'Only after the case is marked RETURNED, the owner can optionally send a flat ₹20 peer-to-peer UPI thank-you directly to the finder.',
      badge: 'Emotional Peak',
      detail: 'Non-monetary campus acknowledgment: "You helped return this item. That\'s KHOJ."',
      actionLink: activeCaseId ? `/recovery/${activeCaseId}` : '/unclaimed',
      actionText: 'Inspect Reward UI',
    },
  ];

  return (
    <div style={{ padding: '40px 0' }}>
      <div className="container">
        
        {/* Pilot Badge */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '10px',
          padding: '8px 20px',
          background: 'rgba(255, 92, 53, 0.1)',
          border: '1px solid rgba(255, 92, 53, 0.35)',
          borderRadius: '9999px',
          maxWidth: 'fit-content',
          margin: '0 auto 28px auto',
          fontSize: '0.84rem',
          color: '#ffc1b2',
          boxShadow: '0 0 20px rgba(255, 92, 53, 0.2)'
        }}>
          <span style={{
            display: 'inline-block',
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: '#10b981',
            boxShadow: '0 0 10px #10b981'
          }} />
          <span>Active Pilot: Single College Campus Network</span>
          <span style={{ color: '#ff5c35' }}>•</span>
          <span style={{ color: '#ffffff', fontWeight: 700 }}>V1.5 Specification</span>
        </div>

        {/* Hero Section */}
        <div style={{ textAlign: 'center', maxWidth: '860px', margin: '0 auto 60px auto' }}>
          <h1 style={{
            fontSize: 'clamp(2.5rem, 5.2vw, 4.4rem)',
            fontWeight: 900,
            lineHeight: 1.08,
            letterSpacing: '-0.035em',
            marginBottom: '24px',
            background: 'linear-gradient(180deg, #FFFFFF 40%, #94A3B8 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>
            Physical belongings, <br />
            <span style={{
              background: 'linear-gradient(135deg, #ff5c35 0%, #ff9800 50%, #06b6d4 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>reconnected with certainty.</span>
          </h1>

          <p style={{
            fontSize: '1.15rem',
            color: '#94a3b8',
            lineHeight: 1.6,
            marginBottom: '36px',
            maxWidth: '680px',
            margin: '0 auto 36px auto'
          }}>
            Students register item photos and secret distinguishing details before they are lost. 
            When someone finds an item, KHOJ matches the visual identity without anyone needing to broadcast on WhatsApp.
          </p>

          {/* Action CTAs */}
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '16px', marginBottom: '40px' }}>
            <Link 
              href="/dashboard" 
              className="btn-primary" 
              style={{ padding: '16px 36px', fontSize: '1.05rem', boxShadow: '0 8px 30px rgba(255, 92, 53, 0.45)' }}
            >
              <ShieldCheck style={{ width: '20px', height: '20px' }} />
              <span>Protect Belongings (Student Login)</span>
            </Link>

            <Link 
              href="/found" 
              className="btn-secondary"
              style={{ padding: '16px 36px', fontSize: '1.05rem' }}
            >
              <Search style={{ width: '20px', height: '20px', color: '#ff5c35' }} />
              <span>Found an Item? (Zero Login)</span>
            </Link>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '24px', fontSize: '0.82rem', color: '#64748b', flexWrap: 'wrap' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <CheckCircle2 style={{ width: '15px', height: '15px', color: '#10b981' }} />
              Free for all students
            </span>
            <span>•</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Lock style={{ width: '15px', height: '15px', color: '#06b6d4' }} />
              Blind Ownership Verification
            </span>
            <span>•</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Sparkles style={{ width: '15px', height: '15px', color: '#f59e0b' }} />
              Transparent Score Breakdown
            </span>
          </div>
        </div>

        {/* Live Metrics Grid from PRD V1.5 Section 18 */}
        <div className="glass-panel" style={{ padding: '28px 32px', marginBottom: '70px', background: 'rgba(14, 18, 28, 0.85)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
            <div className="eyebrow" style={{ color: '#ff5c35' }}>
              Live Server Database Ledger (Section 18 & 20)
            </div>
            <div style={{ fontSize: '0.78rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }} />
              Synchronized with <code>/api/db</code>
            </div>
          </div>

          <div className="grid-cols-4">
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#f8fafc' }}>{metrics.registeredItemsCount}</div>
              <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Protected Belongings</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#fb7185' }}>{metrics.lostItemsCount}</div>
              <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Active Lost Signals</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#38bdf8' }}>{metrics.potentialMatchesCount + metrics.verifiedMatchesCount}</div>
              <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Visual Matches Detected</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#34d399' }}>{metrics.returnedItemsCount}</div>
              <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Successfully Returned</div>
            </div>
          </div>
        </div>

        {/* Interactive 6-Stage Core Loop Walkthrough */}
        <div style={{ marginBottom: '80px' }}>
          <div style={{ textAlign: 'center', marginBottom: '36px' }}>
            <div className="eyebrow" style={{ color: '#06b6d4' }}>Interactive Experience</div>
            <h2 style={{ fontSize: '2.1rem', fontWeight: 800, marginTop: '8px' }}>
              The 6-Stage Core Recovery Loop
            </h2>
            <p style={{ color: '#94a3b8', fontSize: '0.95rem', marginTop: '6px' }}>
              Click any step to inspect the protocol and test the flow live.
            </p>
          </div>

          {/* Step Selector Pills */}
          <div style={{
            display: 'flex',
            gap: '8px',
            overflowX: 'auto',
            paddingBottom: '12px',
            marginBottom: '24px',
            justifyContent: 'center'
          }}>
            {loopSteps.map((s, idx) => (
              <button
                key={idx}
                onClick={() => setActiveStepPreview(idx)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 18px',
                  borderRadius: '9999px',
                  border: activeStepPreview === idx ? '1px solid #ff5c35' : '1px solid rgba(255,255,255,0.08)',
                  background: activeStepPreview === idx ? 'rgba(255, 92, 53, 0.18)' : 'rgba(255,255,255,0.03)',
                  color: activeStepPreview === idx ? '#fff' : '#94a3b8',
                  fontSize: '0.84rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                  whiteSpace: 'nowrap'
                }}
              >
                <span style={{
                  fontSize: '0.72rem',
                  color: activeStepPreview === idx ? '#ff8c6b' : '#64748b'
                }}>{s.step}</span>
                <span>{s.title}</span>
              </button>
            ))}
          </div>

          {/* Active Step Feature Showcase Card */}
          {(() => {
            const current = loopSteps[activeStepPreview];
            return (
              <div className="glass-panel" style={{
                padding: '36px',
                background: 'linear-gradient(135deg, rgba(18, 23, 37, 0.9) 0%, rgba(14, 18, 28, 0.95) 100%)',
                border: '1px solid rgba(255, 92, 53, 0.3)',
                boxShadow: 'var(--shadow-coral-glow)',
                marginBottom: '50px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px', marginBottom: '20px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                      <span className="status-pill" style={{ background: 'rgba(255, 92, 53, 0.15)', color: '#ff8c6b', border: '1px solid rgba(255, 92, 53, 0.4)' }}>
                        Stage {current.step} • {current.actor}
                      </span>
                      <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>{current.badge}</span>
                    </div>
                    <h3 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#f8fafc' }}>
                      {current.title}
                    </h3>
                  </div>

                  <Link
                    href={current.actionLink}
                    className="btn-primary"
                    style={{ padding: '10px 22px', fontSize: '0.88rem' }}
                  >
                    <span>{current.actionText}</span>
                    <ArrowRight style={{ width: '15px', height: '15px' }} />
                  </Link>
                </div>

                <p style={{ color: '#cbd5e1', fontSize: '1.05rem', lineHeight: 1.6, marginBottom: '20px', maxWidth: '780px' }}>
                  {current.desc}
                </p>

                <div style={{
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '12px',
                  padding: '14px 18px',
                  fontSize: '0.85rem',
                  color: '#94a3b8',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}>
                  <Sparkles style={{ width: '16px', height: '16px', color: '#ff5c35', flexShrink: 0 }} />
                  <span><strong>Design Principle:</strong> {current.detail}</span>
                </div>
              </div>
            );
          })()}
        </div>

        {/* Why WhatsApp Groups Fail vs KHOJ */}
        <div className="glass-panel" style={{ padding: '36px', marginBottom: '60px' }}>
          <h3 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '24px', textAlign: 'center' }}>
            Why WhatsApp Groups & Security Desks Fall Short
          </h3>

          <div className="grid-cols-2" style={{ gap: '30px' }}>
            <div style={{
              background: 'rgba(244, 63, 94, 0.05)',
              border: '1px solid rgba(244, 63, 94, 0.2)',
              borderRadius: '16px',
              padding: '24px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#fb7185', fontWeight: 700, marginBottom: '14px' }}>
                <AlertTriangle style={{ width: '18px', height: '18px' }} />
                <span>Traditional WhatsApp & Noticeboard</span>
              </div>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.88rem', color: '#94a3b8' }}>
                <li>❌ 500+ messages drown out the actual lost report.</li>
                <li>❌ Photos posted publicly allow dishonest claims.</li>
                <li>❌ Finder must expose their personal phone number to everyone.</li>
                <li>❌ Generic items (AirPods, black bottles) look identical to everyone.</li>
                <li>❌ Items remain unclaimed in security boxes for semesters.</li>
              </ul>
            </div>

            <div style={{
              background: 'rgba(16, 185, 129, 0.05)',
              border: '1px solid rgba(16, 185, 129, 0.2)',
              borderRadius: '16px',
              padding: '24px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#34d399', fontWeight: 700, marginBottom: '14px' }}>
                <ShieldCheck style={{ width: '18px', height: '18px' }} />
                <span>KHOJ Campus Solution</span>
              </div>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.88rem', color: '#94a3b8' }}>
                <li>✓ Private pre-registration with secret unique details.</li>
                <li>✓ Zero login for finders to ensure effortless reporting.</li>
                <li>✓ Blind verification prevents false ownership claims.</li>
                <li>✓ Automated weighted matching prioritizes lost items.</li>
                <li>✓ Dual confirmation closes cases without payment hurdles.</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Quick Demo Simulator CTA Box */}
        <div style={{
          textAlign: 'center',
          padding: '44px 32px',
          background: 'linear-gradient(135deg, rgba(255, 92, 53, 0.12) 0%, rgba(6, 182, 212, 0.12) 100%)',
          border: '1px solid rgba(255, 92, 53, 0.35)',
          borderRadius: '24px'
        }}>
          <h3 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '10px' }}>
            Ready to explore KHOJ Campus in action?
          </h3>
          <p style={{ color: '#94a3b8', maxWidth: '600px', margin: '0 auto 26px auto', fontSize: '0.95rem' }}>
            Test the student dashboard, submit a live found item report without an account, check the blind verification flow, or inspect the admin desk.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <Link href="/dashboard" className="btn-primary">
              Open Student Portal
            </Link>
            <Link href="/found" className="btn-secondary">
              Test Finder Flow
            </Link>
            <Link href="/admin" className="btn-secondary">
              Open Admin Desk
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
