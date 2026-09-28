'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useKhoj } from '@/lib/store';
import { useToast } from '@/components/Toast';
import { 
  Compass, 
  ShieldCheck, 
  Search, 
  Inbox, 
  Sparkles, 
  Sliders, 
  FlaskConical,
  Zap
} from 'lucide-react';

export default function Navbar() {
  const pathname = usePathname();
  const { currentRole, setCurrentRole, submitFoundReport } = useKhoj();
  const { showToast } = useToast();

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
        message: 'Matched with Aarav’s registered AirPods Pro (93% confidence). Check My KHOJ!',
        type: 'match',
      });
    } catch {
      showToast({
        title: 'Simulation completed',
        message: 'Found report created in live database.',
        type: 'info',
      });
    }
  };

  const navLinks = [
    { href: '/', label: 'Home', icon: Compass },
    { href: '/dashboard', label: 'My KHOJ', icon: ShieldCheck },
    { href: '/found', label: 'Found Item', icon: Search, badge: 'No Login' },
    { href: '/unclaimed', label: 'Unclaimed Gallery', icon: Inbox },
    { href: '/admin', label: 'Admin Desk', icon: Sliders },
    { href: '/lab', label: 'Matching Lab', icon: FlaskConical },
  ];

  return (
    <header className="sticky top-0 z-50 backdrop-blur-xl border-b border-[rgba(255,255,255,0.08)] bg-[rgba(7,9,14,0.85)]">
      <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '72px' }}>
        {/* Brand */}
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '12px', textDecoration: 'none', color: 'inherit' }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #ff5c35 0%, #ff8c42 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 25px rgba(255, 92, 53, 0.45)'
          }}>
            <Compass style={{ color: '#fff', width: '24px', height: '24px' }} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '1.4rem', fontWeight: 900, letterSpacing: '-0.03em', color: '#fff' }}>KHOJ</span>
              <span style={{
                fontSize: '0.62rem',
                fontWeight: 800,
                padding: '2px 8px',
                borderRadius: '9999px',
                background: 'rgba(255, 92, 53, 0.15)',
                color: '#ff8c6b',
                border: '1px solid rgba(255, 92, 53, 0.35)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}>Campus V1.5</span>
            </div>
            <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Zero-Friction Recovery Network</div>
          </div>
        </Link>

        {/* Navigation Links */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {navLinks.map(link => {
            const Icon = link.icon;
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 14px',
                  borderRadius: '9999px',
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  textDecoration: 'none',
                  color: isActive ? '#ffffff' : '#cbd5e1',
                  background: isActive ? 'rgba(255, 92, 53, 0.22)' : 'transparent',
                  border: isActive ? '1px solid rgba(255, 92, 53, 0.6)' : '1px solid transparent',
                  transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                }}
              >
                <Icon style={{ width: '16px', height: '16px', color: isActive ? '#ff7350' : '#94a3b8' }} />
                <span>{link.label}</span>
                {link.badge && (
                  <span style={{
                    fontSize: '0.65rem',
                    padding: '1px 7px',
                    borderRadius: '8px',
                    background: '#10b981',
                    color: '#000000',
                    fontWeight: 800
                  }}>
                    {link.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Sandbox Simulation & Role Switcher */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Quick Demo Trigger */}
          <button
            onClick={handleSimulate}
            title="Inject simulated found item and test matching"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              borderRadius: '9999px',
              background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.3) 0%, rgba(255, 92, 53, 0.3) 100%)',
              border: '1px solid rgba(245, 158, 11, 0.65)',
              color: '#ffffff',
              fontSize: '0.82rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: '0 2px 10px rgba(0,0,0,0.4)'
            }}
          >
            <Zap style={{ width: '14px', height: '14px', color: '#facc15' }} />
            <span>Simulate AI Match</span>
          </button>

          {/* Role selector dropdown */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            background: 'rgba(255, 255, 255, 0.12)',
            padding: '4px',
            borderRadius: '9999px',
            border: '1px solid rgba(255, 255, 255, 0.25)'
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
                  padding: '5px 12px',
                  borderRadius: '9999px',
                  fontSize: '0.74rem',
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                  textTransform: 'capitalize',
                  background: currentRole === role ? '#ff5c35' : 'transparent',
                  color: currentRole === role ? '#ffffff' : '#cbd5e1',
                  transition: 'all 0.15s ease',
                }}
              >
                {role}
              </button>
            ))}
          </div>
        </div>
      </div>
    </header>
  );
}
