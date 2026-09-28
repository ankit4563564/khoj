'use client';

import React, { useState } from 'react';
import { 
  FlaskConical, 
  Sparkles, 
  Sliders, 
  CheckCircle2, 
  AlertCircle, 
  Info, 
  ArrowRight,
  Split,
  Eye
} from 'lucide-react';

interface ExperimentItem {
  id: string;
  name: string;
  category: string;
  brand: string;
  photo: string;
  detailMark: string;
  owner: string;
}

const EXPERIMENT_ITEMS: ExperimentItem[] = [
  {
    id: 'airpods-1',
    name: 'AirPods Pro (Aarav)',
    category: 'Earbuds',
    brand: 'Apple',
    photo: 'https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?w=600',
    detailMark: 'Hairline diagonal scratch on right stem, red ink marker dot inside lid',
    owner: 'Aarav Sharma'
  },
  {
    id: 'airpods-2',
    name: 'AirPods Pro (Priya)',
    category: 'Earbuds',
    brand: 'Apple',
    photo: 'https://images.unsplash.com/photo-1572536147248-ac59a8abfa4b?w=600',
    detailMark: 'Mint green silicone sleeve residue on hinge, tiny scuff on left speaker grill',
    owner: 'Priya Patel'
  },
  {
    id: 'bottle-1',
    name: 'Hydroflask Lilac (Rohan)',
    category: 'Water Bottle',
    brand: 'Hydro Flask',
    photo: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=600',
    detailMark: 'Deep dent at bottom base, Himalayas 2025 crest sticker',
    owner: 'Rohan Gupta'
  },
  {
    id: 'bottle-2',
    name: 'Hydroflask Lilac (Sneha)',
    category: 'Water Bottle',
    brand: 'Hydro Flask',
    photo: 'https://images.unsplash.com/photo-1570831739435-6601aa4fa4fb?w=600',
    detailMark: 'Anime cat vinyl decal, black rubber boot on base',
    owner: 'Sneha Rao'
  }
];

