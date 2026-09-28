'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useKhoj } from '@/lib/store';
import { useToast } from '@/components/Toast';
import { ItemCategory } from '@/types';
import { CAMPUS_LOCATIONS } from '@/lib/mockData';
import { 
  Camera, 
  MapPin, 
  Sparkles, 
  CheckCircle2, 
  ArrowRight, 
  ShieldCheck, 
  MessageSquare,
  UploadCloud,
  Copy,
  Check
} from 'lucide-react';

export default function FoundPage() {
  const { submitFoundReport } = useKhoj();
  const { showToast } = useToast();

  // Submission form state
  const [imageUrl, setImageUrl] = useState('');
  const [detailImageUrl, setDetailImageUrl] = useState('');
  const [hasDetailPhoto, setHasDetailPhoto] = useState(false);
  const [location, setLocation] = useState(CAMPUS_LOCATIONS[0]);
  const [categoryGuess, setCategoryGuess] = useState<ItemCategory>('Earbuds');
  const [roughDescription, setRoughDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Post-submission state
  const [submittedCaseId, setSubmittedCaseId] = useState<string | null>(null);
  const [finderPhone, setFinderPhone] = useState('');
  const [phoneSaved, setPhoneSaved] = useState(false);
  const [copiedCaseId, setCopiedCaseId] = useState(false);

  const categories: ItemCategory[] = [
    'Earbuds', 'Phone', 'Laptop', 'Charger', 'Bag', 'Watch', 
    'Water Bottle', 'ID Card', 'Keys', 'Calculator', 'Tablet', 'Other'
  ];

  const samplePresets = [
    {
      label: '🎧 AirPods Pro in Library',
      photo: 'https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?w=600&auto=format&fit=crop&q=80',
      detailPhoto: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=600&auto=format&fit=crop&q=80',
      loc: 'Central Library - 2nd Floor Quiet Zone',
      cat: 'Earbuds' as ItemCategory,
      desc: 'White Apple AirPods Pro with slight diagonal scratch on right stem found on table.'
    },
    {
      label: '🍼 Pastel Water Bottle in Gym',
      photo: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=600&auto=format&fit=crop&q=80',
      detailPhoto: 'https://images.unsplash.com/photo-1570831739435-6601aa4fa4fb?w=600&auto=format&fit=crop&q=80',
      loc: 'Sports Complex - Badminton Courts',
      cat: 'Water Bottle' as ItemCategory,
      desc: 'Lilac Hydroflask bottle with mountain graphics sticker left by bench.'
    },
    {
      label: '🔌 65W Fast Charger in LH-101',
      photo: 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=600&auto=format&fit=crop&q=80',
      detailPhoto: '',
      loc: 'Lecture Hall Complex - LH 101',
      cat: 'Charger' as ItemCategory,
      desc: 'Black GaN fast charger with braided USB-C cable left plugged in.'
    }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const report = await submitFoundReport({
        image_url: imageUrl,
        detail_image_url: hasDetailPhoto ? detailImageUrl : undefined,
        location,
        category_guess: categoryGuess,
        rough_description: roughDescription,
        finder_phone: finderPhone || undefined,
      });

      setSubmittedCaseId(report.id);
      showToast({
        title: `Report Submitted (${report.id})`,
        message: 'KHOJ visual AI engine evaluated registered items and updated the campus recovery queue.',
        type: 'success',
      });
    } catch (err) {
      console.error(err);
      showToast({
        title: 'Submission error',
        message: 'Please try again.',
        type: 'warning',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePhoneSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (finderPhone.trim()) {
      setPhoneSaved(true);
      showToast({
        title: 'Notification Contact Linked',
        message: `You will receive updates at ${finderPhone}. Phone number is kept completely private.`,
        type: 'info',
      });
    }
  };

  const handleCopyCaseId = () => {
    if (submittedCaseId) {
      navigator.clipboard.writeText(submittedCaseId);
      setCopiedCaseId(true);
      setTimeout(() => setCopiedCaseId(false), 2000);
      showToast({
        title: 'Case ID Copied',
        message: `${submittedCaseId} copied to clipboard.`,
        type: 'info',
      });
    }
  };

  return (
    <div style={{ padding: '40px 0' }}>
      <div className="container-narrow">
        
        {/* Header */}
        {!submittedCaseId && (
          <div style={{ textAlign: 'center', marginBottom: '36px' }}>
            <div className="eyebrow" style={{ color: '#ff5c35' }}>Zero-Friction Finder Protocol (PRD Section 6)</div>
            <h1 style={{ fontSize: '2.5rem', fontWeight: 900, marginTop: '4px' }}>
              Found Something on Campus?
            </h1>
            <p style={{ color: '#94a3b8', fontSize: '0.98rem', maxWidth: '540px', margin: '8px auto 0 auto' }}>
              No login. No account. No password. No OTP. Simply snap a photo and KHOJ will match it against registered belongings.
            </p>
          </div>
        )}

        {/* Post-Submission Screen (PRD Section 8) */}
        {submittedCaseId ? (
          <div className="glass-panel" style={{
            padding: '44px 32px',
            textAlign: 'center',
            background: 'linear-gradient(135deg, rgba(14, 18, 28, 0.95) 0%, rgba(18, 24, 38, 0.95) 100%)',
            border: '1px solid rgba(16, 185, 129, 0.4)',
            boxShadow: '0 12px 40px rgba(0, 0, 0, 0.6)'
          }}>
            <div style={{
              width: '68px',
              height: '68px',
              borderRadius: '50%',
              background: 'rgba(16, 185, 129, 0.15)',
              border: '2px solid rgba(16, 185, 129, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px auto',
              color: '#34d399'
            }}>
              <CheckCircle2 style={{ width: '36px', height: '36px' }} />
            </div>

            <div className="eyebrow" style={{ color: '#34d399' }}>Live Database Synchronized</div>
            <h2 style={{ fontSize: '2rem', fontWeight: 900, marginTop: '6px', marginBottom: '8px' }}>
              Found-Item Report Received
            </h2>
            <p style={{ color: '#cbd5e1', fontSize: '0.95rem', marginBottom: '28px', maxWidth: '520px', margin: '0 auto 28px auto' }}>
              KHOJ visual AI engine evaluated registered items and cross-referenced candidate belongings.
            </p>

            {/* Case ID Badge with Copy Button */}
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '12px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              padding: '10px 22px',
              borderRadius: '14px',
              marginBottom: '32px'
            }}>
              <span style={{ fontSize: '0.85rem', color: '#94a3b8', textTransform: 'uppercase' }}>Tracking Case ID:</span>
              <strong style={{ fontSize: '1.5rem', color: '#ff5c35', letterSpacing: '0.05em' }}>{submittedCaseId}</strong>
              <button
                type="button"
                onClick={handleCopyCaseId}
                style={{
                  background: 'none',
                  border: 'none',
                  color: copiedCaseId ? '#10b981' : '#94a3b8',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  transition: 'color 0.2s ease'
                }}
                title="Copy Case ID"
              >
                {copiedCaseId ? <Check style={{ width: '18px', height: '18px' }} /> : <Copy style={{ width: '18px', height: '18px' }} />}
              </button>
            </div>

            {/* Notification Subscription Box (PRD Section 8) */}
            <div style={{
              maxWidth: '500px',
              margin: '0 auto 32px auto',
              background: 'rgba(18, 24, 38, 0.75)',
              border: '1px solid rgba(255, 92, 53, 0.25)',
              borderRadius: '16px',
              padding: '24px',
              textAlign: 'left'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                <MessageSquare style={{ width: '18px', height: '18px', color: '#ff5c35' }} />
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>Want updates about this item?</h3>
              </div>
              <p style={{ fontSize: '0.82rem', color: '#94a3b8', marginBottom: '18px', lineHeight: 1.5 }}>
                Optional. Enter your WhatsApp/SMS phone number. <strong>No OTP in V1.</strong> Your contact details are never exposed to the owner.
              </p>

              {phoneSaved ? (
                <div style={{
                  padding: '12px 16px',
                  borderRadius: '10px',
                  background: 'rgba(16, 185, 129, 0.15)',
                  border: '1px solid rgba(16, 185, 129, 0.35)',
                  color: '#4ade80',
                  fontSize: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <CheckCircle2 style={{ width: '16px', height: '16px', flexShrink: 0 }} />
                  <span>Updates linked to <strong>{finderPhone}</strong>. You'll receive a ping when verified!</span>
                </div>
              ) : (
                <form onSubmit={handlePhoneSubmit} style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="tel"
                    placeholder="+91 98765 43210"
                    className="form-input"
                    style={{ flex: 1, padding: '10px 14px' }}
                    value={finderPhone}
                    onChange={e => setFinderPhone(e.target.value)}
                  />
                  <button type="submit" className="btn-primary" style={{ padding: '10px 20px', fontSize: '0.88rem' }}>
                    <span>Get Updates</span>
                  </button>
                </form>
              )}
            </div>

            {/* Direct Action Links */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', flexWrap: 'wrap' }}>
              <Link 
                href={`/recovery/${submittedCaseId}`}
                className="btn-primary"
                style={{ textDecoration: 'none' }}
              >
                <span>View Live Handover Desk</span>
                <ArrowRight style={{ width: '16px', height: '16px' }} />
              </Link>
              <Link 
                href="/unclaimed" 
                className="btn-secondary"
                style={{ textDecoration: 'none' }}
              >
                <span>Browse Unclaimed Gallery</span>
              </Link>
            </div>
          </div>
        ) : (
          /* Form (PRD Section 6) */
          <div className="glass-panel" style={{ padding: '36px', background: '#0e121d' }}>
            
            {/* Quick Demo Pre-fills */}
            <div style={{ marginBottom: '24px' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', marginBottom: '8px', textTransform: 'uppercase' }}>
                ⚡ Test with campus presets:
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {samplePresets.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setImageUrl(preset.photo);
                      setDetailImageUrl(preset.detailPhoto);
                      setHasDetailPhoto(!!preset.detailPhoto);
                      setLocation(preset.loc);
                      setCategoryGuess(preset.cat);
                      setRoughDescription(preset.desc);
                      showToast({
                        title: `Preset Selected`,
                        message: preset.label,
                        type: 'info'
                      });
                    }}
                    style={{
                      background: 'rgba(255, 255, 255, 0.1)',
                      border: '1px solid rgba(255, 255, 255, 0.25)',
                      color: '#ffffff',
                      padding: '10px 18px',
                      borderRadius: '10px',
                      fontSize: '0.84rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      transition: 'all 0.18s ease',
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)'
                    }}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleSubmit}>
              {/* Photo Upload Section */}
              <div style={{ marginBottom: '24px' }}>
                <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Found Item Photo *</span>
                  <span style={{ color: '#ff8c6b', textTransform: 'none' }}>Clear front view</span>
                </label>

                <div style={{
                  height: '230px',
                  borderRadius: '16px',
                  border: '1px dashed rgba(255, 255, 255, 0.25)',
                  background: '#080a10',
                  position: 'relative',
                  overflow: 'hidden',
                  marginTop: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {imageUrl ? (
                    <>
                      <img
                        src={imageUrl}
                        alt="Found item"
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                      <div style={{
                        position: 'absolute',
                        bottom: '12px',
                        left: '12px',
                        right: '12px',
                        background: 'rgba(0,0,0,0.75)',
                        backdropFilter: 'blur(6px)',
                        padding: '8px 14px',
                        borderRadius: '10px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        fontSize: '0.8rem'
                      }}>
                        <span style={{ color: '#e2e8f0' }}>Photo attached</span>
                        <div style={{ display: 'flex', gap: '10px' }}>
                          <button
                            type="button"
                            onClick={() => {
                              const newUrl = prompt('Enter image URL:', imageUrl);
                              if (newUrl) setImageUrl(newUrl);
                            }}
                            style={{ background: 'none', border: 'none', color: '#ff5c35', fontWeight: 700, cursor: 'pointer' }}
                          >
                            Change URL
                          </button>
                          <button
                            type="button"
                            onClick={() => setImageUrl('')}
                            style={{ background: 'none', border: 'none', color: '#ef4444', fontWeight: 600, cursor: 'pointer' }}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </>
                  ) : (
                    <label style={{
                      width: '100%',
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      padding: '20px'
                    }}>
                      <input
                        type="file"
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={e => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onloadend = () => setImageUrl(reader.result as string);
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                      <Camera style={{ width: '38px', height: '38px', color: '#ff5c35', marginBottom: '10px' }} />
                      <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#f8fafc' }}>
                        Click to upload photo from your device
                      </div>
                      <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '4px' }}>
                        or <span 
                          onClick={(ev) => {
                            ev.stopPropagation();
                            const url = prompt('Enter image URL:');
                            if (url) setImageUrl(url);
                          }}
                          style={{ color: '#ff5c35', textDecoration: 'underline', cursor: 'pointer' }}
                        >
                          paste image URL
                        </span>
                      </div>
                    </label>
                  )}
                </div>
              </div>

              {/* Close-up detail photo toggle */}
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '0.88rem', color: '#f8fafc', fontWeight: 600 }}>
                  <input
                    type="checkbox"
                    checked={hasDetailPhoto}
                    onChange={e => setHasDetailPhoto(e.target.checked)}
                    style={{ width: '16px', height: '16px', accentColor: '#ff5c35' }}
                  />
                  <span>I also have a close-up photo of distinguishing marks (notch/scratch/sticker)</span>
                </label>

                {hasDetailPhoto && (
                  <div style={{
                    marginTop: '10px',
                    height: '140px',
                    borderRadius: '12px',
                    border: '1px dashed rgba(245, 158, 11, 0.35)',
                    background: '#080a10',
                    overflow: 'hidden',
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    {detailImageUrl ? (
                      <>
                        <img
                          src={detailImageUrl}
                          alt="Detail closeup"
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                        <div style={{
                          position: 'absolute',
                          top: '8px',
                          left: '8px',
                          background: 'rgba(245, 158, 11, 0.9)',
                          color: '#000',
                          fontSize: '0.7rem',
                          fontWeight: 800,
                          padding: '2px 8px',
                          borderRadius: '6px'
                        }}>
                          Distinguishing Mark Evidence (0.50 Match Weight)
                        </div>
                        <button
                          type="button"
                          onClick={() => setDetailImageUrl('')}
                          style={{
                            position: 'absolute',
                            top: '8px',
                            right: '8px',
                            background: 'rgba(0,0,0,0.7)',
                            border: 'none',
                            color: '#ef4444',
                            fontSize: '0.75rem',
                            padding: '3px 8px',
                            borderRadius: '4px',
                            cursor: 'pointer'
                          }}
                        >
                          Remove
                        </button>
                      </>
                    ) : (
                      <label style={{
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer'
                      }}>
                        <input
                          type="file"
                          accept="image/*"
                          style={{ display: 'none' }}
                          onChange={e => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onloadend = () => setDetailImageUrl(reader.result as string);
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                        <UploadCloud style={{ width: '26px', height: '26px', color: '#f59e0b', marginBottom: '6px' }} />
                        <span style={{ fontSize: '0.8rem', color: '#cbd5e1' }}>Click to upload detail photo or <span 
                          onClick={(ev) => {
                            ev.stopPropagation();
                            const url = prompt('Enter detail image URL:');
                            if (url) setDetailImageUrl(url);
                          }}
                          style={{ color: '#f59e0b', textDecoration: 'underline' }}
                        >paste URL</span></span>
                      </label>
                    )}
                  </div>
                )}
              </div>

              {/* Campus Location */}
              <div className="form-group">
                <label className="form-label">
                  Where did you find it? *
                </label>
                <select
                  className="form-select"
                  value={location}
                  onChange={e => setLocation(e.target.value)}
                >
                  {CAMPUS_LOCATIONS.map(loc => (
                    <option key={loc} value={loc}>{loc}</option>
                  ))}
                </select>
              </div>

              <div className="grid-cols-2">
                <div className="form-group">
                  <label className="form-label">What is it? (Category Guess)</label>
                  <select
                    className="form-select"
                    value={categoryGuess}
                    onChange={e => setCategoryGuess(e.target.value as ItemCategory)}
                  >
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Rough Description / Notes</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. White case with subtle mark"
                    value={roughDescription}
                    onChange={e => setRoughDescription(e.target.value)}
                  />
                </div>
              </div>

              {/* Zero-friction callout */}
              <div style={{
                background: 'rgba(255, 92, 53, 0.08)',
                border: '1px solid rgba(255, 92, 53, 0.25)',
                borderRadius: '12px',
                padding: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '24px',
                fontSize: '0.84rem',
                color: '#cbd5e1'
              }}>
                <ShieldCheck style={{ width: '22px', height: '22px', color: '#ff5c35', flexShrink: 0 }} />
                <div>
                  <strong style={{ color: '#f8fafc' }}>No account, phone, or password required to submit.</strong> KHOJ instantly searches pre-registered items.
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-primary"
                style={{ width: '100%', padding: '16px', fontSize: '1.05rem', boxShadow: '0 8px 30px rgba(255, 92, 53, 0.45)' }}
              >
                {isSubmitting ? (
                  <span>Evaluating candidates with AI matching engine...</span>
                ) : (
                  <>
                    <Sparkles style={{ width: '18px', height: '18px' }} />
                    <span>FIND OWNER (SUBMIT REPORT)</span>
                  </>
                )}
              </button>
            </form>
          </div>
        )}

      </div>
    </div>
  );
}
