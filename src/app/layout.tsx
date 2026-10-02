import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import Navbar from '@/components/Navbar';
import { Shield } from 'lucide-react';

export const metadata: Metadata = {
  title: 'CampusAnon | Anonymous Honest Review Platform for Colleges & Universities',
  description:
    'A persistent anonymous platform for honest college reviews. Zero email, zero phone numbers, total pseudonymity.',
  icons: {
    icon: '/favicon.png',
    shortcut: '/favicon.png',
    apple: '/logo-icon.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="bg-slate-950 text-slate-100 min-h-screen flex flex-col font-sans antialiased selection:bg-emerald-500 selection:text-slate-950">
        <AuthProvider>
          <Navbar />
          <main className="flex-1">{children}</main>
          <footer className="border-t border-slate-900 bg-slate-950 py-10 px-4 sm:px-6 lg:px-8 text-center text-xs text-slate-500 space-y-3">
            <div className="flex items-center justify-center space-x-2 text-slate-400 font-semibold">
              <img
                src="/logo-icon.png"
                alt="CampusAnon"
                className="w-5 h-5 rounded-full object-cover border border-slate-700/60"
              />
              <span>CampusAnon Zero-PII Anonymous Platform</span>
            </div>
            <p className="max-w-xl mx-auto text-slate-400 leading-relaxed text-[11px]">
              No email addresses, phone numbers, or real identities are collected or stored. All accounts are persistent and pseudonymous. Forgotten passwords cannot be recovered.
            </p>
            <p className="text-[10px] text-slate-500">
              © {new Date().getFullYear()} CampusAnon. Strictly non-custodial anonymous student feedback system.
            </p>
          </footer>
        </AuthProvider>
      </body>
    </html>
  );
}
