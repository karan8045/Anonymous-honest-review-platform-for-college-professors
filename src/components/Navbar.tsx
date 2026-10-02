'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { Shield, User as UserIcon, LogOut, BookOpen, Layers, Menu, X, Lock } from 'lucide-react';

export default function Navbar() {
  const { user, signOut } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Platform Name */}
          <Link href="/" className="flex items-center space-x-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-emerald-400 p-0.5 flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <Shield className="w-5 h-5 text-emerald-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
                  CampusAnon
                </span>
                <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Zero-PII
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                Anonymous & Honest College Reviews
              </p>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-6">
            <Link
              href="/"
              className="text-sm font-medium text-slate-300 hover:text-white transition-colors flex items-center space-x-1.5"
            >
              <BookOpen className="w-4 h-4 text-indigo-400" />
              <span>Browse Colleges</span>
            </Link>

            <Link
              href="/admin/institutions"
              className="text-sm font-medium text-slate-400 hover:text-slate-200 transition-colors flex items-center space-x-1.5"
            >
              <Layers className="w-4 h-4 text-amber-400" />
              <span>Directory Admin</span>
            </Link>

            {user ? (
              <div className="flex items-center space-x-4 pl-4 border-l border-slate-800">
                <Link
                  href="/profile"
                  className="flex items-center space-x-2 bg-slate-800 hover:bg-slate-750 px-3 py-1.5 rounded-full border border-slate-700 transition"
                  title="View your anonymous account activity"
                >
                  <div className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-xs font-bold">
                    <UserIcon className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-sm font-medium text-slate-200">
                    @{user.username}
                  </span>
                  <span className="text-xs bg-slate-700/70 text-slate-300 px-2 py-0.5 rounded-full truncate max-w-[120px]">
                    {user.country}
                  </span>
                </Link>

                <button
                  onClick={() => signOut()}
                  className="text-xs text-slate-400 hover:text-red-400 flex items-center space-x-1 px-2.5 py-1.5 rounded-lg hover:bg-red-500/10 transition"
                  title="Sign out from this session"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-3 pl-4 border-l border-slate-800">
                <Link
                  href="/signin"
                  className="text-sm font-medium text-slate-300 hover:text-white px-3 py-2 rounded-lg hover:bg-slate-800 transition"
                >
                  Sign In
                </Link>
                <Link
                  href="/signup"
                  className="text-sm font-medium bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-semibold px-4 py-2 rounded-lg shadow-sm shadow-emerald-500/20 transition-all hover:shadow-emerald-500/30"
                >
                  Create Anonymous Account
                </Link>
              </div>
            )}
          </nav>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center space-x-2">
            {user && (
              <Link
                href="/profile"
                className="text-xs bg-slate-800 text-slate-200 px-2.5 py-1 rounded-full border border-slate-700 flex items-center space-x-1"
              >
                <UserIcon className="w-3 h-3 text-emerald-400" />
                <span>@{user.username}</span>
              </Link>
            )}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-slate-400 hover:text-white focus:outline-none"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-slate-800 bg-slate-900 px-4 pt-3 pb-5 space-y-3">
          <Link
            href="/"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-sm font-medium text-slate-300 hover:text-white py-2"
          >
            Browse Colleges
          </Link>
          <Link
            href="/admin/institutions"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-sm font-medium text-slate-300 hover:text-white py-2"
          >
            Directory Admin
          </Link>

          {user ? (
            <div className="pt-3 border-t border-slate-800 space-y-2">
              <Link
                href="/profile"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center space-x-2 text-sm text-slate-200 py-1"
              >
                <UserIcon className="w-4 h-4 text-emerald-400" />
                <span>My Anonymous Account (@{user.username})</span>
              </Link>
              <button
                onClick={() => {
                  signOut();
                  setMobileMenuOpen(false);
                }}
                className="flex items-center space-x-2 text-sm text-red-400 py-1 w-full text-left"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </div>
          ) : (
            <div className="pt-3 border-t border-slate-800 space-y-2">
              <Link
                href="/signin"
                onClick={() => setMobileMenuOpen(false)}
                className="block w-full text-center text-sm font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 py-2.5 rounded-lg"
              >
                Sign In
              </Link>
              <Link
                href="/signup"
                onClick={() => setMobileMenuOpen(false)}
                className="block w-full text-center text-sm font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 py-2.5 rounded-lg"
              >
                Create Anonymous Account
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