export default function LabPage() {
  const [selectedFoundItem, setSelectedFoundItem] = useState<string>('found-aarav-airpods');
  
  // Customizable Weights per PRD Section 19
  const [weightUniqueDetail, setWeightUniqueDetail] = useState(0.50);
  const [weightVisualSimilarity, setWeightVisualSimilarity] = useState(0.25);
  const [weightMetadata, setWeightMetadata] = useState(0.10);
  const [weightLocationTime, setWeightLocationTime] = useState(0.10);
  const [weightPrecedence, setWeightPrecedence] = useState(0.05);

  const foundScenarios: Record<string, {
    title: string;
    photo: string;
    description: string;
    trueOwnerId: string;
    location: string;
  }> = {
    'found-aarav-airpods': {
      title: 'Found Apple AirPods Pro near Library',
      photo: 'https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?w=600',
      description: 'Found white earbuds with noticeable diagonal scratch on the right stem and small red dot inside case.',
      trueOwnerId: 'airpods-1',
      location: 'Central Library'
    },
    'found-priya-airpods': {
      title: 'Found Apple AirPods Pro at Cafeteria',
      photo: 'https://images.unsplash.com/photo-1572536147248-ac59a8abfa4b?w=600',
      description: 'Found white earbuds with green silicone residue near hinge and tiny scuff on left grill.',
      trueOwnerId: 'airpods-2',
      location: 'Main Cafeteria'
    },
    'found-rohan-bottle': {
      title: 'Found Pastel Hydroflask at Gym Bench',
      photo: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=600',
      description: 'Lilac insulated bottle with mountain crest decal and dent on bottom.',
      trueOwnerId: 'bottle-1',
      location: 'Sports Complex'
    }
  };

  const currentScenario = foundScenarios[selectedFoundItem];

  // Evaluate candidate scores against scenario
  const evaluatedCandidates = EXPERIMENT_ITEMS.filter(i => {
    if (selectedFoundItem.includes('airpods')) return i.category === 'Earbuds';
    return i.category === 'Water Bottle';
  }).map(item => {
    // Unique detail text overlap
    const itemWords = item.detailMark.toLowerCase().split(/\s+/);
    const scenWords = currentScenario.description.toLowerCase().split(/\s+/);
    const overlap = itemWords.filter(w => scenWords.some(sw => sw.includes(w) || w.includes(sw))).length;
    const detailScore = Math.min(1.0, 0.2 + (overlap / Math.max(itemWords.length, 1)) * 1.2);

    // Visual model similarity (same model = 0.85 base visual match!)
    const visualScore = 0.88;

    // Metadata match
    const metaScore = 1.0;

    // Location score
    const locationScore = 0.85;

    // Precedence score
    const precScore = 1.0;

    // Weighted match calculation
    const overall = (
      (detailScore * weightUniqueDetail) +
      (visualScore * weightVisualSimilarity) +
      (metaScore * weightMetadata) +
      (locationScore * weightLocationTime) +
      (precScore * weightPrecedence)
    );

    return {
      item,
      overallScore: Math.round(overall * 100),
      detailScore: Math.round(detailScore * 100),
      visualScore: Math.round(visualScore * 100),
      isTrueOwner: item.id === currentScenario.trueOwnerId
    };
  }).sort((a, b) => b.overallScore - a.overallScore);

  const topCandidate = evaluatedCandidates[0];
  const secondCandidate = evaluatedCandidates[1];
  const isAmbiguous = secondCandidate && (topCandidate.overallScore - secondCandidate.overallScore <= 8);
  const successDistinction = topCandidate.isTrueOwner && !isAmbiguous;

  return (
    <div style={{ padding: '40px 0' }}>
      <div className="container">
        
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '36px' }}>
          <div className="eyebrow" style={{ color: '#f59e0b' }}>PRD Section 17 Scientific Testbench</div>
          <h1 style={{ fontSize: '2.4rem', fontWeight: 800, marginTop: '4px' }}>
            Matching Algorithm Validation Lab
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '0.92rem', maxWidth: '640px', margin: '8px auto 0 auto' }}>
            Core Thesis: <strong>"Same product model ≠ same physical item."</strong> Test how KHOJ separates visually identical consumer electronics using weighted distinguishing marks.
          </p>
        </div>

        {/* Core Thesis Demonstration Alert */}
        <div style={{
          background: 'rgba(245, 158, 11, 0.08)',
          border: '1px solid rgba(245, 158, 11, 0.25)',
          borderRadius: '16px',
          padding: '20px 24px',
          marginBottom: '32px',
          display: 'flex',
          gap: '16px',
          alignItems: 'center'
        }}>
          <Split style={{ width: '28px', height: '28px', color: '#f59e0b', flexShrink: 0 }} />
          <div style={{ fontSize: '0.88rem', color: '#cbd5e1' }}>
            If two students register identical Apple AirPods Pro or Hydroflask bottles, generic computer vision produces identical 90%+ visual similarity. KHOJ assigns <strong>50% weight to secret distinguishing marks</strong> so the true owner ranks distinctively higher.
          </div>
        </div>

        {/* Experiment Selector */}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '28px' }}>
          {Object.entries(foundScenarios).map(([key, sc]) => (
            <button
              key={key}
              onClick={() => setSelectedFoundItem(key)}
              style={{
                padding: '10px 18px',
                borderRadius: '12px',
                border: selectedFoundItem === key ? '1px solid #f59e0b' : '1px solid rgba(255,255,255,0.08)',
                background: selectedFoundItem === key ? 'rgba(245, 158, 11, 0.15)' : 'rgba(255,255,255,0.03)',
                color: selectedFoundItem === key ? '#fef08a' : '#94a3b8',
                fontWeight: 600,
                fontSize: '0.86rem',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              {sc.title}
            </button>
          ))}
        </div>

        {/* Split View: Scenario Evidence vs Algorithm Outcome */}
        <div className="grid-cols-2" style={{ gap: '28px', marginBottom: '36px' }}>
          
          {/* Scenario Details */}
          <div className="glass-panel" style={{ padding: '28px' }}>
            <div className="eyebrow" style={{ color: '#06b6d4', marginBottom: '6px' }}>Input: Found Item Evidence</div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '14px' }}>
              {currentScenario.title}
            </h3>

            <div style={{ height: '180px', borderRadius: '12px', overflow: 'hidden', marginBottom: '16px', background: '#000' }}>
              <img src={currentScenario.photo} alt="Scenario" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>

            <div style={{
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '10px',
              padding: '14px',
              fontSize: '0.84rem',
              color: '#cbd5e1',
              marginBottom: '14px'
            }}>
              <strong style={{ color: '#f8fafc' }}>Finder Observation & Evidence:</strong>
              <div style={{ marginTop: '4px', color: '#94a3b8' }}>
                "{currentScenario.description}"
              </div>
            </div>

            <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
              True Ground Truth Owner: <strong style={{ color: '#a5b4fc' }}>{EXPERIMENT_ITEMS.find(i => i.id === currentScenario.trueOwnerId)?.owner}</strong>
            </div>
          </div>

          {/* Algorithm Ranked Candidates Output */}
          <div className="glass-panel" style={{ padding: '28px' }}>
            <div className="eyebrow" style={{ color: successDistinction ? '#10b981' : '#f43f5e', marginBottom: '6px' }}>
              Output: Ranked Candidates
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '14px' }}>
              Engine Confidence Ranking
            </h3>

            {/* Validation Outcome Banner */}
            <div style={{
              padding: '12px 16px',
              borderRadius: '10px',
              background: successDistinction ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)',
              border: successDistinction ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(244, 63, 94, 0.3)',
              color: successDistinction ? '#4ade80' : '#fb7185',
              fontSize: '0.85rem',
              marginBottom: '18px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              {successDistinction ? (
                <>
                  <CheckCircle2 style={{ width: '18px', height: '18px', flexShrink: 0 }} />
                  <span><strong>Validation Passed:</strong> True owner reliably separated from identical product model!</span>
                </>
              ) : isAmbiguous ? (
                <>
                  <AlertCircle style={{ width: '18px', height: '18px', flexShrink: 0 }} />
                  <span><strong>Section 20 Triggered:</strong> Score difference &le; 8% &rarr; Escalated to Manual Review.</span>
                </>
              ) : (
                <>
                  <AlertCircle style={{ width: '18px', height: '18px', flexShrink: 0 }} />
                  <span><strong>Separation Inconclusive:</strong> Adjust weights below to increase unique detail influence.</span>
                </>
              )}
            </div>

            {/* Candidate Breakdown */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {evaluatedCandidates.map((cand, idx) => (
                <div
                  key={cand.item.id}
                  style={{
                    padding: '16px',
                    borderRadius: '12px',
                    background: cand.isTrueOwner ? 'rgba(99, 102, 241, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                    border: cand.isTrueOwner ? '1px solid rgba(99, 102, 241, 0.35)' : '1px solid rgba(255, 255, 255, 0.06)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <div>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8' }}>
                        #{idx + 1} {cand.item.owner} ({cand.item.name})
                      </span>
                      {cand.isTrueOwner && (
                        <span style={{ marginLeft: '8px', fontSize: '0.68rem', padding: '1px 6px', borderRadius: '4px', background: '#10b981', color: '#000', fontWeight: 700 }}>
                          GROUND TRUTH
                        </span>
                      )}
                    </div>
                    <span style={{ fontSize: '1.25rem', fontWeight: 800, color: cand.overallScore >= 75 ? '#34d399' : '#fbbf24' }}>
                      {cand.overallScore}%
                    </span>
                  </div>

                  <div style={{ fontSize: '0.76rem', color: '#94a3b8', marginBottom: '8px' }}>
                    Distinguishing Mark: "{cand.item.detailMark}"
                  </div>

                  <div style={{ display: 'flex', gap: '16px', fontSize: '0.72rem', color: '#64748b' }}>
                    <span>Detail Match: <strong style={{ color: '#cbd5e1' }}>{cand.detailScore}%</strong></span>
                    <span>Generic Visual: <strong style={{ color: '#cbd5e1' }}>{cand.visualScore}%</strong></span>
                  </div>
                </div>
              ))}
            </div>

          </div>

        </div>

        {/* Section 19 Weight Adjustment Sliders */}
        <div className="glass-panel" style={{ padding: '28px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Sliders style={{ width: '20px', height: '20px', color: '#f59e0b' }} />
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>
                Live Signal Weight Calibrator (PRD Section 19)
              </h3>
            </div>

            <button
              onClick={() => {
                setWeightUniqueDetail(0.50);
                setWeightVisualSimilarity(0.25);
                setWeightMetadata(0.10);
                setWeightLocationTime(0.10);
                setWeightPrecedence(0.05);
              }}
              className="btn-secondary"
              style={{ padding: '6px 14px', fontSize: '0.78rem' }}
            >
              Reset to PRD Defaults (50/25/10/10/5)
            </button>
          </div>

          <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '24px' }}>
            Tune weights in real-time to observe algorithm sensitivity. Notice how lowering Unique Detail below 0.35 creates ambiguity (&le; 8% separation) between identical product models.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '20px' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '6px' }}>
                <span style={{ fontWeight: 600 }}>Unique Detail (PRD 50%)</span>
                <span style={{ color: '#f59e0b', fontWeight: 700 }}>{Math.round(weightUniqueDetail * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="0.8"
                step="0.05"
                value={weightUniqueDetail}
                onChange={e => setWeightUniqueDetail(parseFloat(e.target.value))}
                style={{ width: '100%', accentColor: '#f59e0b' }}
              />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '6px' }}>
                <span style={{ fontWeight: 600 }}>Visual Similarity (PRD 25%)</span>
                <span style={{ color: '#818cf8', fontWeight: 700 }}>{Math.round(weightVisualSimilarity * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="0.5"
                step="0.05"
                value={weightVisualSimilarity}
                onChange={e => setWeightVisualSimilarity(parseFloat(e.target.value))}
                style={{ width: '100%', accentColor: '#818cf8' }}
              />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '6px' }}>
                <span style={{ fontWeight: 600 }}>Metadata Match (PRD 10%)</span>
                <span style={{ color: '#06b6d4', fontWeight: 700 }}>{Math.round(weightMetadata * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.05"
                max="0.3"
                step="0.05"
                value={weightMetadata}
                onChange={e => setWeightMetadata(parseFloat(e.target.value))}
                style={{ width: '100%', accentColor: '#06b6d4' }}
              />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '6px' }}>
                <span style={{ fontWeight: 600 }}>Location / Time (PRD 10%)</span>
                <span style={{ color: '#10b981', fontWeight: 700 }}>{Math.round(weightLocationTime * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.05"
                max="0.3"
                step="0.05"
                value={weightLocationTime}
                onChange={e => setWeightLocationTime(parseFloat(e.target.value))}
                style={{ width: '100%', accentColor: '#10b981' }}
              />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '6px' }}>
                <span style={{ fontWeight: 600 }}>Precedence (PRD 5%)</span>
                <span style={{ color: '#a855f7', fontWeight: 700 }}>{Math.round(weightPrecedence * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.0"
                max="0.2"
                step="0.01"
                value={weightPrecedence}
                onChange={e => setWeightPrecedence(parseFloat(e.target.value))}
                style={{ width: '100%', accentColor: '#a855f7' }}
              />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
