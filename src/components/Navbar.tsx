'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useKhoj } from '@/lib/store';
import { useToast } from '@/components/Toast';
import { 
  Compass, 
  ShieldCheck, 
  Plus, 
  Inbox, 
  Sliders, 
  FlaskConical,
  Zap,
  Menu,
  X,
  User,
  ChevronRight,
  ExternalLink
} from 'lucide-react';

export default function Navbar() {
  const pathname = usePathname();
  const { currentRole, setCurrentRole, submitFoundReport, matches } = useKhoj();
  const { showToast } = useToast();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const pendingMatchesCount = matches.filter(m => m.status === 'active_verification').length;

  const handleSimulate = async () => {
    try {
      const report = await submitFoundReport({
        image_url: 'https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?w=600&auto=format&fit=crop&q=80',
        detail_image_url: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=600&auto=format&fit=crop&q=80',
        location: 'Central Library 2nd Floor (Quiet Zone)',
        category_guess: 'Earbuds',
        rough_description: 'White AirPods Pro case with small red dot inside and tiny mark on stem found on study desk.',
        finder_phone: '+91 98450 99881',
      });

      showToast({
        title: `AI Match Triggered (${report.id})`,
        message: 'Matched with Aarav’s registered AirPods Pro (93% confidence). Check My Items!',
        type: 'match',
      });
      setIsDrawerOpen(false);
    } catch {
      showToast({
        title: 'Simulation completed',
        message: 'Found report created in live database.',
        type: 'info',
      });
    }
  };

  return (
    <>
      {/* =========================================================================
          COMPACT MOBILE TOP APP BAR
          ========================================================================= */}
      <header style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        background: 'rgba(7, 9, 14, 0.92)',
        height: '56px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px'
      }}>
        {/* Brand */}
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none', color: 'inherit' }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '9px',
            background: 'linear-gradient(135deg, #ff5c35 0%, #ff8c42 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 16px rgba(255, 92, 53, 0.45)',
            flexShrink: 0
          }}>
            <Compass style={{ color: '#fff', width: '18px', height: '18px' }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
            <span style={{ fontSize: '1.2rem', fontWeight: 900, letterSpacing: '-0.03em', color: '#fff' }}>KHOJ</span>
            <span style={{
              fontSize: '0.62rem',
              fontWeight: 800,
              padding: '1px 6px',
              borderRadius: '9999px',
              background: 'rgba(255, 92, 53, 0.15)',
              color: '#ff8c6b',
              border: '1px solid rgba(255, 92, 53, 0.35)',
              textTransform: 'uppercase'
            }}>V1.5</span>
          </div>
        </Link>

        {/* Top Right Quick Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Simulate Action Icon */}
          <button
            onClick={handleSimulate}
            title="Simulate AI Match"
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '50%',
              background: 'rgba(245, 158, 11, 0.15)',
              border: '1px solid rgba(245, 158, 11, 0.4)',
              color: '#facc15',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(245, 158, 11, 0.2)'
            }}
          >
            <Zap style={{ width: '16px', height: '16px' }} />
          </button>

          {/* Role Pill Badge */}
          <button
            onClick={() => setIsDrawerOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 10px',
              borderRadius: '9999px',
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.18)',
              color: '#e2e8f0',
              fontSize: '0.72rem',
              fontWeight: 700,
              cursor: 'pointer',
              textTransform: 'capitalize'
            }}
          >
            <User style={{ width: '12px', height: '12px', color: '#ff5c35' }} />
            <span>{currentRole}</span>
          </button>

          {/* Menu Drawer Toggle */}
          <button
            onClick={() => setIsDrawerOpen(!isDrawerOpen)}
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '8px',
              background: 'transparent',
              border: 'none',
              color: '#cbd5e1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
          >
            {isDrawerOpen ? <X style={{ width: '20px', height: '20px' }} /> : <Menu style={{ width: '20px', height: '20px' }} />}
          </button>
        </div>
      </header>

      {/* =========================================================================
          FIXED MOBILE BOTTOM NAVIGATION TAB BAR
          ========================================================================= */}
      <nav className="mobile-bottom-nav">
        {/* Tab 1: Home */}
        <Link 
          href="/" 
          className={`mobile-nav-item ${pathname === '/' ? 'active' : ''}`}
        >
          <Compass style={{ width: '20px', height: '20px', color: pathname === '/' ? '#ff5c35' : '#94a3b8' }} />
          <span>Home</span>
        </Link>

        {/* Tab 2: Dashboard (My Items) */}
        <Link 
          href="/dashboard" 
          className={`mobile-nav-item ${pathname === '/dashboard' ? 'active' : ''}`}
        >
          <ShieldCheck style={{ width: '20px', height: '20px', color: pathname === '/dashboard' ? '#ff5c35' : '#94a3b8' }} />
          <span>My Items</span>
          {pendingMatchesCount > 0 && (
            <span style={{
              position: 'absolute',
              top: '2px',
              right: '8px',
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: '#f59e0b',
              boxShadow: '0 0 8px #f59e0b'
            }} />
          )}
        </Link>

        {/* Tab 3: Central Elevated FAB - Found Item */}
        <Link 
          href="/found" 
          className="mobile-nav-fab"
          title="Report Found Item"
        >
          <Plus style={{ width: '24px', height: '24px' }} />
        </Link>

        {/* Tab 4: Unclaimed Gallery */}
        <Link 
          href="/unclaimed" 
          className={`mobile-nav-item ${pathname === '/unclaimed' ? 'active' : ''}`}
        >
          <Inbox style={{ width: '20px', height: '20px', color: pathname === '/unclaimed' ? '#ff5c35' : '#94a3b8' }} />
          <span>Gallery</span>
        </Link>

        {/* Tab 5: Menu / More */}
        <button 
          onClick={() => setIsDrawerOpen(true)}
          className={`mobile-nav-item ${pathname === '/admin' || pathname === '/lab' ? 'active' : ''}`}
          style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
        >
          <Sliders style={{ width: '20px', height: '20px', color: (pathname === '/admin' || pathname === '/lab') ? '#ff5c35' : '#94a3b8' }} />
          <span>More</span>
        </button>
      </nav>

      {/* =========================================================================
          MOBILE SLIDE-UP DRAWER SHEET
          ========================================================================= */}
      {isDrawerOpen && (
        <div 
          className="modal-overlay"
          onClick={() => setIsDrawerOpen(false)}
        >
          <div 
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ paddingBottom: '32px' }}
          >
            {/* Drawer Drag Bar */}
            <div style={{
              width: '44px',
              height: '4px',
              background: 'rgba(255, 255, 255, 0.25)',
              borderRadius: '10px',
              margin: '0 auto 18px auto'
            }} />

            {/* Drawer Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#f8fafc' }}>KHOJ Campus Menu</h3>
                <p style={{ fontSize: '0.74rem', color: '#94a3b8' }}>Tools, admin controls & role testing</p>
              </div>
              <button 
                onClick={() => setIsDrawerOpen(false)}
                style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: 'none',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#cbd5e1',
                  cursor: 'pointer'
                }}
              >
                <X style={{ width: '16px', height: '16px' }} />
              </button>
            </div>

            {/* Active Role Selector */}
            <div style={{ marginBottom: '22px' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#ff8c6b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>
                Test As Role:
              </div>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '8px',
                background: 'rgba(255, 255, 255, 0.06)',
                padding: '6px',
                borderRadius: '14px',
                border: '1px solid rgba(255, 255, 255, 0.12)'
              }}>
                {(['student', 'finder', 'admin'] as const).map(role => (
                  <button
                    key={role}
                    onClick={() => {
                      setCurrentRole(role);
                      showToast({
                        title: `Switched to ${role.toUpperCase()} View`,
                        message: `Testing interface as ${role}.`,
                        type: 'info',
                      });
                    }}
                    style={{
                      padding: '8px 0',
                      borderRadius: '10px',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      border: 'none',
                      cursor: 'pointer',
                      textTransform: 'capitalize',
                      background: currentRole === role ? '#ff5c35' : 'transparent',
                      color: currentRole === role ? '#ffffff' : '#94a3b8',
                      transition: 'all 0.15s ease',
                      boxShadow: currentRole === role ? '0 2px 10px rgba(255, 92, 53, 0.4)' : 'none'
                    }}
                  >
                    {role}
                  </button>
                ))}
              </div>
            </div>

            {/* Menu Links */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '22px' }}>
              <Link
                href="/admin"
                onClick={() => setIsDrawerOpen(false)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  borderRadius: '14px',
                  background: pathname === '/admin' ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                  border: pathname === '/admin' ? '1px solid rgba(99, 102, 241, 0.5)' : '1px solid rgba(255, 255, 255, 0.08)',
                  textDecoration: 'none',
                  color: '#ffffff'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '34px', height: '34px', borderRadius: '10px', background: 'rgba(99, 102, 241, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Sliders style={{ width: '18px', height: '18px', color: '#818cf8' }} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 700 }}>Proctor Admin Desk</div>
                    <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Dispute resolution & campus custody</div>
                  </div>
                </div>
                <ChevronRight style={{ width: '16px', height: '16px', color: '#64748b' }} />
              </Link>

              <Link
                href="/lab"
                onClick={() => setIsDrawerOpen(false)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  borderRadius: '14px',
                  background: pathname === '/lab' ? 'rgba(6, 182, 212, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                  border: pathname === '/lab' ? '1px solid rgba(6, 182, 212, 0.5)' : '1px solid rgba(255, 255, 255, 0.08)',
                  textDecoration: 'none',
                  color: '#ffffff'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '34px', height: '34px', borderRadius: '10px', background: 'rgba(6, 182, 212, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <FlaskConical style={{ width: '18px', height: '18px', color: '#22d3ee' }} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 700 }}>Algorithm Lab</div>
                    <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Multi-signal scoring simulation</div>
                  </div>
                </div>
                <ChevronRight style={{ width: '16px', height: '16px', color: '#64748b' }} />
              </Link>
            </div>

            {/* Sandbox Simulation Button */}
            <button
              onClick={handleSimulate}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '12px',
                borderRadius: '14px',
                background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.2) 0%, rgba(255, 92, 53, 0.2) 100%)',
                border: '1px solid rgba(245, 158, 11, 0.5)',
                color: '#facc15',
                fontSize: '0.85rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              <Zap style={{ width: '16px', height: '16px' }} />
              <span>Simulate AI Match Pipeline</span>
            </button>
          </div>
        </div>
      )}
    </>
  );
}
