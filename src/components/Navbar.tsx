'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useKhoj } from '@/lib/store';
import { Menu, X } from 'lucide-react';

export default function Navbar() {
  const pathname = usePathname();
  const { currentRole, setCurrentRole, matches } = useKhoj();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const pendingMatchesCount = matches.filter(m => m.status === 'active_verification').length;

  const navLinks = [
    { href: '/dashboard', label: 'My Items', badge: pendingMatchesCount > 0 ? `${pendingMatchesCount}` : null },
    { href: '/found', label: 'Found Something' },
    { href: '/unclaimed', label: 'Unclaimed' },
  ];

  return (
    <header style={{
      borderBottom: '1px solid var(--border-subtle)',
      backgroundColor: '#FFFFFF',
      position: 'sticky',
      top: 0,
      zIndex: 40,
    }}>
      <div className="container" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: '56px'
      }}>
        {/* Brand */}
        <Link 
          href="/" 
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px', 
            textDecoration: 'none', 
            color: 'var(--text-primary)' 
          }}
        >
          <span style={{ fontSize: '17px', fontWeight: 700, letterSpacing: '-0.02em' }}>
            KHOJ
          </span>
          <span style={{ 
            fontSize: '11px', 
            fontWeight: 500, 
            color: 'var(--text-muted)',
            paddingLeft: '6px',
            borderLeft: '1px solid var(--border-subtle)'
          }}>
            Campus
          </span>
        </Link>

        {/* Desktop Navigation Links */}
        <nav style={{ display: 'none', alignItems: 'center', gap: '4px' }} className="desktop-nav">
          {navLinks.map(link => {
            const isActive = pathname === link.href || (link.href !== '/' && pathname?.startsWith(link.href));
            return (
              <Link
                key={link.href}
                href={link.href}
                style={{
                  fontSize: '13px',
                  fontWeight: 500,
                  textDecoration: 'none',
                  color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                  padding: '6px 12px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: isActive ? 'var(--bg-subtle)' : 'transparent',
                  transition: 'background-color 140ms ease-out, color 140ms ease-out',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <span>{link.label}</span>
                {link.badge && (
                  <span style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    backgroundColor: '#FEF3C7',
                    color: '#92400E',
                    padding: '1px 6px',
                    borderRadius: 'var(--radius-sm)',
                  }}>
                    {link.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Desktop Right: Role Switcher & Admin */}
        <div style={{ display: 'none', alignItems: 'center', gap: '10px' }} className="desktop-nav">
          <div style={{
            display: 'flex',
            alignItems: 'center',
            backgroundColor: 'var(--bg-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '2px',
            border: '1px solid var(--border-subtle)'
          }}>
            {(['student', 'finder', 'admin'] as const).map(role => (
              <button
                key={role}
                onClick={() => setCurrentRole(role)}
                style={{
                  border: 'none',
                  background: currentRole === role ? '#FFFFFF' : 'transparent',
                  color: currentRole === role ? 'var(--text-primary)' : 'var(--text-secondary)',
                  padding: '4px 9px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '12px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  textTransform: 'capitalize',
                  boxShadow: currentRole === role ? 'var(--shadow-sm)' : 'none',
                  transition: 'all 120ms ease-out'
                }}
              >
                {role}
              </button>
            ))}
          </div>

          {currentRole === 'admin' && (
            <Link
              href="/admin"
              style={{
                fontSize: '12px',
                fontWeight: 500,
                color: 'var(--text-secondary)',
                textDecoration: 'none',
                padding: '4px 8px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)'
              }}
            >
              Admin Desk
            </Link>
          )}
        </div>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle Navigation"
          className="mobile-menu-btn"
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-primary)',
            cursor: 'pointer',
            padding: '8px',
            minHeight: '44px',
            minWidth: '44px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile Dropdown */}
      {mobileMenuOpen && (
        <div style={{
          borderTop: '1px solid var(--border-subtle)',
          backgroundColor: '#FFFFFF',
          padding: '12px 16px 16px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px'
        }}>
          {navLinks.map(link => {
            const isActive = pathname === link.href || (link.href !== '/' && pathname?.startsWith(link.href));
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                style={{
                  fontSize: '14px',
                  fontWeight: 500,
                  textDecoration: 'none',
                  color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: isActive ? 'var(--bg-subtle)' : 'transparent',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  minHeight: '44px'
                }}
              >
                <span>{link.label}</span>
                {link.badge && (
                  <span style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    backgroundColor: '#FEF3C7',
                    color: '#92400E',
                    padding: '2px 8px',
                    borderRadius: 'var(--radius-sm)',
                  }}>
                    {link.badge}
                  </span>
                )}
              </Link>
            );
          })}

          <div style={{
            paddingTop: '12px',
            marginTop: '4px',
            borderTop: '1px solid var(--border-subtle)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Role mode:</span>
            <div style={{
              display: 'flex',
              backgroundColor: 'var(--bg-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '2px'
            }}>
              {(['student', 'finder', 'admin'] as const).map(role => (
                <button
                  key={role}
                  onClick={() => setCurrentRole(role)}
                  style={{
                    border: 'none',
                    background: currentRole === role ? '#FFFFFF' : 'transparent',
                    color: currentRole === role ? 'var(--text-primary)' : 'var(--text-secondary)',
                    padding: '6px 10px',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '12px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    textTransform: 'capitalize',
                    boxShadow: currentRole === role ? 'var(--shadow-sm)' : 'none',
                    minHeight: '36px'
                  }}
                >
                  {role}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @media (min-width: 768px) {
          .desktop-nav {
            display: flex !important;
          }
          .mobile-menu-btn {
            display: none !important;
          }
        }
      `}</style>
    </header>
  );
}
