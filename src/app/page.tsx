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
    <div style={{ padding: '16px 0' }}>
      <div className="container">
        
        {/* Pilot Badge */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          padding: '6px 14px',
          background: 'rgba(255, 92, 53, 0.1)',
          border: '1px solid rgba(255, 92, 53, 0.35)',
          borderRadius: '9999px',
          maxWidth: 'fit-content',
          margin: '0 auto 18px auto',
          fontSize: '0.72rem',
          color: '#ffc1b2',
          boxShadow: '0 0 16px rgba(255, 92, 53, 0.2)'
        }}>
          <span style={{
            display: 'inline-block',
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            backgroundColor: '#10b981',
            boxShadow: '0 0 8px #10b981'
          }} />
          <span>Campus Pilot V1.5</span>
          <span style={{ color: '#ff5c35' }}>•</span>
          <span style={{ color: '#ffffff', fontWeight: 700 }}>Zero-Friction</span>
        </div>

        {/* Mobile Hero Section */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h1 style={{
            fontSize: '1.85rem',
            fontWeight: 900,
            lineHeight: 1.15,
            letterSpacing: '-0.035em',
            marginBottom: '14px',
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
            fontSize: '0.88rem',
            color: '#94a3b8',
            lineHeight: 1.5,
            marginBottom: '22px',
          }}>
            Students register item photos and secret distinguishing details before they are lost. 
            When someone finds an item, KHOJ matches visual identity with zero login hassle.
          </p>

          {/* Action CTAs stacked for Mobile */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
            <Link 
              href="/dashboard" 
              className="btn-primary" 
              style={{ width: '100%', padding: '14px 20px', fontSize: '0.94rem' }}
            >
              <ShieldCheck style={{ width: '18px', height: '18px' }} />
              <span>Protect Belongings (Student)</span>
            </Link>

            <Link 
              href="/found" 
              className="btn-secondary"
              style={{ width: '100%', padding: '13px 20px', fontSize: '0.94rem' }}
            >
              <Search style={{ width: '18px', height: '18px', color: '#ff5c35' }} />
              <span>Found an Item? (Zero Login)</span>
            </Link>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', fontSize: '0.72rem', color: '#64748b', flexWrap: 'wrap' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <CheckCircle2 style={{ width: '13px', height: '13px', color: '#10b981' }} />
              Free for campus
            </span>
            <span>•</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Lock style={{ width: '13px', height: '13px', color: '#06b6d4' }} />
              Blind Verification
            </span>
            <span>•</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Sparkles style={{ width: '13px', height: '13px', color: '#f59e0b' }} />
              AI Matching
            </span>
          </div>
        </div>

        {/* Live Metrics: 2x2 Mobile Compact Grid */}
        <div className="glass-panel" style={{ padding: '16px', marginBottom: '32px', background: 'rgba(14, 18, 28, 0.85)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <div className="eyebrow" style={{ color: '#ff5c35', fontSize: '0.65rem' }}>
              Live Campus Ledger
            </div>
            <div style={{ fontSize: '0.7rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#10b981' }} />
              <span>Synced</span>
            </div>
          </div>

          <div className="grid-cols-2-compact">
            <div style={{ textAlign: 'center', padding: '10px 8px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '10px' }}>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#f8fafc' }}>{metrics.registeredItemsCount}</div>
              <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Protected Items</div>
            </div>
            <div style={{ textAlign: 'center', padding: '10px 8px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '10px' }}>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#fb7185' }}>{metrics.lostItemsCount}</div>
              <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Active Lost</div>
            </div>
            <div style={{ textAlign: 'center', padding: '10px 8px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '10px' }}>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#38bdf8' }}>{metrics.potentialMatchesCount + metrics.verifiedMatchesCount}</div>
              <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Visual Matches</div>
            </div>
            <div style={{ textAlign: 'center', padding: '10px 8px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '10px' }}>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#34d399' }}>{metrics.returnedItemsCount}</div>
              <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Returned</div>
            </div>
          </div>
        </div>

        {/* Interactive 6-Stage Core Loop Walkthrough */}
        <div style={{ marginBottom: '36px' }}>
          <div style={{ textAlign: 'center', marginBottom: '18px' }}>
            <div className="eyebrow" style={{ color: '#06b6d4', fontSize: '0.68rem' }}>Interactive Process</div>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 800, marginTop: '4px' }}>
              6-Stage Recovery Loop
            </h2>
            <p style={{ color: '#94a3b8', fontSize: '0.78rem', marginTop: '4px' }}>
              Tap any step to inspect the protocol live.
            </p>
          </div>

          {/* Horizontal Touch Scroll Step Pills */}
          <div style={{
            display: 'flex',
            gap: '6px',
            overflowX: 'auto',
            paddingBottom: '8px',
            marginBottom: '16px',
            WebkitOverflowScrolling: 'touch'
          }}>
            {loopSteps.map((s, idx) => (
              <button
                key={idx}
                onClick={() => setActiveStepPreview(idx)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 12px',
                  borderRadius: '9999px',
                  border: activeStepPreview === idx ? '1px solid #ff5c35' : '1px solid rgba(255,255,255,0.08)',
                  background: activeStepPreview === idx ? 'rgba(255, 92, 53, 0.18)' : 'rgba(255,255,255,0.03)',
                  color: activeStepPreview === idx ? '#fff' : '#94a3b8',
                  fontSize: '0.76rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  flexShrink: 0
                }}
              >
                <span style={{
                  fontSize: '0.68rem',
                  color: activeStepPreview === idx ? '#ff8c6b' : '#64748b'
                }}>{s.step}</span>
                <span>{s.title}</span>
              </button>
            ))}
          </div>

          {/* Active Step Feature Showcase Card for Mobile */}
          {(() => {
            const current = loopSteps[activeStepPreview];
            return (
              <div className="glass-panel" style={{
                padding: '20px 16px',
                background: 'linear-gradient(135deg, rgba(18, 23, 37, 0.9) 0%, rgba(14, 18, 28, 0.95) 100%)',
                border: '1px solid rgba(255, 92, 53, 0.3)',
                boxShadow: 'var(--shadow-coral-glow)',
                marginBottom: '28px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '10px' }}>
                  <span className="status-pill" style={{ background: 'rgba(255, 92, 53, 0.15)', color: '#ff8c6b', border: '1px solid rgba(255, 92, 53, 0.4)', fontSize: '0.65rem' }}>
                    Stage {current.step} • {current.actor}
                  </span>
                  <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{current.badge}</span>
                </div>

                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f8fafc', marginBottom: '8px' }}>
                  {current.title}
                </h3>

                <p style={{ color: '#cbd5e1', fontSize: '0.85rem', lineHeight: 1.5, marginBottom: '16px' }}>
                  {current.desc}
                </p>

                <div style={{
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '10px',
                  padding: '10px 12px',
                  fontSize: '0.75rem',
                  color: '#94a3b8',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '16px'
                }}>
                  <Sparkles style={{ width: '14px', height: '14px', color: '#ff5c35', flexShrink: 0 }} />
                  <span><strong>Design:</strong> {current.detail}</span>
                </div>

                <Link
                  href={current.actionLink}
                  className="btn-primary"
                  style={{ width: '100%', padding: '10px 16px', fontSize: '0.82rem' }}
                >
                  <span>{current.actionText}</span>
                  <ArrowRight style={{ width: '14px', height: '14px' }} />
                </Link>
              </div>
            );
          })()}
        </div>

        {/* Why WhatsApp Groups Fail vs KHOJ: Stacked Cards */}
        <div className="glass-panel" style={{ padding: '20px 16px', marginBottom: '32px' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '16px', textAlign: 'center' }}>
            Why WhatsApp Groups Fall Short
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{
              background: 'rgba(244, 63, 94, 0.05)',
              border: '1px solid rgba(244, 63, 94, 0.2)',
              borderRadius: '14px',
              padding: '16px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#fb7185', fontWeight: 700, fontSize: '0.88rem', marginBottom: '10px' }}>
                <AlertTriangle style={{ width: '16px', height: '16px' }} />
                <span>Traditional WhatsApp Notice</span>
              </div>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.78rem', color: '#94a3b8' }}>
                <li>❌ 500+ daily chats drown out lost item posts</li>
                <li>❌ Public photos encourage false claims</li>
                <li>❌ Finder must reveal phone number to everyone</li>
                <li>❌ Identical items (AirPods, bottles) look the same</li>
              </ul>
            </div>

            <div style={{
              background: 'rgba(16, 185, 129, 0.05)',
              border: '1px solid rgba(16, 185, 129, 0.2)',
              borderRadius: '14px',
              padding: '16px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#34d399', fontWeight: 700, fontSize: '0.88rem', marginBottom: '10px' }}>
                <ShieldCheck style={{ width: '16px', height: '16px' }} />
                <span>KHOJ Campus Protocol</span>
              </div>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.78rem', color: '#94a3b8' }}>
                <li>✓ Private pre-registration with secret unique details</li>
                <li>✓ Zero login for finders to ensure effortless reporting</li>
                <li>✓ Blind verification prevents imposter claims</li>
                <li>✓ Automated matching and daylight safe handovers</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Demo Quick CTA Box */}
        <div style={{
          textAlign: 'center',
          padding: '24px 16px',
          background: 'linear-gradient(135deg, rgba(255, 92, 53, 0.12) 0%, rgba(6, 182, 212, 0.12) 100%)',
          border: '1px solid rgba(255, 92, 53, 0.35)',
          borderRadius: '20px',
          marginBottom: '20px'
        }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '8px' }}>
            Ready to explore KHOJ?
          </h3>
          <p style={{ color: '#94a3b8', margin: '0 auto 18px auto', fontSize: '0.8rem', lineHeight: 1.5 }}>
            Test the student dashboard, submit a live report with zero login, or inspect the matching lab.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <Link href="/dashboard" className="btn-primary" style={{ width: '100%', padding: '12px', fontSize: '0.88rem' }}>
              Open Student Portal
            </Link>
            <Link href="/found" className="btn-secondary" style={{ width: '100%', padding: '12px', fontSize: '0.88rem' }}>
              Test Finder Flow
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
