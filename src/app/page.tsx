'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { COUNTRIES } from '@/lib/countries';
import { Institution } from '@/lib/types';
import InstitutionCard from '@/components/InstitutionCard';
import {
  Shield,
  Search,
  Globe,
  Sparkles,
  Lock,
  ArrowRight,
  Award,
  Users,
  MessageSquare,
  Building2
} from 'lucide-react';

export default function HomePage() {
  const { user } = useAuth();
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [selectedCountry, setSelectedCountry] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInstitutions = async () => {
      try {
        setLoading(true);
        const countryParam = selectedCountry !== 'All' ? `country=${encodeURIComponent(selectedCountry)}` : '';
        const qParam = searchQuery.trim() ? `q=${encodeURIComponent(searchQuery.trim())}` : '';
        const params = [countryParam, qParam].filter(Boolean).join('&');
        const url = `/api/institutions${params ? `?${params}` : ''}`;
        
        const res = await fetch(url);
        const data = await res.json();
        setInstitutions(data.institutions || []);
      } catch (e) {
        console.error('Failed to load institutions:', e);
      } finally {
        setLoading(false);
      }
    };

    const timer = setTimeout(fetchInstitutions, 200);
    return () => clearTimeout(timer);
  }, [selectedCountry, searchQuery]);

  return (
    <div className="space-y-12 sm:space-y-16 pb-20">
      {/* Hero Section */}
      <section className="relative pt-12 sm:pt-20 pb-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center">
        {/* Ambient Glows */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/3 left-1/4 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl mx-auto space-y-6">
          <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs sm:text-sm font-semibold shadow-inner">
            <Shield className="w-4 h-4" />
            <span>100% Pseudonymous Student Review Platform</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tight leading-tight sm:leading-none">
            Honest College Reviews,{' '}
            <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-indigo-400 bg-clip-text text-transparent">
              Completely Anonymous
            </span>
          </h1>

          <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Share unvarnished feedback on universities and professors. No real names, emails, or phone numbers required. Your username is your only public identity.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            {user ? (
              <Link
                href="/profile"
                className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-bold px-6 py-3.5 rounded-xl shadow-lg shadow-emerald-500/20 transition text-sm"
              >
                <span>My Anonymous Account (@{user.username})</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <>
                <Link
                  href="/signup"
                  className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-bold px-7 py-3.5 rounded-xl shadow-lg shadow-emerald-500/20 transition text-sm"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Create Anonymous Account</span>
                </Link>
                <Link
                  href="/signin"
                  className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 bg-slate-800 hover:bg-slate-750 text-white font-semibold px-6 py-3.5 rounded-xl border border-slate-700 transition text-sm"
                >
                  <span>Sign In</span>
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Feature Pillars */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold">
              <Shield className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">Zero Personal Data</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              We never collect your email address, phone number, or student ID. Only your chosen pseudonym is ever visible.
            </p>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-2.5">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-bold">
              <Lock className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">Strict Rating Fairness</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Database-enforced integrity prevents vote manipulation: exactly one numeric rating per student per institution.
            </p>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-2.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold">
              <Award className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">Permanent Ownership</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Log back in anytime with your username and password. For security, forgotten passwords cannot be recovered via email.
            </p>
          </div>
        </div>
      </section>

      {/* Search & Institutions Directory */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black text-white tracking-tight">
              Explore Colleges & Universities
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Browse reviews, see ratings, or search by name, abbreviation, or city.
            </p>
          </div>

          {/* Search Controls */}
          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            {/* Country Selector */}
            <div className="relative min-w-[160px]">
              <select
                value={selectedCountry}
                onChange={e => setSelectedCountry(e.target.value)}
                className="w-full appearance-none bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="All">🌍 All Countries</option>
                {COUNTRIES.map(c => (
                  <option key={c.code} value={c.name}>
                    {c.flag} {c.name}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 text-xs">
                ▼
              </div>
            </div>

            {/* Keyword Search */}
            <div className="relative min-w-[260px] sm:min-w-[300px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search college, CUSB, IIT, city..."
                className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Institutions Grid */}
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center space-y-3">
            <div className="w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-slate-400">Loading colleges...</p>
          </div>
        ) : institutions.length === 0 ? (
          <div className="p-12 rounded-3xl bg-slate-900/60 border border-slate-800 text-center space-y-3">
            <Building2 className="w-12 h-12 text-slate-600 mx-auto" />
            <h3 className="text-base font-bold text-white">No Institutions Found</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              No matching colleges found. When you sign up, you can add your university manually if it isn't listed yet!
            </p>
            <div className="pt-2">
              <Link
                href="/signup"
                className="text-xs bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-4 py-2 rounded-xl transition inline-block"
              >
                + Add via Registration
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {institutions.map(inst => (
              <InstitutionCard key={inst.id} institution={inst} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
