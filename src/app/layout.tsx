import type { Metadata, Viewport } from 'next';
import '@/styles/globals.css';
import { KhojProvider } from '@/lib/store';
import { ToastProvider } from '@/components/Toast';
import Navbar from '@/components/Navbar';
import Link from 'next/link';
import { ShieldCheck, Heart, Lock, School, Wifi, BatteryCharging } from 'lucide-react';

export const metadata: Metadata = {
  title: 'KHOJ — Campus Lost & Found MVP',
  description: 'Helping students find the owner of lost items using a photo, AI matching, and simple ownership verification.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#07090e',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <KhojProvider>
          <ToastProvider>
            {/* Ambient luminous lighting */}
            <div className="ambient-glow-wrapper">
              <div className="ambient-orb orb-indigo" />
              <div className="ambient-orb orb-coral" />
              <div className="ambient-orb orb-cyan" />
            </div>

            {/* Centered Phone Shell Wrapper */}
            <div className="phone-frame-wrapper">
              <div className="phone-device">
                
                {/* Smartphone Status Bar */}
                <div className="phone-status-bar">
                  <span>9:41</span>
                  <div className="phone-dynamic-island">
                    <div className="phone-island-camera" />
                    <div className="phone-island-indicator" />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Wifi style={{ width: '13px', height: '13px' }} />
                    <BatteryCharging style={{ width: '15px', height: '15px', color: '#10b981' }} />
                  </div>
                </div>

                {/* Mobile Navigation Header & Bottom Nav */}
                <Navbar />
                
                {/* Main Scrollable Content */}
                <main style={{ flex: 1, paddingBottom: '96px', position: 'relative', zIndex: 1 }}>
                  {children}
                </main>

                {/* Mobile Compact Footer */}
                <footer style={{
                  borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                  background: 'rgba(7, 9, 14, 0.95)',
                  padding: '24px 16px 16px 16px',
                  marginTop: 'auto',
                  fontSize: '0.78rem',
                  color: '#94a3b8'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                    <div style={{
                      width: '30px',
                      height: '30px',
                      borderRadius: '8px',
                      background: 'rgba(255, 92, 53, 0.15)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '1px solid rgba(255, 92, 53, 0.35)',
                      flexShrink: 0
                    }}>
                      <School style={{ color: '#ff5c35', width: '16px', height: '16px' }} />
                    </div>
                    <div>
                      <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#f8fafc' }}>
                        KHOJ Campus MVP
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                        Zero-friction mobile recovery network
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 12px', fontSize: '0.72rem', color: '#94a3b8', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Lock style={{ width: '12px', height: '12px', color: '#10b981' }} />
                      <span>Blind Verification</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <ShieldCheck style={{ width: '12px', height: '12px', color: '#06b6d4' }} />
                      <span>Zero Finder Login</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Heart style={{ width: '12px', height: '12px', color: '#ff5c35' }} />
                      <span>Optional ₹20 Reward</span>
                    </div>
                  </div>

                  {/* Home indicator bar at bottom of phone */}
                  <div className="phone-home-indicator-bar" />
                </footer>

              </div>
            </div>
          </ToastProvider>
        </KhojProvider>
      </body>
    </html>
  );
}
