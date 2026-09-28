'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useKhoj } from '@/lib/store';
import { 
  CheckCircle2, 
  MapPin, 
  ArrowRight, 
  Gift, 
  Smartphone, 
  QrCode, 
  Heart, 
  Info, 
  Sparkles,
  Copy,
  Check
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useToast } from '@/components/Toast';

export default function RecoveryPage() {
  const params = useParams();
  const caseId = (params?.id as string) || 'KJ-4821';
  const { showToast } = useToast();

  const { 
    foundReports, 
    items, 
    matches, 
    recoveries, 
    rewards, 
    confirmHandover, 
    handleRewardAction 
  } = useKhoj();

  const report = foundReports.find(r => r.id === caseId) || foundReports[0];
  const matchRec = matches.find(m => m.found_report_id === report?.id) || matches[0];
  const registeredItem = items.find(i => i.id === matchRec?.item_id) || items[0];
  const recoveryRec = recoveries.find(rc => rc.found_report_id === report?.id);
  const rewardRec = rewards.find(rw => rw.found_report_id === report?.id);

  const [upiInput, setUpiInput] = useState(rewardRec?.finder_upi || 'kavya.finder@okaxis');
  const [showQrModal, setShowQrModal] = useState(false);
  const [copiedUpi, setCopiedUpi] = useState(false);

  if (!report) {
    return (
      <div className="container" style={{ padding: '60px 0', textAlign: 'center' }}>
        <h2>Recovery Case Not Found</h2>
        <Link href="/dashboard" className="btn-primary" style={{ marginTop: '20px' }}>
          Back to Dashboard
        </Link>
      </div>
    );
  }

  const isDualConfirmed = recoveryRec?.owner_confirmed && recoveryRec?.finder_confirmed;
  const isReturned = report.status === 'RETURNED' || isDualConfirmed;

  const handleOwnerConfirm = async () => {
    await confirmHandover(report.id, 'owner');
    showToast('Your receipt confirmation has been recorded!', 'success');
    if (recoveryRec?.finder_confirmed) {
      showToast('🎉 Both parties confirmed! Case status updated to RETURNED.', 'success');
      try {
        confetti({ particleCount: 120, spread: 90, origin: { y: 0.5 } });
      } catch {}
    }
  };

  const handleFinderConfirm = async () => {
    await confirmHandover(report.id, 'finder');
    showToast('Finder handover confirmation recorded!', 'success');
    if (recoveryRec?.owner_confirmed) {
      showToast('🎉 Both parties confirmed! Case status updated to RETURNED.', 'success');
      try {
        confetti({ particleCount: 120, spread: 90, origin: { y: 0.5 } });
      } catch {}
    }
  };

  const handleSimulatePayment = async () => {
    await handleRewardAction(report.id, 'pay_complete');
    showToast('₹20 reward logged as PAID to finder!', 'success');
    try {
      confetti({ particleCount: 60, spread: 70, origin: { y: 0.6 } });
    } catch {}
  };

  const copyUpiToClipboard = () => {
    const address = rewardRec?.finder_upi || upiInput;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(address);
      setCopiedUpi(true);
      showToast('UPI Address copied to clipboard!', 'info');
      setTimeout(() => setCopiedUpi(false), 2000);
    }
  };

  const upiDeepLink = `upi://pay?pa=${encodeURIComponent(rewardRec?.finder_upi || upiInput)}&pn=Campus%20Finder&am=20&cu=INR&tn=KHOJ%20Campus%20Reward%20Case%20${report.id}`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(upiDeepLink)}`;

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
          <span style={{ padding: '4px 10px', borderRadius: '8px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.18)', color: '#cbd5e1' }}>4. Verify</span>
          <span style={{ color: '#94a3b8' }}>&rarr;</span>
          <span style={{
            padding: '5px 14px',
            borderRadius: '9999px',
            background: isReturned ? 'rgba(16, 185, 129, 0.25)' : 'rgba(99, 102, 241, 0.25)',
            border: isReturned ? '1px solid rgba(16, 185, 129, 0.6)' : '1px solid rgba(99, 102, 241, 0.6)',
            color: isReturned ? '#34d399' : '#a5b4fc',
            fontWeight: 800,
            boxShadow: isReturned ? '0 0 14px rgba(16, 185, 129, 0.3)' : '0 0 14px rgba(99, 102, 241, 0.3)'
          }}>
            {isReturned ? 'Stage 5: Recovered ✓' : 'Stage 5: Dual Handover'}
          </span>
          <span style={{ color: '#94a3b8' }}>&rarr;</span>
          <span style={{
            padding: '4px 10px',
            borderRadius: '8px',
            background: rewardRec?.status === 'PAID' ? 'rgba(245, 158, 11, 0.25)' : 'rgba(255,255,255,0.08)',
            border: rewardRec?.status === 'PAID' ? '1px solid rgba(245, 158, 11, 0.5)' : '1px solid rgba(255,255,255,0.18)',
            color: rewardRec?.status === 'PAID' ? '#f59e0b' : '#cbd5e1',
            fontWeight: rewardRec?.status === 'PAID' ? 700 : 500
          }}>
            6. Thank
          </span>
        </div>

        {/* 4-Phase Recovery Track Header */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '10px',
          marginBottom: '28px',
          background: 'rgba(255, 255, 255, 0.05)',
          padding: '14px',
          borderRadius: '14px',
          border: '1px solid rgba(255, 255, 255, 0.18)',
          fontSize: '0.78rem'
        }}>
          <div style={{ textAlign: 'center', color: '#34d399', fontWeight: 700 }}>
            <div>● Phase 1</div>
            <div style={{ color: '#ffffff' }}>Station Ready</div>
          </div>
          <div style={{ textAlign: 'center', color: (recoveryRec?.owner_confirmed || recoveryRec?.finder_confirmed) ? '#34d399' : '#818cf8', fontWeight: 700 }}>
            <div>● Phase 2</div>
            <div style={{ color: '#ffffff' }}>
              Dual Signoff ({(recoveryRec?.owner_confirmed ? 1 : 0) + (recoveryRec?.finder_confirmed ? 1 : 0)}/2)
            </div>
          </div>
          <div style={{ textAlign: 'center', color: isReturned ? '#34d399' : '#94a3b8', fontWeight: 700 }}>
            <div>● Phase 3</div>
            <div style={{ color: isReturned ? '#34d399' : '#cbd5e1' }}>Item Returned</div>
          </div>
          <div style={{ textAlign: 'center', color: rewardRec?.status === 'PAID' ? '#34d399' : '#f59e0b', fontWeight: 700 }}>
            <div>● Phase 4</div>
            <div style={{ color: rewardRec?.status === 'PAID' ? '#34d399' : '#ffffff' }}>
              {rewardRec?.status === 'PAID' ? '₹20 Sent ✓' : 'Optional Thank-You'}
            </div>
          </div>
        </div>
        
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div className="eyebrow" style={{ color: isReturned ? '#10b981' : '#6366f1' }}>
            {isReturned ? 'Case Closed • Successfully Returned' : 'PRD V1.5 Section 13 & 14 Handover'}
          </div>
          <h1 style={{ fontSize: '2.4rem', fontWeight: 800, marginTop: '4px' }}>
            Handover & Dual Confirmation
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '0.92rem', maxWidth: '540px', margin: '8px auto 0 auto' }}>
            Recovery is unconditional. Handover proceeds directly, strictly independent of any reward.
          </p>
        </div>

        {/* Status Tracker */}
        <div className="glass-panel" style={{ padding: '24px', marginBottom: '28px', background: '#0e121d' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase' }}>Item Identification</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#f8fafc' }}>
                {registeredItem?.name || 'AirPods Pro'}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#818cf8', marginTop: '2px' }}>
                Case ID: {report.id}
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase' }}>Case Status</div>
              {isReturned ? (
                <span className="status-pill status-returned" style={{ fontSize: '0.88rem', padding: '6px 14px' }}>
                  ✓ RETURNED
                </span>
              ) : (
                <span className="status-pill status-verified" style={{ fontSize: '0.88rem', padding: '6px 14px' }}>
                  Handover Active
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Recovery Point */}
        <div className="glass-panel" style={{ padding: '28px', marginBottom: '28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
            <MapPin style={{ width: '20px', height: '20px', color: '#06b6d4' }} />
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Designated Campus Recovery Point</h3>
          </div>

          <div style={{
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '16px'
          }}>
            <div style={{ fontSize: '1.05rem', fontWeight: 600, color: '#f8fafc' }}>
              {recoveryRec?.handover_point || 'Central Library Security Counter'}
            </div>
            <div style={{ fontSize: '0.82rem', color: '#94a3b8', marginTop: '4px' }}>
              Recommended daylight campus checkpoint with student security officer present.
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: '#64748b' }}>
            <Info style={{ width: '15px', height: '15px', color: '#818cf8' }} />
            <span>Neither party's personal details are exposed. KHOJ coordinates state anonymously.</span>
          </div>
        </div>

        {/* Dual Confirmation Box (Section 14) */}
        <div className="glass-panel" style={{ padding: '32px', marginBottom: '32px', border: isReturned ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid var(--border-subtle)' }}>
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <div className="eyebrow" style={{ color: '#818cf8' }}>PRD Section 14 Protocol</div>
            <h3 style={{ fontSize: '1.4rem', fontWeight: 700, marginTop: '4px' }}>
              Dual Handover Confirmation
            </h3>
            <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginTop: '4px' }}>
              Case unconditionally closes as <strong>RETURNED</strong> when both student and finder confirm.
            </p>
          </div>

          <div className="grid-cols-2" style={{ gap: '20px', marginBottom: '24px' }}>
            
            {/* Owner Confirmation */}
            <div style={{
              background: recoveryRec?.owner_confirmed ? 'rgba(16, 185, 129, 0.08)' : 'rgba(255, 255, 255, 0.02)',
              border: recoveryRec?.owner_confirmed ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(255, 255, 255, 0.07)',
              borderRadius: '16px',
              padding: '22px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '10px' }}>
                Student / Owner
              </div>

              {recoveryRec?.owner_confirmed ? (
                <div style={{ color: '#34d399', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                  <CheckCircle2 style={{ width: '36px', height: '36px' }} />
                  <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>✓ Received My Item</span>
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Confirmed by {registeredItem?.ownerName}</span>
                </div>
              ) : (
                <div>
                  <p style={{ fontSize: '0.82rem', color: '#94a3b8', marginBottom: '16px' }}>
                    Click once you have physically inspected and collected your item.
                  </p>
                  <button
                    onClick={handleOwnerConfirm}
                    className="btn-primary"
                    style={{ width: '100%', padding: '10px', fontSize: '0.9rem' }}
                  >
                    ✓ I Received My Item
                  </button>
                </div>
              )}
            </div>

            {/* Finder Confirmation */}
            <div style={{
              background: recoveryRec?.finder_confirmed ? 'rgba(16, 185, 129, 0.08)' : 'rgba(255, 255, 255, 0.02)',
              border: recoveryRec?.finder_confirmed ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(255, 255, 255, 0.07)',
              borderRadius: '16px',
              padding: '22px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '10px' }}>
                Finder
              </div>

              {recoveryRec?.finder_confirmed ? (
                <div style={{ color: '#34d399', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                  <CheckCircle2 style={{ width: '36px', height: '36px' }} />
                  <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>✓ Returned The Item</span>
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Confirmed by Campus Finder</span>
                </div>
              ) : (
                <div>
                  <p style={{ fontSize: '0.82rem', color: '#94a3b8', marginBottom: '16px' }}>
                    Click once you have handed the item to the owner or recovery desk.
                  </p>
                  <button
                    onClick={handleFinderConfirm}
                    className="btn-accent"
                    style={{ width: '100%', padding: '10px', fontSize: '0.9rem' }}
                  >
                    ✓ I Returned The Item
                  </button>
                </div>
              )}
            </div>

          </div>

          {!isReturned && (
            <div style={{ textAlign: 'center' }}>
              <button
                type="button"
                onClick={async () => {
                  await confirmHandover(report.id, 'owner');
                  await confirmHandover(report.id, 'finder');
                  try {
                    confetti({ particleCount: 120, spread: 90, origin: { y: 0.5 } });
                  } catch {}
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#818cf8',
                  fontSize: '0.78rem',
                  cursor: 'pointer',
                  textDecoration: 'underline'
                }}
              >
                ⚡ 1-Click: Confirm Both Sides (Demo Simulation)
              </button>
            </div>
          )}
        </div>

        {/* PRD V1.5 Section 15 & 26.3 Emotional Celebration & Reward Payoff */}
        {isReturned && (
          <div className="glass-panel" style={{
            padding: '36px',
            marginBottom: '32px',
            background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(244, 63, 94, 0.1) 100%)',
            border: '1px solid rgba(245, 158, 11, 0.4)',
            boxShadow: 'var(--shadow-gold-glow)'
          }}>
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <Sparkles style={{ width: '36px', height: '36px', color: '#f59e0b', margin: '0 auto 10px auto' }} />
              <div className="eyebrow" style={{ color: '#f59e0b' }}>PRD Section 15 Celebration</div>
              <h2 style={{ fontSize: '1.8rem', fontWeight: 800, marginTop: '4px' }}>
                🎉 Item Recovered Successfully!
              </h2>
              <p style={{ color: '#cbd5e1', fontSize: '0.92rem', maxWidth: '480px', margin: '6px auto 0 auto' }}>
                The physical belonging is back in its owner's hands.
              </p>
            </div>

            {rewardRec?.status === 'PAID' ? (
              <div style={{
                padding: '16px',
                borderRadius: '12px',
                background: 'rgba(16, 185, 129, 0.15)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                color: '#4ade80',
                textAlign: 'center'
              }}>
                <Heart style={{ width: '28px', height: '28px', margin: '0 auto 8px auto', color: '#f43f5e' }} />
                <div style={{ fontWeight: 700, fontSize: '1rem' }}>₹20 Thank-You Reward Completed!</div>
                <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '4px' }}>
                  UPI Ref: {rewardRec.upi_ref} • Status: PAID
                </div>
              </div>
            ) : rewardRec?.status === 'PENDING' ? (
              /* Reward payment execution */
              <div>
                <div style={{
                  background: 'rgba(0, 0, 0, 0.4)',
                  borderRadius: '12px',
                  padding: '18px',
                  marginBottom: '20px',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '12px'
                }}>
                  <div>
                    <div style={{ fontSize: '0.8rem', color: '#94a3b8', textTransform: 'uppercase' }}>Finder's UPI Address</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc', marginTop: '2px' }}>
                      {rewardRec.finder_upi}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#f59e0b', marginTop: '4px', fontWeight: 600 }}>
                      Fixed Pilot Token: ₹20 (Peer-to-peer direct UPI)
                    </div>
                  </div>

                  <button
                    onClick={copyUpiToClipboard}
                    className="btn-secondary"
                    style={{ padding: '8px 14px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    {copiedUpi ? <Check style={{ width: '14px', height: '14px', color: '#34d399' }} /> : <Copy style={{ width: '14px', height: '14px' }} />}
                    <span>{copiedUpi ? 'Copied' : 'Copy UPI'}</span>
                  </button>
                </div>

                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '16px' }}>
                  <button
                    onClick={() => setShowQrModal(true)}
                    className="btn-gold"
                    style={{ padding: '10px 20px', fontSize: '0.9rem' }}
                  >
                    <QrCode style={{ width: '16px', height: '16px' }} />
                    <span>Scan UPI QR Code</span>
                  </button>

                  <a
                    href={upiDeepLink}
                    className="btn-secondary"
                    style={{ padding: '10px 20px', fontSize: '0.9rem', textDecoration: 'none' }}
                  >
                    <Smartphone style={{ width: '16px', height: '16px' }} />
                    <span>Open UPI App</span>
                  </a>

                  <button
                    onClick={handleSimulatePayment}
                    className="btn-primary"
                    style={{ padding: '10px 20px', fontSize: '0.9rem' }}
                  >
                    <CheckCircle2 style={{ width: '16px', height: '16px' }} />
                    <span>Simulate Payment Paid</span>
                  </button>
                </div>
              </div>
            ) : rewardRec?.status === 'SKIPPED' ? (
              <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: '0.88rem' }}>
                Reward skipped. Recovery remains 100% complete and closed.
              </div>
            ) : (
              /* Prompt to owner: Pay ₹20 or Skip */
              <div style={{ display: 'flex', justifyContent: 'center', gap: '14px', alignItems: 'center' }}>
                <button
                  onClick={async () => {
                    await handleRewardAction(report.id, 'provide_upi', upiInput);
                  }}
                  className="btn-gold"
                  style={{ padding: '12px 28px', fontSize: '0.95rem' }}
                >
                  <Gift style={{ width: '18px', height: '18px' }} />
                  <span>Send ₹20 Thank-You</span>
                </button>

                <button
                  onClick={async () => {
                    await handleRewardAction(report.id, 'skip');
                  }}
                  className="btn-secondary"
                  style={{ padding: '12px 24px', fontSize: '0.95rem' }}
                >
                  Skip (No Reward)
                </button>
              </div>
            )}
          </div>
        )}

        {/* Modal: QR Code */}
        {showQrModal && (
          <div style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            background: 'rgba(0, 0, 0, 0.8)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}>
            <div className="glass-panel" style={{
              maxWidth: '380px',
              width: '100%',
              padding: '28px',
              textAlign: 'center',
              background: '#0d111a',
              border: '1px solid rgba(245, 158, 11, 0.4)'
            }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '4px' }}>Scan & Pay ₹20</h3>
              <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '20px' }}>
                Pay directly to {rewardRec?.finder_upi || upiInput} via GPay / PhonePe / Paytm
              </p>

              <div style={{
                background: '#ffffff',
                padding: '16px',
                borderRadius: '16px',
                display: 'inline-block',
                marginBottom: '20px'
              }}>
                <img
                  src={qrCodeUrl}
                  alt="UPI QR Code"
                  style={{ width: '180px', height: '180px', display: 'block' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <button
                  onClick={() => {
                    handleSimulatePayment();
                    setShowQrModal(false);
                  }}
                  className="btn-primary"
                  style={{ width: '100%', padding: '10px' }}
                >
                  Confirm Paid (₹20)
                </button>
                <button
                  onClick={() => setShowQrModal(false)}
                  className="btn-secondary"
                  style={{ width: '100%', padding: '8px' }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'center', gap: '14px' }}>
          <Link href="/dashboard" className="btn-secondary" style={{ textDecoration: 'none' }}>
            Back to Student Dashboard
          </Link>
          <Link href="/admin" className="btn-secondary" style={{ textDecoration: 'none' }}>
            Inspect in Admin Desk
          </Link>
        </div>

      </div>
    </div>
  );
}
