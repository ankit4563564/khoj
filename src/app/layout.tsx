import type { Metadata } from 'next';
import '@/styles/globals.css';
import { KhojProvider } from '@/lib/store';
import { ToastProvider } from '@/components/Toast';
import Navbar from '@/components/Navbar';
import Link from 'next/link';
import { ShieldCheck, Heart, Lock, School } from 'lucide-react';

export const metadata: Metadata = {
  title: 'KHOJ — Minimal Campus MVP V1.5',
  description: 'Helping students find the owner of lost items using a photo, AI matching, and simple ownership verification.',
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

            <div style={{ position: 'relative', zIndex: 1, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
              <Navbar />
              
              <main style={{ flex: 1, paddingBottom: '60px' }}>
                {children}
              </main>

              {/* Footer */}
              <footer style={{
                borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                background: 'rgba(7, 9, 14, 0.95)',
                padding: '36px 0',
                marginTop: 'auto'
              }}>
                <div className="container" style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '10px',
                      background: 'rgba(255, 92, 53, 0.15)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '1px solid rgba(255, 92, 53, 0.35)'
                    }}>
                      <School style={{ color: '#ff5c35', width: '20px', height: '20px' }} />
                    </div>
                    <div>
                      <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#f8fafc' }}>
                        KHOJ Campus MVP V1.5
                      </div>
                      <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                        Private digital identity for physical belongings. Non-invasive, zero-friction & crafted.
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '24px', fontSize: '0.82rem', color: '#94a3b8' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Lock style={{ width: '14px', height: '14px', color: '#10b981' }} />
                      <span>Blind Verification Protected</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <ShieldCheck style={{ width: '14px', height: '14px', color: '#06b6d4' }} />
                      <span>Zero Finder Signup</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Heart style={{ width: '14px', height: '14px', color: '#ff5c35' }} />
                      <span>Optional ₹20 Post-Recovery Reward</span>
                    </div>
                  </div>
                </div>
              </footer>
            </div>
          </ToastProvider>
        </KhojProvider>
      </body>
    </html>
  );
}
