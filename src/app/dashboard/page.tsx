'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useKhoj } from '@/lib/store';
import { useToast } from '@/components/Toast';
import { ItemCategory, RegisteredItem } from '@/types';
import { CAMPUS_LOCATIONS } from '@/lib/mockData';
import { 
  ShieldCheck, 
  Plus, 
  AlertCircle, 
  MapPin, 
  X, 
  Camera, 
  Sparkles, 
  ArrowRight,
  Eye,
  EyeOff,
  Headphones,
  Smartphone,
  Laptop,
  Zap,
  Clock,
  Key,
  CreditCard,
  Wine
} from 'lucide-react';

export default function DashboardPage() {
  const { 
    items, 
    currentUserEmail, 
    markItemAsLost, 
    registerNewItem,
    matches,
    isLoading
  } = useKhoj();
  const { showToast } = useToast();

  const studentItems = items.filter(i => i.ownerEmail === currentUserEmail);

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [lostModalItem, setLostModalItem] = useState<RegisteredItem | null>(null);
  const [revealedSecretId, setRevealedSecretId] = useState<string | null>(null);

  // Add Item Form State
  const [newItemName, setNewItemName] = useState('');
  const [newItemCategory, setNewItemCategory] = useState<ItemCategory>('Earbuds');
  const [newItemBrand, setNewItemBrand] = useState('');
  const [newItemModel, setNewItemModel] = useState('');
  const [newItemColour, setNewItemColour] = useState('');
  const [newItemUniqueDetail, setNewItemUniqueDetail] = useState('');
  const [newItemPhotos, setNewItemPhotos] = useState<string[]>([]);

  // Lost Form State
  const [lastSeenLocation, setLastSeenLocation] = useState(CAMPUS_LOCATIONS[0]);
  const [lostTime, setLostTime] = useState('Today, ~2:30 PM');
  const [additionalNotes, setAdditionalNotes] = useState('');

  const categoryOptions: { name: ItemCategory; icon: any }[] = [
    { name: 'Earbuds', icon: Headphones },
    { name: 'Phone', icon: Smartphone },
    { name: 'Laptop', icon: Laptop },
    { name: 'Charger', icon: Zap },
    { name: 'Watch', icon: Clock },
    { name: 'Water Bottle', icon: Wine },
    { name: 'ID Card', icon: CreditCard },
    { name: 'Keys', icon: Key },
  ];

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim() || !newItemUniqueDetail.trim()) {
      alert('Item name and unique identifying detail are required for V1.5 matching.');
      return;
    }

    await registerNewItem({
      name: newItemName.trim(),
      category: newItemCategory,
      brand: newItemBrand || 'General',
      model: newItemModel || 'Standard',
      colour: newItemColour || 'Default',
      unique_detail: newItemUniqueDetail.trim(),
      photos: newItemPhotos,
    });

    showToast({
      title: 'Item Protected!',
      message: `${newItemName} registered into your private campus visual identity inventory.`,
      type: 'success',
    });

    setShowAddModal(false);
    setNewItemName('');
    setNewItemUniqueDetail('');
  };

  const handleLostSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lostModalItem) return;

    await markItemAsLost(lostModalItem.id, lastSeenLocation, lostTime, additionalNotes);
    showToast({
      title: 'Lost Signal Activated',
      message: `KHOJ AI matching engine is prioritizing ${lostModalItem.name} across recent found reports.`,
      type: 'warning',
    });
    setLostModalItem(null);
  };

  return (
    <div style={{ padding: '36px 0' }}>
      <div className="container">
        
        {/* Header Bar */}
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
          <div>
            <div className="eyebrow" style={{ color: '#ff5c35' }}>KHOJ V1.5 Student Desk</div>
            <h1 style={{ fontSize: '2.3rem', fontWeight: 900, marginTop: '4px' }}>My Protected Belongings</h1>
            <p style={{ color: '#94a3b8', fontSize: '0.88rem' }}>
              Logged in as <strong style={{ color: '#f8fafc' }}>{currentUserEmail}</strong> • Official College Domain
            </p>
          </div>

          <button 
            onClick={() => setShowAddModal(true)} 
            className="btn-primary"
            style={{ padding: '12px 26px', fontSize: '0.95rem' }}
          >
            <Plus style={{ width: '18px', height: '18px' }} />
            <span>+ Protect New Belonging (&lt; 1 min)</span>
          </button>
        </div>

        {/* Potential Match Alert Banner */}
        {studentItems.some(i => i.status === 'potential_match') && (
          <div style={{
            background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.16) 0%, rgba(255, 92, 53, 0.16) 100%)',
            border: '1px solid rgba(245, 158, 11, 0.45)',
            borderRadius: '16px',
            padding: '22px 26px',
            marginBottom: '36px',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            boxShadow: 'var(--shadow-amber-glow)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{
                width: '46px',
                height: '46px',
                borderRadius: '12px',
                background: '#f59e0b',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#000'
              }}>
                <Sparkles style={{ width: '26px', height: '26px' }} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#fef08a' }}>
                  AI Potential Match Detected!
                </h3>
                <p style={{ fontSize: '0.88rem', color: '#cbd5e1' }}>
                  A campus found report has been ranked against your item. Complete blind verification to unlock evidence.
                </p>
              </div>
            </div>

            {(() => {
              const matchedItem = studentItems.find(i => i.status === 'potential_match');
              const activeMatch = matches.find(m => m.item_id === matchedItem?.id && m.status === 'active_verification');
              const reportId = activeMatch?.found_report_id || 'KJ-4821';
              return (
                <Link
                  href={`/verify/${reportId}`}
                  className="btn-accent"
                  style={{ textDecoration: 'none' }}
                >
                  <span>Verify Ownership Now</span>
                  <ArrowRight style={{ width: '16px', height: '16px' }} />
                </Link>
              );
            })()}
          </div>
        )}

        {/* Registered Items Grid */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 800 }}>
              Registered Items ({studentItems.length})
            </h2>
            <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
              Target pilot quota: 3–5 items per student (PRD V1.5 Section 24)
            </div>
          </div>

          {isLoading ? (
            <div className="grid-cols-3" style={{ gap: '22px' }}>
              {[1, 2, 3].map(n => (
                <div key={n} className="glass-card" style={{ height: '360px', opacity: 0.5, background: 'rgba(255,255,255,0.03)' }} />
              ))}
            </div>
          ) : studentItems.length === 0 ? (
            <div className="glass-panel" style={{ textAlign: 'center', padding: '60px 20px' }}>
              <ShieldCheck style={{ width: '48px', height: '48px', color: '#ff5c35', margin: '0 auto 16px auto', opacity: 0.8 }} />
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '6px' }}>No belongings protected yet</h3>
              <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '24px', maxWidth: '440px', margin: '0 auto 24px auto' }}>
                Pre-register your earbuds, laptop, watch, or water bottle. Having distinguishing detail photos on file enables swift recovery if lost.
              </p>
              <button onClick={() => setShowAddModal(true)} className="btn-primary">
                <Plus style={{ width: '16px', height: '16px' }} />
                <span>+ Add your first item (&lt; 1 min)</span>
              </button>
            </div>
          ) : (
            <div className="grid-cols-3" style={{ gap: '24px' }}>
              {studentItems.map(item => {
                const isLost = item.status === 'lost';
                const isPotentialMatch = item.status === 'potential_match';
                const isVerified = item.status === 'verified';
                const isReturned = item.status === 'returned';
                const matchRec = matches.find(m => m.item_id === item.id);
                const isSecretRevealed = revealedSecretId === item.id;
                const detailText = item.unique_detail || item.uniqueDetail || 'Distinctive mark registered';

                return (
                  <div 
                    key={item.id} 
                    className="glass-card" 
                    style={{ 
                      overflow: 'hidden', 
                      display: 'flex', 
                      flexDirection: 'column',
                      border: isPotentialMatch 
                        ? '1px solid rgba(245, 158, 11, 0.55)' 
                        : isLost 
                        ? '1px solid rgba(244, 63, 94, 0.45)' 
                        : '1px solid var(--border-subtle)',
                    }}
                  >
                    {/* Photo Container */}
                    <div style={{ position: 'relative', height: '190px', background: '#080a12' }}>
                      <img
                        src={item.photos[0] || 'https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?w=600'}
                        alt={item.name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                      <div style={{ position: 'absolute', top: '12px', right: '12px' }}>
                        {isPotentialMatch && (
                          <span className="status-pill status-potential-match">
                            ⚡ Potential Match ({matchRec?.score || 93}%)
                          </span>
                        )}
                        {isLost && (
                          <span className="status-pill status-lost">
                            ⚠️ Marked Lost
                          </span>
                        )}
                        {item.status === 'safe' && (
                          <span className="status-pill status-safe">
                            ✓ Protected / Safe
                          </span>
                        )}
                        {isVerified && (
                          <span className="status-pill status-verified">
                            ✓ Verified
                          </span>
                        )}
                        {isReturned && (
                          <span className="status-pill status-returned">
                            ✓ Returned
                          </span>
                        )}
                      </div>

                      <div style={{
                        position: 'absolute',
                        bottom: '8px',
                        left: '12px',
                        background: 'rgba(0, 0, 0, 0.75)',
                        padding: '2px 8px',
                        borderRadius: '6px',
                        fontSize: '0.7rem',
                        color: '#94a3b8'
                      }}>
                        {item.photos.length} photos registered
                      </div>
                    </div>

                    {/* Details Container */}
                    <div style={{ padding: '22px', display: 'flex', flexDirection: 'column', flex: 1 }}>
                      <div className="eyebrow" style={{ color: '#ff5c35', marginBottom: '2px' }}>
                        {item.category} • {item.brand}
                      </div>
                      <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#f8fafc', marginBottom: '6px' }}>
                        {item.name}
                      </h3>

                      <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '14px' }}>
                        Model: <span style={{ color: '#e2e8f0' }}>{item.model}</span> | Colour: <span style={{ color: '#e2e8f0' }}>{item.colour || item.color}</span>
                      </div>

                      {/* Secret Unique Detail Box */}
                      <div style={{
                        background: 'rgba(255, 255, 255, 0.03)',
                        border: '1px dashed rgba(255, 255, 255, 0.12)',
                        borderRadius: '10px',
                        padding: '12px 14px',
                        fontSize: '0.8rem',
                        color: '#cbd5e1',
                        marginBottom: '16px'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                          <strong style={{ color: '#f59e0b', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                            Secret Identifying Mark
                          </strong>
                          <button
                            type="button"
                            onClick={() => setRevealedSecretId(isSecretRevealed ? null : item.id)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#94a3b8',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '0.72rem'
                            }}
                          >
                            {isSecretRevealed ? <EyeOff style={{ width: '13px', height: '13px' }} /> : <Eye style={{ width: '13px', height: '13px' }} />}
                            <span>{isSecretRevealed ? 'Hide' : 'Reveal'}</span>
                          </button>
                        </div>

                        <div style={{ color: isSecretRevealed ? '#f8fafc' : '#64748b', fontStyle: isSecretRevealed ? 'normal' : 'italic' }}>
                          {isSecretRevealed ? `"${detailText}"` : '•••••••••••••••••••••••• (Encrypted for Blind Proof)'}
                        </div>
                      </div>

                      {/* Lost Details */}
                      {isLost && item.lost_details && (
                        <div style={{
                          background: 'rgba(244, 63, 94, 0.1)',
                          border: '1px solid rgba(244, 63, 94, 0.25)',
                          borderRadius: '8px',
                          padding: '10px 12px',
                          fontSize: '0.78rem',
                          marginBottom: '16px'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#fb7185', fontWeight: 600 }}>
                            <MapPin style={{ width: '13px', height: '13px' }} />
                            <span>Last seen: {item.lost_details.location}</span>
                          </div>
                          <div style={{ color: '#94a3b8', fontSize: '0.72rem', marginTop: '2px' }}>
                            Time: {item.lost_details.lost_at}
                          </div>
                        </div>
                      )}

                      {/* Footer Actions */}
                      <div style={{ marginTop: 'auto', paddingTop: '14px', borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}>
                        {isPotentialMatch ? (
                          <Link
                            href={`/verify/${matchRec?.found_report_id || 'KJ-4821'}`}
                            className="btn-accent"
                            style={{ width: '100%', padding: '10px', fontSize: '0.88rem', textDecoration: 'none' }}
                          >
                            <span>Verify Match Evidence</span>
                            <ArrowRight style={{ width: '15px', height: '15px' }} />
                          </Link>
                        ) : isVerified ? (
                          <Link
                            href={`/recovery/${matchRec?.found_report_id || 'KJ-4821'}`}
                            className="btn-primary"
                            style={{ width: '100%', padding: '10px', fontSize: '0.88rem', textDecoration: 'none' }}
                          >
                            <span>Arrange Handover</span>
                            <ArrowRight style={{ width: '15px', height: '15px' }} />
                          </Link>
                        ) : isReturned ? (
                          <div style={{ textAlign: 'center', fontSize: '0.82rem', color: '#4ade80', fontWeight: 700 }}>
                            ✓ Case Closed — Successfully Recovered
                          </div>
                        ) : isLost ? (
                          <div style={{ textAlign: 'center', fontSize: '0.82rem', color: '#fb7185', fontWeight: 600 }}>
                            📡 KHOJ matching engine active on campus
                          </div>
                        ) : (
                          <button
                            onClick={() => setLostModalItem(item)}
                            className="btn-secondary"
                            style={{ width: '100%', padding: '8px', fontSize: '0.84rem' }}
                          >
                            <AlertCircle style={{ width: '14px', height: '14px', color: '#f43f5e' }} />
                            <span>Mark as Lost</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal: Add New Item (PRD V1.5 Section 4) */}
        {showAddModal && (
          <div style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            background: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}>
            <div className="glass-panel" style={{
              maxWidth: '640px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '32px',
              background: '#0d111a',
              border: '1px solid rgba(255, 92, 53, 0.35)',
              boxShadow: 'var(--shadow-coral-glow)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div>
                  <div className="eyebrow" style={{ color: '#ff5c35' }}>Fast Registration (&lt; 1 min)</div>
                  <h2 style={{ fontSize: '1.6rem', fontWeight: 800 }}>Protect a Physical Belonging</h2>
                </div>
                <button 
                  onClick={() => setShowAddModal(false)}
                  style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
                >
                  <X style={{ width: '22px', height: '22px' }} />
                </button>
              </div>

              <form onSubmit={handleRegisterSubmit}>
                {/* Category Chips Selection */}
                <div style={{ marginBottom: '20px' }}>
                  <label className="form-label" style={{ marginBottom: '8px', display: 'block' }}>
                    Select Category *
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                    {categoryOptions.map(cat => {
                      const Icon = cat.icon;
                      const isSelected = newItemCategory === cat.name;
                      return (
                        <button
                          key={cat.name}
                          type="button"
                          onClick={() => setNewItemCategory(cat.name)}
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '12px 8px',
                            borderRadius: '12px',
                            border: isSelected ? '2px solid #ff5c35' : '1px solid rgba(255, 255, 255, 0.22)',
                            background: isSelected ? 'rgba(255, 92, 53, 0.25)' : 'rgba(255, 255, 255, 0.08)',
                            color: isSelected ? '#ffffff' : '#e2e8f0',
                            fontSize: '0.8rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                            boxShadow: isSelected ? '0 0 16px rgba(255, 92, 53, 0.35)' : 'none'
                          }}
                        >
                          <Icon style={{ width: '20px', height: '20px', color: isSelected ? '#ff7350' : '#cbd5e1' }} />
                          <span>{cat.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid-cols-2">
                  <div className="form-group">
                    <label className="form-label">Item Name *</label>
                    <input 
                      type="text" 
                      required
                      placeholder="e.g. AirPods Pro (2nd Gen)" 
                      className="form-input"
                      value={newItemName}
                      onChange={e => setNewItemName(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Brand</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Apple / Lenovo / Casio" 
                      className="form-input"
                      value={newItemBrand}
                      onChange={e => setNewItemBrand(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid-cols-2">
                  <div className="form-group">
                    <label className="form-label">Model</label>
                    <input 
                      type="text" 
                      placeholder="e.g. A2698" 
                      className="form-input"
                      value={newItemModel}
                      onChange={e => setNewItemModel(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Colour</label>
                    <input 
                      type="text" 
                      placeholder="e.g. White / Matte Black" 
                      className="form-input"
                      value={newItemColour}
                      onChange={e => setNewItemColour(e.target.value)}
                    />
                  </div>
                </div>

                {/* 3 Photos */}
                <div style={{ marginBottom: '18px' }}>
                  <label className="form-label">
                    Pre-loss Photos (Front, Angle, Detail)
                  </label>
                  <div className="grid-cols-3" style={{ gap: '10px', marginTop: '6px' }}>
                    {['1. Front', '2. Side/Angle', '3. Secret Mark'].map((lbl, idx) => (
                      <label 
                        key={idx}
                        style={{
                          height: '90px',
                          borderRadius: '10px',
                          border: '1px dashed rgba(255, 255, 255, 0.2)',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: 'rgba(255, 255, 255, 0.02)',
                          position: 'relative',
                          overflow: 'hidden',
                          cursor: 'pointer'
                        }}
                      >
                        <input
                          type="file"
                          accept="image/*"
                          style={{ display: 'none' }}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onloadend = () => {
                                const updated = [...newItemPhotos];
                                updated[idx] = reader.result as string;
                                setNewItemPhotos(updated);
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                        {newItemPhotos[idx] ? (
                          <img 
                            src={newItemPhotos[idx]} 
                            alt={lbl} 
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                          />
                        ) : (
                          <div style={{ textAlign: 'center', padding: '6px', color: '#94a3b8' }}>
                            <Camera style={{ width: '20px', height: '20px', margin: '0 auto 4px auto', color: '#ff5c35' }} />
                            <span style={{ fontSize: '0.68rem', display: 'block' }}>+ Upload</span>
                          </div>
                        )}
                        <span style={{
                          position: 'absolute',
                          bottom: '4px',
                          left: '4px',
                          background: 'rgba(0,0,0,0.75)',
                          fontSize: '0.62rem',
                          padding: '1px 5px',
                          borderRadius: '4px'
                        }}>
                          {lbl}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Unique Identifying Detail */}
                <div className="form-group">
                  <label className="form-label" style={{ color: '#f59e0b' }}>
                    One Secret Identifying Detail * (High-Weight Ownership Proof)
                  </label>
                  <textarea 
                    required
                    rows={2}
                    className="form-textarea"
                    placeholder="e.g. Small diagonal scratch near left hinge, red marker ink inside lid, or sticker chip."
                    value={newItemUniqueDetail}
                    onChange={e => setNewItemUniqueDetail(e.target.value)}
                  />
                  <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                    This is kept secret. During Blind Verification, the finder's photo is kept hidden until you describe this detail.
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
                  <button 
                    type="button" 
                    onClick={() => setShowAddModal(false)}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="btn-primary"
                  >
                    <ShieldCheck style={{ width: '16px', height: '16px' }} />
                    <span>Protect This Belonging</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Mark Item as Lost */}
        {lostModalItem && (
          <div style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            background: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(10px)',
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
              border: '1px solid rgba(244, 63, 94, 0.45)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
                <div>
                  <div className="eyebrow" style={{ color: '#fb7185' }}>Lost Item Signal (PRD Section 5)</div>
                  <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>Mark {lostModalItem.name} as Lost</h2>
                </div>
                <button 
                  onClick={() => setLostModalItem(null)}
                  style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
                >
                  <X style={{ width: '20px', height: '20px' }} />
                </button>
              </div>

              <form onSubmit={handleLostSubmit}>
                <div className="form-group">
                  <label className="form-label">Last Seen Campus Location</label>
                  <select
                    className="form-select"
                    value={lastSeenLocation}
                    onChange={e => setLastSeenLocation(e.target.value)}
                  >
                    {CAMPUS_LOCATIONS.map(loc => (
                      <option key={loc} value={loc}>{loc}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Approximate Time</label>
                  <input
                    type="text"
                    className="form-input"
                    value={lostTime}
                    onChange={e => setLostTime(e.target.value)}
                    placeholder="e.g. Today around 2:30 PM"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Additional Context (Optional)</label>
                  <textarea
                    rows={2}
                    className="form-textarea"
                    placeholder="e.g. Left on the window ledge near study cubicle #14."
                    value={additionalNotes}
                    onChange={e => setAdditionalNotes(e.target.value)}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
                  <button 
                    type="button" 
                    onClick={() => setLostModalItem(null)}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="btn-accent"
                  >
                    <AlertCircle style={{ width: '16px', height: '16px' }} />
                    <span>Activate Lost Priority</span>
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
