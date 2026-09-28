'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useKhoj } from '@/lib/store';
import { 
  EyeOff, 
  Lock, 
  ShieldCheck, 
  CheckCircle2, 
  ArrowRight,
  Sparkles,
  Layers,
  History,
  AlertCircle
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useToast } from '@/components/Toast';

export default function VerifyPage() {
  const params = useParams();
  const router = useRouter();
  const caseId = (params?.id as string) || 'KJ-4821';
  const { showToast } = useToast();
  
  const { 
    foundReports, 
    items, 
    matches, 
    verifications,
    verifyOwnershipAttempt,
    currentUserEmail 
  } = useKhoj();

  const report = foundReports.find(r => r.id === caseId) || foundReports[0];
  
  // Find match candidate record
  const matchRec = matches.find(m => m.found_report_id === report?.id) || matches[0];
  const registeredItem = items.find(i => i.id === matchRec?.item_id) 
    || items.find(i => i.ownerEmail === currentUserEmail && i.status === 'potential_match')
    || items[0];

  // Past verification attempts for this case (PRD V1.5 Section 12A)
  const caseAttempts = verifications.filter(v => v.found_report_id === report?.id);

  const [distinguishingMarkInput, setDistinguishingMarkInput] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<{
    attempted: boolean;
    success: boolean;
    message: string;
  } | null>(null);

  const isAlreadyVerified = report?.status === 'VERIFIED' || report?.status === 'RETURNED' || matchRec?.status === 'verified' || matchRec?.status === 'returned';

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!distinguishingMarkInput.trim()) {
      showToast('Please describe your distinguishing mark to verify ownership.', 'warning');
      return;
    }

    setIsVerifying(true);
    const attemptNumber = caseAttempts.length + 1;
    const res = await verifyOwnershipAttempt(report.id, matchRec?.id || 'match-1', distinguishingMarkInput.trim(), attemptNumber);

    setVerificationResult({
      attempted: true,
      success: res.success,
      message: res.message,
    });
    setIsVerifying(false);

    if (res.success) {
      showToast('Ownership verified! Evidence unlocked.', 'success');
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 }
        });
      } catch {}
    } else {
      showToast(res.message || 'Secret mark mismatch. Try again.', 'error');
    }
  };

  if (!report) {
    return (
      <div className="container" style={{ padding: '60px 0', textAlign: 'center' }}>
        <h2>Case not found</h2>
        <Link href="/dashboard" className="btn-primary" style={{ marginTop: '20px' }}>
          Back to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div style={{ padding: '40px 0' }}>
      <div className="container-narrow">
        
        {/* Core Loop Step Breadcrumbs */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '8px',
          flexWrap: 'wrap',
          marginBottom: '24px',
          fontSize: '0.8rem',
          color: '#cbd5e1'
        }}>
          <span style={{ padding: '4px 10px', borderRadius: '8px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.18)', color: '#cbd5e1' }}>1. Register</span>
          <span style={{ color: '#94a3b8' }}>&rarr;</span>
          <span style={{ padding: '4px 10px', borderRadius: '8px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.18)', color: '#cbd5e1' }}>2. Find</span>
          <span style={{ color: '#94a3b8' }}>&rarr;</span>
          <span style={{ padding: '4px 10px', borderRadius: '8px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.18)', color: '#cbd5e1' }}>3. Match</span>
          <span style={{ color: '#94a3b8' }}>&rarr;</span>
          <span style={{
            padding: '5px 14px',
            borderRadius: '9999px',
            background: 'rgba(6, 182, 212, 0.22)',
            border: '1px solid rgba(6, 182, 212, 0.6)',
            color: '#22d3ee',
            fontWeight: 800,
            boxShadow: '0 0 14px rgba(6, 182, 212, 0.3)'
          }}>
            Stage 4: Blind Verify
          </span>
          <span style={{ color: '#94a3b8' }}>&rarr;</span>
          <span style={{ padding: '4px 10px', borderRadius: '8px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.18)', color: '#cbd5e1' }}>5. Recover</span>
          <span style={{ color: '#94a3b8' }}>&rarr;</span>
          <span style={{ padding: '4px 10px', borderRadius: '8px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.18)', color: '#cbd5e1' }}>6. Thank</span>
        </div>

        {/* Verification Stage Banner */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div className="eyebrow" style={{ color: '#06b6d4' }}>PRD V1.5 Section 11 & 12 Protocol</div>
          <h1 style={{ fontSize: '2.3rem', fontWeight: 800, marginTop: '4px' }}>
            Blind Ownership Verification
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '0.92rem', maxWidth: '540px', margin: '8px auto 0 auto' }}>
            Identifying details are concealed to prevent fraudulent claims. Describe your secret mark to unlock evidence.
          </p>
        </div>

        {/* Match Summary Card with V1.5 Score Breakdown (Section 20A) */}
        <div className="glass-panel" style={{ padding: '24px', marginBottom: '28px', background: '#0e121d' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{
                width: '46px',
                height: '46px',
                borderRadius: '12px',
                background: 'rgba(99, 102, 241, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid rgba(99, 102, 241, 0.3)'
              }}>
                <Sparkles style={{ width: '22px', height: '22px', color: '#818cf8' }} />
              </div>
              <div>
                <div style={{ fontSize: '0.78rem', color: '#94a3b8', textTransform: 'uppercase' }}>
                  Candidate #{matchRec?.rank || 1} for Case #{report.id}
                </div>
                <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#f8fafc' }}>
                  {registeredItem.name}
                </div>
              </div>
            </div>

            {/* Radial Match Progress Meter (Section 26.3) */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              background: 'rgba(255, 255, 255, 0.04)',
              padding: '8px 16px',
              borderRadius: '12px',
              border: '1px solid rgba(255, 255, 255, 0.08)'
            }}>
              <div style={{
                width: '42px',
                height: '42px',
                borderRadius: '50%',
                background: `conic-gradient(#10b981 ${((matchRec?.score || 93) / 100) * 360}deg, rgba(255,255,255,0.1) 0deg)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.75rem',
                fontWeight: 800,
                color: '#f8fafc'
              }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: '#0e121d',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {matchRec?.score || 93}%
                </div>
              </div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                <div>Match Confidence</div>
                <div style={{ color: '#10b981', fontWeight: 600 }}>Source: {matchRec?.source || 'ai_match'}</div>
              </div>
            </div>
          </div>

          {/* V1.5 Score Breakdown (Section 20A) */}
          <div style={{
            display: 'flex',
            gap: '16px',
            marginTop: '16px',
            paddingTop: '14px',
            borderTop: '1px solid rgba(255, 255, 255, 0.06)',
            fontSize: '0.78rem',
            color: '#94a3b8'
          }}>
            <span>Visual: <strong style={{ color: '#cbd5e1' }}>{matchRec?.visual_score || 90}%</strong></span>
            <span>Unique Detail: <strong style={{ color: '#f59e0b' }}>{matchRec?.unique_detail_score || 95}%</strong></span>
            <span>Context/Location: <strong style={{ color: '#cbd5e1' }}>{matchRec?.context_score || 92}%</strong></span>
          </div>
        </div>

        {/* Redacted Blind Box vs Unlocked Details */}
        <div className="glass-panel" style={{ padding: '32px', marginBottom: '32px', position: 'relative' }}>
          
          {!(verificationResult?.success || isAlreadyVerified) ? (
            /* BLIND STATE: Photos and details blurred & locked */
            <div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '14px 18px',
                borderRadius: '12px',
                background: 'rgba(245, 158, 11, 0.1)',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                color: '#fbbf24',
                marginBottom: '24px',
                fontSize: '0.88rem'
              }}>
                <Lock style={{ width: '20px', height: '20px', flexShrink: 0 }} />
                <div>
                  <strong>Blind Protection Active:</strong> Found-item photo and identifying markers are hidden until you describe your registered secret mark.
                </div>
              </div>

              {/* Blurred Photo */}
              <div style={{
                height: '180px',
                borderRadius: '14px',
                background: '#07090f',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px dashed rgba(255, 255, 255, 0.15)',
                marginBottom: '28px',
                position: 'relative',
                overflow: 'hidden'
              }}>
                <img
                  src={report.image_url}
                  alt="Concealed"
                  style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'blur(28px) grayscale(80%)', opacity: 0.35 }}
                />
                <div style={{
                  position: 'absolute',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '8px',
                  background: 'rgba(0, 0, 0, 0.75)',
                  padding: '14px 24px',
                  borderRadius: '12px',
                  border: '1px solid rgba(255, 255, 255, 0.1)'
                }}>
                  <EyeOff style={{ width: '24px', height: '24px', color: '#94a3b8' }} />
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#f8fafc' }}>
                    Photo Concealed (Blind Verification)
                  </span>
                </div>
              </div>

              {/* Verification Form */}
              <form onSubmit={handleVerify}>
                <div className="form-group">
                  <label className="form-label" style={{ color: '#f8fafc' }}>
                    Describe any distinctive mark, damage, sticker, engraving or detail on your item *
                  </label>
                  <textarea
                    rows={3}
                    className="form-textarea"
                    placeholder="e.g. Hairline diagonal scratch on right earbud stem, small red dot marker inside lid."
                    value={distinguishingMarkInput}
                    onChange={e => setDistinguishingMarkInput(e.target.value)}
                  />
                  <div style={{ fontSize: '0.76rem', color: '#94a3b8' }}>
                    KHOJ checks your answer against registered pre-loss item records.
                  </div>
                </div>

                {verificationResult && !verificationResult.success && (
                  <div style={{
                    padding: '12px 16px',
                    borderRadius: '10px',
                    background: 'rgba(244, 63, 94, 0.15)',
                    border: '1px solid rgba(244, 63, 94, 0.3)',
                    color: '#fb7185',
                    fontSize: '0.85rem',
                    marginBottom: '18px'
                  }}>
                    {verificationResult.message}
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px' }}>
                  <button
                    type="button"
                    onClick={() => setDistinguishingMarkInput(registeredItem.unique_detail || registeredItem.uniqueDetail || '')}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#818cf8',
                      fontSize: '0.78rem',
                      cursor: 'pointer',
                      textDecoration: 'underline'
                    }}
                  >
                    ⚡ Auto-fill registered mark (Demo shortcut)
                  </button>

                  <button
                    type="submit"
                    disabled={isVerifying}
                    className="btn-accent"
                    style={{ padding: '12px 28px', fontSize: '0.95rem' }}
                  >
                    <ShieldCheck style={{ width: '18px', height: '18px' }} />
                    <span>{isVerifying ? 'Verifying...' : 'Verify Item Evidence'}</span>
                  </button>
                </div>
              </form>
            </div>
          ) : (
            /* UNLOCKED / VERIFIED STATE (PRD Section 13) */
            <div>
              <div style={{
                textAlign: 'center',
                padding: '24px',
                background: 'rgba(16, 185, 129, 0.12)',
                border: '1px solid rgba(16, 185, 129, 0.35)',
                borderRadius: '16px',
                marginBottom: '28px'
              }}>
                <div style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  background: '#10b981',
                  color: '#000',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 12px auto'
                }}>
                  <CheckCircle2 style={{ width: '32px', height: '32px' }} />
                </div>
                <div className="eyebrow" style={{ color: '#34d399' }}>Ownership Verified (Section 13)</div>
                <h2 style={{ fontSize: '1.8rem', fontWeight: 800, marginTop: '4px', color: '#f8fafc' }}>
                  ITEM VERIFIED
                </h2>
                <p style={{ color: '#cbd5e1', fontSize: '0.95rem', maxWidth: '480px', margin: '6px auto 0 auto' }}>
                  This appears to be your item. Evidence confirmed and logged into the verification ledger.
                </p>
              </div>

              {/* Photos Unlocked */}
              <div className="grid-cols-2" style={{ gap: '16px', marginBottom: '28px' }}>
                <div style={{ borderRadius: '12px', overflow: 'hidden', height: '200px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                  <img
                    src={report.image_url}
                    alt="Found Item"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                  <div style={{ background: '#090c14', padding: '6px 12px', fontSize: '0.75rem', color: '#94a3b8' }}>
                    Found item photo (Unlocked)
                  </div>
                </div>

                <div style={{ borderRadius: '12px', overflow: 'hidden', height: '200px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                  <img
                    src={registeredItem.photos[0]}
                    alt="Registered Item"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                  <div style={{ background: '#090c14', padding: '6px 12px', fontSize: '0.75rem', color: '#94a3b8' }}>
                    Your pre-registered photo
                  </div>
                </div>
              </div>

              {/* Handover CTA */}
              <div style={{
                background: 'rgba(99, 102, 241, 0.1)',
                border: '1px solid rgba(99, 102, 241, 0.3)',
                borderRadius: '14px',
                padding: '20px',
                display: 'flex',
                flexWrap: 'wrap',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '16px'
              }}>
                <div>
                  <h4 style={{ fontSize: '1.05rem', fontWeight: 700 }}>Next Step: Arrange Handover</h4>
                  <p style={{ fontSize: '0.82rem', color: '#94a3b8' }}>
                    Recovery proceeds without any payment gate.
                  </p>
                </div>

                <Link
                  href={`/recovery/${report.id}`}
                  className="btn-primary"
                  style={{ textDecoration: 'none', padding: '12px 28px' }}
                >
                  <span>Continue to Handover Desk</span>
                  <ArrowRight style={{ width: '16px', height: '16px' }} />
                </Link>
              </div>
            </div>
          )}

        </div>

        {/* PRD Section 12A Attempt History Ledger */}
        {caseAttempts.length > 0 && (
          <div className="glass-panel" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', fontSize: '0.85rem', fontWeight: 700, color: '#94a3b8' }}>
              <History style={{ width: '16px', height: '16px', color: '#818cf8' }} />
              <span>Verification Attempt Ledger (PRD V1.5 Section 12A)</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {caseAttempts.map(att => (
                <div
                  key={att.id}
                  style={{
                    background: 'rgba(255, 255, 255, 0.02)',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '0.8rem'
                  }}
                >
                  <div>
                    <span style={{ color: '#94a3b8' }}>Attempt #{att.attempt_number}: </span>
                    <span style={{ color: '#cbd5e1' }}>"{att.owner_answer}"</span>
                  </div>
                  <span style={{
                    color: att.result === 'matched' ? '#34d399' : '#fb7185',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    fontSize: '0.72rem'
                  }}>
                    {att.result}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
