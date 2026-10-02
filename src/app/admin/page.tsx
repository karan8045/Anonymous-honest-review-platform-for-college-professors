'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Database,
  Users,
  Building2,
  Star,
  MessageSquare,
  FileCode,
  Download,
  RefreshCw,
  Search,
  CheckCircle,
  ShieldAlert,
  GitMerge,
  ExternalLink,
  Shield
} from 'lucide-react';

export default function AdminDatabasePage() {
  const [activeTab, setActiveTab] = useState<'profiles' | 'institutions' | 'ratings' | 'opinions' | 'raw'>('profiles');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchDatabase = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/database');
      const json = await res.json();
      setData(json);
    } catch (e) {
      console.error('Error fetching admin database:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDatabase();
  }, []);

  const downloadJSON = () => {
    if (!data) return;
    const blob = new Blob([JSON.stringify(data.data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `campusanon-db-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading && !data) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-slate-400">Loading database tables...</p>
        </div>
      </div>
    );
  }

  const stats = data?.stats || {};
  const dbData = data?.data || {};

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8 animate-fadeIn">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold mb-2">
            <Database className="w-3.5 h-3.5" />
            <span>Admin Data Management</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Database Inspector & Explorer
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm mt-1">
            Real-time inspection of database tables, pseudonymous profiles, ratings, and raw storage.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={fetchDatabase}
            className="inline-flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 px-3.5 py-2 rounded-xl text-xs font-semibold border border-slate-700 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={downloadJSON}
            className="inline-flex items-center space-x-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-3.5 py-2 rounded-xl text-xs font-bold transition shadow-md shadow-emerald-500/20"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export JSON Backup</span>
          </button>
        </div>
      </div>

      {/* Metrics Overview Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs uppercase font-semibold">Registered Users</span>
            <Users className="w-4 h-4 text-indigo-400" />
          </div>
          <span className="text-3xl font-black text-white">{stats.totalUsers || 0}</span>
          <p className="text-[11px] text-slate-500 mt-1">Pseudonymous accounts</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs uppercase font-semibold">Institutions</span>
            <Building2 className="w-4 h-4 text-emerald-400" />
          </div>
          <span className="text-3xl font-black text-white">{stats.totalInstitutions || 0}</span>
          <p className="text-[11px] text-slate-500 mt-1">
            {stats.officialInstitutions} official • {stats.userSubmittedInstitutions} user-added
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs uppercase font-semibold">Ratings</span>
            <Star className="w-4 h-4 text-amber-400" />
          </div>
          <span className="text-3xl font-black text-white">{stats.totalRatings || 0}</span>
          <p className="text-[11px] text-slate-500 mt-1">1-rating-per-user constraint</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs uppercase font-semibold">Opinions</span>
            <MessageSquare className="w-4 h-4 text-teal-400" />
          </div>
          <span className="text-3xl font-black text-white">{stats.totalOpinions || 0}</span>
          <p className="text-[11px] text-slate-500 mt-1">Permanent student reviews</p>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-3">
        <div className="flex items-center space-x-1 sm:space-x-2 overflow-x-auto">
          {[
            { id: 'profiles', label: `Profiles (${dbData.profiles?.length || 0})`, icon: Users },
            { id: 'institutions', label: `Institutions (${dbData.institutions?.length || 0})`, icon: Building2 },
            { id: 'ratings', label: `Ratings (${dbData.ratings?.length || 0})`, icon: Star },
            { id: 'opinions', label: `Opinions (${dbData.opinions?.length || 0})`, icon: MessageSquare },
            { id: 'raw', label: 'Raw JSON', icon: FileCode },
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as any);
                  setSearchQuery('');
                }}
                className={`px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 shrink-0 ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {activeTab !== 'raw' && (
          <div className="relative min-w-[200px]">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search table rows..."
              className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        )}
      </div>

      {/* TAB CONTENT: PROFILES */}
      {activeTab === 'profiles' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/70 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
                <tr>
                  <th className="px-5 py-3.5">Internal User ID</th>
                  <th className="px-5 py-3.5">Public Username</th>
                  <th className="px-5 py-3.5">Country</th>
                  <th className="px-5 py-3.5">College / University</th>
                  <th className="px-5 py-3.5">Created Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {(dbData.profiles || [])
                  .filter((p: any) =>
                    !searchQuery ||
                    p.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    p.country.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    (p.institution_name && p.institution_name.toLowerCase().includes(searchQuery.toLowerCase()))
                  )
                  .map((p: any) => (
                    <tr key={p.id} className="hover:bg-slate-800/40 transition">
                      <td className="px-5 py-3.5 font-mono text-[11px] text-slate-500">{p.id}</td>
                      <td className="px-5 py-3.5 font-bold text-emerald-400 font-mono">@{p.username}</td>
                      <td className="px-5 py-3.5 text-slate-300">{p.country}</td>
                      <td className="px-5 py-3.5 text-slate-200 font-medium">{p.institution_name}</td>
                      <td className="px-5 py-3.5 text-slate-500 text-[11px]">
                        {new Date(p.created_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB CONTENT: INSTITUTIONS */}
      {activeTab === 'institutions' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Link
              href="/admin/institutions"
              className="inline-flex items-center space-x-1.5 text-xs font-semibold text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 px-3.5 py-2 rounded-xl transition"
            >
              <GitMerge className="w-3.5 h-3.5" />
              <span>Go to Duplicate Merge Tool</span>
              <ExternalLink className="w-3 h-3 ml-1" />
            </Link>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/70 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
                  <tr>
                    <th className="px-5 py-3.5">Institution Name</th>
                    <th className="px-5 py-3.5">Location</th>
                    <th className="px-5 py-3.5">Source & Verification</th>
                    <th className="px-5 py-3.5">ID</th>
                    <th className="px-5 py-3.5 text-right">View</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {(dbData.institutions || [])
                    .filter((i: any) =>
                      !searchQuery ||
                      i.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      i.country.toLowerCase().includes(searchQuery.toLowerCase())
                    )
                    .map((i: any) => (
                      <tr key={i.id} className="hover:bg-slate-800/40 transition">
                        <td className="px-5 py-3.5 font-bold text-white text-sm">{i.name}</td>
                        <td className="px-5 py-3.5 text-slate-300">
                          {i.city ? `${i.city}, ` : ''}{i.country}
                        </td>
                        <td className="px-5 py-3.5">
                          {i.source === 'official_database' ? (
                            <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              <CheckCircle className="w-3 h-3" />
                              <span>Official Database</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/20">
                              <ShieldAlert className="w-3 h-3" />
                              <span>User Submitted (Unverified)</span>
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 font-mono text-[11px] text-slate-500">{i.id}</td>
                        <td className="px-5 py-3.5 text-right">
                          <Link
                            href={`/institution/${i.id}`}
                            className="text-emerald-400 hover:text-emerald-300 font-semibold"
                          >
                            Open →
                          </Link>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: RATINGS */}
      {activeTab === 'ratings' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/70 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
                <tr>
                  <th className="px-5 py-3.5">Institution</th>
                  <th className="px-5 py-3.5">Internal User ID</th>
                  <th className="px-5 py-3.5">Score</th>
                  <th className="px-5 py-3.5">Created At</th>
                  <th className="px-5 py-3.5">Constraint Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {(dbData.ratings || [])
                  .filter((r: any) =>
                    !searchQuery ||
                    r.institution_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    r.user_id.toLowerCase().includes(searchQuery.toLowerCase())
                  )
                  .map((r: any) => (
                    <tr key={r.id} className="hover:bg-slate-800/40 transition">
                      <td className="px-5 py-3.5 font-bold text-white">{r.institution_name}</td>
                      <td className="px-5 py-3.5 font-mono text-[11px] text-slate-500">{r.user_id}</td>
                      <td className="px-5 py-3.5">
                        <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-300 font-bold border border-amber-500/20">
                          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                          <span>{r.score} / 5</span>
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-slate-500 text-[11px]">
                        {new Date(r.created_at).toLocaleString()}
                      </td>
                      <td className="px-5 py-3.5 text-emerald-400 font-semibold text-[11px]">
                        ✓ UNIQUE(user_id, institution_id) enforced
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB CONTENT: OPINIONS */}
      {activeTab === 'opinions' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/70 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
                <tr>
                  <th className="px-5 py-3.5">Author (Pseudonym)</th>
                  <th className="px-5 py-3.5">Institution</th>
                  <th className="px-5 py-3.5">Opinion Content</th>
                  <th className="px-5 py-3.5">Published Date</th>
                  <th className="px-5 py-3.5">Policy</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {(dbData.opinions || [])
                  .filter((o: any) =>
                    !searchQuery ||
                    o.author_username.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    o.institution_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    o.content.toLowerCase().includes(searchQuery.toLowerCase())
                  )
                  .map((o: any) => (
                    <tr key={o.id} className="hover:bg-slate-800/40 transition">
                      <td className="px-5 py-3.5 font-bold text-emerald-400 font-mono">
                        @{o.author_username}
                      </td>
                      <td className="px-5 py-3.5 font-semibold text-slate-200">{o.institution_name}</td>
                      <td className="px-5 py-3.5 text-slate-300 max-w-md line-clamp-3">
                        {o.content}
                      </td>
                      <td className="px-5 py-3.5 text-slate-500 text-[11px] whitespace-nowrap">
                        {new Date(o.created_at).toLocaleString()}
                      </td>
                      <td className="px-5 py-3.5 text-indigo-400 font-semibold text-[10px]">
                        Permanent (No delete)
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB CONTENT: RAW JSON */}
      {activeTab === 'raw' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Storage Path: <strong className="font-mono text-slate-200">.data/db.json</strong></span>
            <span>Total Size: ~{(JSON.stringify(dbData).length / 1024).toFixed(1)} KB</span>
          </div>

          <pre className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-[11px] font-mono text-emerald-400 max-h-[600px] overflow-y-auto overflow-x-auto custom-scrollbar">
            {JSON.stringify(dbData, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
