'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useKhoj } from '@/lib/store';
import { 
  Inbox, 
  EyeOff, 
  MapPin, 
  Lock, 
  Search, 
  ShieldCheck,
  CheckCircle2,
  X,
  Sparkles
} from 'lucide-react';
import { useToast } from '@/components/Toast';

export default function UnclaimedPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const { foundReports, items, currentUserEmail, claimUnclaimedItem } = useKhoj();
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Claim modal state (PRD V1.5 Section 16)
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<string>('');

  const studentItems = items.filter(i => i.ownerEmail === currentUserEmail);
  const unclaimedItems = foundReports.filter(r => r.status === 'UNCLAIMED' || r.status === 'POTENTIAL_MATCH');

  const filtered = unclaimedItems.filter(item => {
    const matchesCat = categoryFilter === 'all' || item.category_guess === categoryFilter;
    const matchesQuery = !searchQuery || 
      item.location.toLowerCase().includes(searchQuery.toLowerCase()) || 
      (item.category_guess && item.category_guess.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCat && matchesQuery;
  });

  const handleClaimSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReportId || !selectedItemId) {
      showToast('Please select which of your registered belongings matches this item.', 'warning');
      return;
    }

    await claimUnclaimedItem(selectedReportId, selectedItemId);
    const reportToVerify = selectedReportId;
    setSelectedReportId(null);
    showToast(`Claim initiated for Case #${reportToVerify}. Opening Blind Verification...`, 'success');
    router.push(`/verify/${reportToVerify}`);
  };

  return (
    <div style={{ padding: '40px 0' }}>
      <div className="container">
        
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '36px' }}>
          <div className="eyebrow" style={{ color: '#06b6d4' }}>PRD V1.5 Section 16 Gallery</div>
          <h1 style={{ fontSize: '2.4rem', fontWeight: 800, marginTop: '4px' }}>
            Campus Unclaimed Gallery
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '0.92rem', maxWidth: '620px', margin: '8px auto 0 auto' }}>
            Found items waiting for their student owner. To prevent dishonest claims, all identifying marks and high-resolution images are strictly redacted.
          </p>
        </div>

        {/* Redaction Notice Alert */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          padding: '16px 20px',
          borderRadius: '14px',
          background: 'rgba(6, 182, 212, 0.08)',
          border: '1px solid rgba(6, 182, 212, 0.25)',
          color: '#e0f2fe',
          maxWidth: '820px',
          margin: '0 auto 36px auto',
          fontSize: '0.85rem'
        }}>
          <Lock style={{ width: '22px', height: '22px', color: '#22d3ee', flexShrink: 0 }} />
          <div>
            <strong>Strict Campus Redaction Standard:</strong> Exact timestamps, serial numbers, and un-cropped photos are suppressed. If an item belongs to you, click "This is mine" to initiate the verification pipeline with source <code>manual_claim</code>.
          </div>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '28px' }}>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {['all', 'Earbuds', 'Phone', 'Laptop', 'Charger', 'Water Bottle', 'Watch', 'ID Card'].map(cat => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                style={{
                  padding: '7px 16px',
                  borderRadius: '9999px',
                  fontSize: '0.84rem',
                  fontWeight: 700,
                  border: categoryFilter === cat ? '1px solid #ff5c35' : '1px solid rgba(255, 255, 255, 0.22)',
                  cursor: 'pointer',
                  background: categoryFilter === cat ? '#ff5c35' : 'rgba(255, 255, 255, 0.1)',
                  color: categoryFilter === cat ? '#ffffff' : '#e2e8f0',
                  boxShadow: categoryFilter === cat ? '0 4px 14px rgba(255, 92, 53, 0.4)' : 'none',
                  transition: 'all 0.15s ease'
                }}
              >
                {cat === 'all' ? 'All Items' : cat}
              </button>
            ))}
          </div>

          <div style={{ position: 'relative', minWidth: '240px' }}>
            <Search style={{ width: '16px', height: '16px', color: '#cbd5e1', position: 'absolute', left: '12px', top: '12px' }} />
            <input
              type="text"
              placeholder="Search location..."
              className="form-input"
              style={{ paddingLeft: '36px', paddingRight: '12px', paddingBlock: '8px', fontSize: '0.88rem' }}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Unclaimed Cards Grid */}
        {filtered.length === 0 ? (
          <div className="glass-panel" style={{ textAlign: 'center', padding: '60px 20px' }}>
            <Inbox style={{ width: '48px', height: '48px', color: '#6366f1', margin: '0 auto 16px auto', opacity: 0.6 }} />
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>No unclaimed items matching filter</h3>
          </div>
        ) : (
          <div className="grid-cols-3" style={{ gap: '24px' }}>
            {filtered.map(report => (
              <div 
                key={report.id}
                className="glass-card"
                style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
              >
                {/* Redacted Frame */}
                <div style={{ height: '180px', position: 'relative', background: '#080a12', overflow: 'hidden' }}>
                  <img
                    src={report.image_url}
                    alt="Redacted preview"
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      filter: 'contrast(1.1) blur(7px) grayscale(30%)',
                      opacity: 0.75,
                      transform: 'scale(1.1)'
                    }}
                  />

                  {/* Watermark */}
                  <div style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'rgba(7, 9, 14, 0.45)',
                    gap: '6px'
                  }}>
                    <EyeOff style={{ width: '22px', height: '22px', color: '#f8fafc' }} />
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#f8fafc', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                      Identifying Marks Redacted
                    </span>
                  </div>

                  <div style={{
                    position: 'absolute',
                    top: '10px',
                    left: '10px',
                    background: 'rgba(0, 0, 0, 0.75)',
                    padding: '2px 8px',
                    borderRadius: '6px',
                    fontSize: '0.7rem',
                    color: '#a5b4fc',
                    fontWeight: 600
                  }}>
                    Case #{report.id}
                  </div>
                </div>

                {/* Content */}
                <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', flex: 1 }}>
                  <div className="eyebrow" style={{ color: '#06b6d4', marginBottom: '4px' }}>
                    {report.category_guess || 'Campus Belonging'}
                  </div>
                  
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '8px' }}>
                    Unclaimed {report.category_guess || 'Item'}
                  </h3>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', color: '#94a3b8', marginBottom: '14px' }}>
                    <MapPin style={{ width: '14px', height: '14px', color: '#6366f1' }} />
                    <span>Rough Area: {report.location.split('-')[0].trim()}</span>
                  </div>

                  <div style={{ marginTop: 'auto' }}>
                    <button
                      onClick={() => {
                        setSelectedReportId(report.id);
                        if (studentItems.length > 0) setSelectedItemId(studentItems[0].id);
                      }}
                      className="btn-accent"
                      style={{ width: '100%', padding: '10px', fontSize: '0.88rem' }}
                    >
                      <ShieldCheck style={{ width: '16px', height: '16px' }} />
                      <span>This is mine (Claim Item)</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal: Claim Item Flow (PRD V1.5 Section 16 Defined Claim Flow) */}
        {selectedReportId && (
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
              maxWidth: '520px',
              width: '100%',
              padding: '30px',
              background: '#0d111a',
              border: '1px solid rgba(6, 182, 212, 0.4)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
                <div>
                  <div className="eyebrow" style={{ color: '#06b6d4' }}>PRD Section 16 Claim Pipeline</div>
                  <h2 style={{ fontSize: '1.4rem', fontWeight: 700 }}>Claim Unclaimed Case #{selectedReportId}</h2>
                </div>
                <button 
                  onClick={() => setSelectedReportId(null)}
                  style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
                >
                  <X style={{ width: '20px', height: '20px' }} />
                </button>
              </div>

              <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '20px' }}>
                Select which of your registered belongings you believe matches this found item. This will create a <code>manual_claim</code> match row and initiate the blind verification step.
              </p>

              <form onSubmit={handleClaimSubmit}>
                <div className="form-group">
                  <label className="form-label">Select Your Registered Item</label>
                  {studentItems.length === 0 ? (
                    <div style={{ fontSize: '0.85rem', color: '#fb7185' }}>
                      You haven't registered any items yet. Please register your item in the dashboard first.
                    </div>
                  ) : (
                    <>
                      <select
                        className="form-select"
                        value={selectedItemId}
                        onChange={e => setSelectedItemId(e.target.value)}
                      >
                        {studentItems.map(item => (
                          <option key={item.id} value={item.id}>
                            {item.name} ({item.category} • {item.brand})
                          </option>
                        ))}
                      </select>

                      {/* Item Visual Preview */}
                      {(() => {
                        const sel = studentItems.find(i => i.id === selectedItemId) || studentItems[0];
                        if (!sel) return null;
                        return (
                          <div style={{
                            display: 'flex',
                            gap: '12px',
                            alignItems: 'center',
                            marginTop: '12px',
                            background: 'rgba(255, 255, 255, 0.03)',
                            padding: '10px 14px',
                            borderRadius: '10px',
                            border: '1px solid rgba(255, 255, 255, 0.08)'
                          }}>
                            {sel.photos?.[0] && (
                              <img
                                src={sel.photos[0]}
                                alt={sel.name}
                                style={{ width: '44px', height: '44px', borderRadius: '8px', objectFit: 'cover' }}
                              />
                            )}
                            <div style={{ fontSize: '0.78rem' }}>
                              <div style={{ fontWeight: 600, color: '#f8fafc' }}>{sel.name}</div>
                              <div style={{ color: '#94a3b8' }}>
                                Secret Mark: <span style={{ color: '#cbd5e1' }}>"{sel.unique_detail || sel.uniqueDetail || 'Registered'}"</span>
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </>
                  )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
                  <button 
                    type="button" 
                    onClick={() => setSelectedReportId(null)}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    disabled={studentItems.length === 0}
                    className="btn-primary"
                  >
                    <span>Proceed to Blind Verification</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
