'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useKhoj } from '@/lib/store';
import { 
  Sliders, 
  Search, 
  RotateCcw, 
  CheckCircle2, 
  ArrowRight,
  Sparkles,
  MapPin,
  Calendar,
  Layers,
  Split,
  History
} from 'lucide-react';

export default function AdminPage() {
  const { 
    metrics, 
    foundReports, 
    items, 
    matches, 
    verifications,
    resetDatabase 
  } = useKhoj();

  const [activeTab, setActiveTab] = useState<'metrics' | 'ambiguous' | 'matches' | 'manual_search'>('metrics');
  
  // Manual Search Filters (PRD Section 17)
  const [searchCategory, setSearchCategory] = useState<string>('all');
  const [searchBrand, setSearchBrand] = useState('');
  const [searchColor, setSearchColor] = useState('');
  const [searchLocation, setSearchLocation] = useState('');
  const [searchKeyword, setSearchKeyword] = useState('');

  // Ambiguous cases
  const ambiguousReports = foundReports.filter(r => r.status === 'AMBIGUOUS' || r.status === 'MANUAL_REVIEW');

  const manualSearchResults = items.filter(item => {
    if (searchCategory !== 'all' && item.category !== searchCategory) return false;
    if (searchBrand && !item.brand.toLowerCase().includes(searchBrand.toLowerCase())) return false;
    const itemColor = item.colour || item.color || '';
    const itemDetail = item.unique_detail || item.uniqueDetail || '';
    if (searchColor && !itemColor.toLowerCase().includes(searchColor.toLowerCase())) return false;
    if (searchLocation && item.lost_details && !item.lost_details.location.toLowerCase().includes(searchLocation.toLowerCase())) return false;
    if (searchKeyword) {
      const q = searchKeyword.toLowerCase();
      const match = item.name.toLowerCase().includes(q) || 
                    itemDetail.toLowerCase().includes(q) || 
                    item.model.toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  return (
    <div style={{ padding: '36px 0' }}>
      <div className="container">
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '32px' }}>
          <div>
            <div className="eyebrow" style={{ color: '#06b6d4' }}>PRD V1.5 Section 18 Operations Desk</div>
            <h1 style={{ fontSize: '2.3rem', fontWeight: 800, marginTop: '4px' }}>
              Campus Administration & Analytics
            </h1>
            <p style={{ color: '#94a3b8', fontSize: '0.88rem' }}>
              Real-time server database metrics, score breakdowns, and manual fallback search.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={async () => {
                if (confirm('Reset server database to default pilot test state?')) {
                  await resetDatabase();
                }
              }}
              className="btn-secondary"
              style={{ fontSize: '0.82rem', padding: '8px 16px' }}
            >
              <RotateCcw style={{ width: '14px', height: '14px' }} />
              <span>Reset Database</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', marginBottom: '32px', paddingBottom: '4px' }}>
          {[
            { id: 'metrics', label: 'Pilot Metrics & Funnel', count: null },
            { id: 'ambiguous', label: 'Ambiguous Queue (Section 10)', count: ambiguousReports.length },
            { id: 'matches', label: 'Matches Ledger (Section 20A)', count: matches.length },
            { id: 'manual_search', label: 'Manual Search Fallback', count: null },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 18px',
                borderRadius: '10px',
                border: activeTab === tab.id ? '1px solid #6366f1' : '1px solid rgba(255, 255, 255, 0.18)',
                cursor: 'pointer',
                fontSize: '0.9rem',
                fontWeight: 700,
                background: activeTab === tab.id ? 'rgba(99, 102, 241, 0.25)' : 'rgba(255, 255, 255, 0.06)',
                color: activeTab === tab.id ? '#ffffff' : '#cbd5e1',
                boxShadow: activeTab === tab.id ? '0 0 16px rgba(99, 102, 241, 0.35)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              <span>{tab.label}</span>
              {tab.count !== null && tab.count > 0 && (
                <span style={{
                  padding: '2px 8px',
                  borderRadius: '9999px',
                  background: '#f43f5e',
                  color: '#fff',
                  fontSize: '0.72rem',
                  fontWeight: 800
                }}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* TAB 1: METRICS (PRD V1.5 Section 18 & 25) */}
        {activeTab === 'metrics' && (
          <div>
            {/* Primary Metric Banner */}
            <div className="glass-panel" style={{
              padding: '28px',
              marginBottom: '32px',
              background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(16, 185, 129, 0.1) 100%)',
              border: '1px solid rgba(99, 102, 241, 0.3)'
            }}>
              <div className="eyebrow" style={{ color: '#10b981' }}>PRD V1.5 Section 25 Primary Success Metric</div>
              <h2 style={{ fontSize: '1.8rem', fontWeight: 800, marginTop: '4px', marginBottom: '8px' }}>
                Successful Recovery Rate: {metrics.recoveryRate}%
              </h2>
              <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', color: '#cbd5e1', fontSize: '0.88rem' }}>
                <div>Formula: <code>(Recoveries / Found Reports) * 100</code></div>
                <div>•</div>
                <div>Avg Verification Attempts / Match: <strong style={{ color: '#f59e0b' }}>{metrics.avgAttemptsPerMatch}</strong></div>
              </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid-cols-4" style={{ gap: '16px', marginBottom: '36px' }}>
              <div className="glass-card" style={{ padding: '20px' }}>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase' }}>Students</div>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: '#f8fafc', marginTop: '4px' }}>{metrics.studentsCount}</div>
                <div style={{ fontSize: '0.75rem', color: '#10b981', marginTop: '4px' }}>Target: 50 students</div>
              </div>

              <div className="glass-card" style={{ padding: '20px' }}>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase' }}>Registered Items</div>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: '#818cf8', marginTop: '4px' }}>{metrics.registeredItemsCount}</div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '4px' }}>Target: 150–250 items</div>
              </div>

              <div className="glass-card" style={{ padding: '20px' }}>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase' }}>Lost Items</div>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: '#fb7185', marginTop: '4px' }}>{metrics.lostItemsCount}</div>
                <div style={{ fontSize: '0.75rem', color: '#fb7185', marginTop: '4px' }}>Prioritized matching</div>
              </div>

              <div className="glass-card" style={{ padding: '20px' }}>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase' }}>Found Reports</div>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: '#f8fafc', marginTop: '4px' }}>{metrics.foundReportsCount}</div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '4px' }}>Zero-login reports</div>
              </div>

              <div className="glass-card" style={{ padding: '20px' }}>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase' }}>Potential Matches</div>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: '#fbbf24', marginTop: '4px' }}>{metrics.potentialMatchesCount}</div>
                <div style={{ fontSize: '0.75rem', color: '#fbbf24', marginTop: '4px' }}>Aggregate score &gt; 70%</div>
              </div>

              <div className="glass-card" style={{ padding: '20px' }}>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase' }}>Ambiguous Cases</div>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: '#c084fc', marginTop: '4px' }}>{metrics.ambiguousCasesCount}</div>
                <div style={{ fontSize: '0.75rem', color: '#c084fc', marginTop: '4px' }}>2+ candidates &ge; 85%</div>
              </div>

              <div className="glass-card" style={{ padding: '20px' }}>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase' }}>Verified Matches</div>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: '#38bdf8', marginTop: '4px' }}>{metrics.verifiedMatchesCount}</div>
                <div style={{ fontSize: '0.75rem', color: '#38bdf8', marginTop: '4px' }}>Blind proof passed</div>
              </div>

              <div className="glass-card" style={{ padding: '20px' }}>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase' }}>Returned Items</div>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: '#34d399', marginTop: '4px' }}>{metrics.returnedItemsCount}</div>
                <div style={{ fontSize: '0.75rem', color: '#34d399', marginTop: '4px' }}>Dual confirmed return</div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: AMBIGUOUS QUEUE (PRD Section 10) */}
        {activeTab === 'ambiguous' && (
          <div>
            <div style={{ marginBottom: '24px' }}>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 700 }}>Ambiguous Match Resolution Queue (Section 10)</h2>
              <p style={{ color: '#94a3b8', fontSize: '0.88rem', marginTop: '4px' }}>
                PRD V1.5 Rule: When 2+ candidates score &ge; 85%, KHOJ does not auto-notify multiple owners. Status becomes AMBIGUOUS and routes here for manual review.
              </p>
            </div>

            {ambiguousReports.length === 0 ? (
              <div className="glass-panel" style={{ textAlign: 'center', padding: '60px 20px' }}>
                <CheckCircle2 style={{ width: '48px', height: '48px', color: '#10b981', margin: '0 auto 16px auto' }} />
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>No ambiguous cases currently pending</h3>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {ambiguousReports.map(report => (
                  <div key={report.id} className="glass-panel" style={{ padding: '24px', border: '1px solid rgba(168, 85, 247, 0.4)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                      <span className="status-pill status-ambiguous">Case #{report.id}</span>
                      <span style={{ fontSize: '0.85rem', color: '#cbd5e1' }}>Found at: <strong>{report.location}</strong></span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: MATCHES LEDGER (PRD Section 20A) */}
        {activeTab === 'matches' && (
          <div>
            <div style={{ marginBottom: '24px' }}>
              <div className="eyebrow" style={{ color: '#06b6d4' }}>PRD Section 20A Transparent Ledger</div>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 700 }}>Matches Table with Score Breakdown</h2>
              <p style={{ color: '#94a3b8', fontSize: '0.88rem', marginTop: '4px' }}>
                Every score component is stored separately so the pilot learns which signal (visual vs unique detail vs context) accurately predicts recovery.
              </p>
            </div>

            <div className="glass-panel" style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.84rem' }}>
                <thead>
                  <tr style={{ background: 'rgba(255, 255, 255, 0.02)', color: '#94a3b8', borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
                    <th style={{ padding: '12px 16px' }}>Match ID</th>
                    <th style={{ padding: '12px 16px' }}>Found Report</th>
                    <th style={{ padding: '12px 16px' }}>Candidate Item</th>
                    <th style={{ padding: '12px 16px' }}>Aggregate</th>
                    <th style={{ padding: '12px 16px' }}>Visual</th>
                    <th style={{ padding: '12px 16px' }}>Unique Detail</th>
                    <th style={{ padding: '12px 16px' }}>Context</th>
                    <th style={{ padding: '12px 16px' }}>Source</th>
                    <th style={{ padding: '12px 16px' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {matches.map(m => {
                    const it = items.find(i => i.id === m.item_id);
                    return (
                      <tr key={m.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                        <td style={{ padding: '12px 16px', color: '#818cf8', fontWeight: 600 }}>{m.id}</td>
                        <td style={{ padding: '12px 16px' }}>{m.found_report_id}</td>
                        <td style={{ padding: '12px 16px', color: '#f8fafc', fontWeight: 600 }}>{it?.name || m.item_id}</td>
                        <td style={{ padding: '12px 16px', fontWeight: 800, color: '#34d399' }}>{m.score}%</td>
                        <td style={{ padding: '12px 16px', color: '#cbd5e1' }}>{m.visual_score}%</td>
                        <td style={{ padding: '12px 16px', color: '#f59e0b', fontWeight: 600 }}>{m.unique_detail_score}%</td>
                        <td style={{ padding: '12px 16px', color: '#cbd5e1' }}>{m.context_score}%</td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{
                            padding: '2px 8px',
                            borderRadius: '4px',
                            background: m.source === 'ai_match' ? 'rgba(99, 102, 241, 0.15)' : 'rgba(6, 182, 212, 0.15)',
                            color: m.source === 'ai_match' ? '#818cf8' : '#22d3ee',
                            fontSize: '0.72rem',
                            fontWeight: 600
                          }}>
                            {m.source}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', textTransform: 'capitalize' }}>{m.status}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: MANUAL SEARCH FALLBACK (PRD Section 17) */}
        {activeTab === 'manual_search' && (
          <div>
            <div style={{ marginBottom: '24px' }}>
              <div className="eyebrow" style={{ color: '#f59e0b' }}>PRD Section 17 Fail-safe</div>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 700 }}>Manual Search Fallback Tool</h2>
              <p style={{ color: '#94a3b8', fontSize: '0.88rem', marginTop: '4px' }}>
                Multi-parameter search to manually browse inventory when AI matching is uncertain.
              </p>
            </div>

            <div className="glass-panel" style={{ padding: '24px', marginBottom: '28px' }}>
              <div className="grid-cols-4" style={{ gap: '14px' }}>
                <div>
                  <label className="form-label">Category</label>
                  <select 
                    className="form-select"
                    value={searchCategory}
                    onChange={e => setSearchCategory(e.target.value)}
                  >
                    <option value="all">All Categories</option>
                    <option value="Earbuds">Earbuds</option>
                    <option value="Phone">Phone</option>
                    <option value="Laptop">Laptop</option>
                    <option value="Charger">Charger</option>
                    <option value="Water Bottle">Water Bottle</option>
                    <option value="Watch">Watch</option>
                  </select>
                </div>

                <div>
                  <label className="form-label">Brand</label>
                  <input
                    type="text"
                    placeholder="e.g. Apple / Lenovo"
                    className="form-input"
                    value={searchBrand}
                    onChange={e => setSearchBrand(e.target.value)}
                  />
                </div>

                <div>
                  <label className="form-label">Colour</label>
                  <input
                    type="text"
                    placeholder="e.g. White / Lilac"
                    className="form-input"
                    value={searchColor}
                    onChange={e => setSearchColor(e.target.value)}
                  />
                </div>

                <div>
                  <label className="form-label">Keyword / Mark</label>
                  <input
                    type="text"
                    placeholder="Scratch, sticker, etc."
                    className="form-input"
                    value={searchKeyword}
                    onChange={e => setSearchKeyword(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Results Table */}
            <div className="glass-panel" style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ background: 'rgba(255, 255, 255, 0.02)', color: '#94a3b8', borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
                    <th style={{ padding: '12px 18px' }}>Item</th>
                    <th style={{ padding: '12px 18px' }}>Category</th>
                    <th style={{ padding: '12px 18px' }}>Owner</th>
                    <th style={{ padding: '12px 18px' }}>Unique Identifying Detail</th>
                    <th style={{ padding: '12px 18px' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {manualSearchResults.map(item => (
                    <tr key={item.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                      <td style={{ padding: '14px 18px', fontWeight: 600, color: '#f8fafc' }}>
                        {item.name}
                      </td>
                      <td style={{ padding: '14px 18px', color: '#94a3b8' }}>{item.category}</td>
                      <td style={{ padding: '14px 18px', color: '#cbd5e1' }}>{item.ownerName}</td>
                      <td style={{ padding: '14px 18px', color: '#fbbf24', maxWidth: '260px' }}>
                        "{item.unique_detail}"
                      </td>
                      <td style={{ padding: '14px 18px' }}>
                        <span className={`status-pill status-${item.status}`}>
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
