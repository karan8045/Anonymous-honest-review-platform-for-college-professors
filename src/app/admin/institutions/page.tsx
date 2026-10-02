'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Institution } from '@/lib/types';
import {
  Layers,
  CheckCircle,
  ShieldAlert,
  GitMerge,
  ArrowRight,
  AlertCircle,
  Search,
  Check,
  Building2,
  Trash2
} from 'lucide-react';

export default function AdminInstitutionsPage() {
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [filter, setFilter] = useState<'all' | 'user_submitted' | 'official'>('all');
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Merge modal state
  const [mergeSource, setMergeSource] = useState<Institution | null>(null);
  const [mergeTargetId, setMergeTargetId] = useState<string>('');
  const [merging, setMerging] = useState(false);
  const [mergeMessage, setMergeMessage] = useState<string | null>(null);
  const [mergeError, setMergeError] = useState<string | null>(null);

  const fetchInstitutions = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/institutions');
      const data = await res.json();
      setInstitutions(data.institutions || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInstitutions();
  }, []);

  const handleExecuteMerge = async () => {
    if (!mergeSource || !mergeTargetId) return;
    setMerging(true);
    setMergeError(null);
    setMergeMessage(null);

    try {
      const res = await fetch('/api/admin/merge-institutions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceId: mergeSource.id,
          targetId: mergeTargetId,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setMergeError(data.error || 'Failed to merge institutions.');
      } else {
        setMergeMessage(data.message);
        setMergeSource(null);
        setMergeTargetId('');
        fetchInstitutions();
      }
    } catch (e: any) {
      setMergeError(e.message || 'Error executing merge.');
    } finally {
      setMerging(false);
    }
  };

  const filtered = institutions.filter(inst => {
    if (filter === 'user_submitted' && inst.source !== 'user_submitted') return false;
    if (filter === 'official' && inst.source !== 'official_database') return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        inst.name.toLowerCase().includes(q) ||
        inst.country.toLowerCase().includes(q) ||
        (inst.city && inst.city.toLowerCase().includes(q))
      );
    }
    return true;
  });

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-semibold mb-2">
            <Layers className="w-3.5 h-3.5" />
            <span>Platform Directory Administration</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Manage & Merge Institutions
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm mt-1">
            Review user-submitted institutions and merge duplicates into verified canonical institutions.
          </p>
        </div>
      </div>

      {/* Merge Success Alert */}
      {mergeMessage && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm flex items-center space-x-2 animate-fadeIn">
          <Check className="w-5 h-5 shrink-0" />
          <span>{mergeMessage}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-4 rounded-2xl">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setFilter('all')}
            className={`text-xs px-3.5 py-1.5 rounded-xl font-semibold transition ${
              filter === 'all'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            All ({institutions.length})
          </button>
          <button
            onClick={() => setFilter('user_submitted')}
            className={`text-xs px-3.5 py-1.5 rounded-xl font-semibold transition flex items-center space-x-1.5 ${
              filter === 'user_submitted'
                ? 'bg-amber-600 text-white shadow-md'
                : 'bg-slate-800 text-amber-400/80 hover:text-amber-300'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>User Submitted ({institutions.filter(i => i.source === 'user_submitted').length})</span>
          </button>
          <button
            onClick={() => setFilter('official')}
            className={`text-xs px-3.5 py-1.5 rounded-xl font-semibold transition flex items-center space-x-1.5 ${
              filter === 'official'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <CheckCircle className="w-3.5 h-3.5" />
            <span>Official ({institutions.filter(i => i.source === 'official_database').length})</span>
          </button>
        </div>

        <div className="relative min-w-[240px]">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search institutions..."
            className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Institutions Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/60 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
              <tr>
                <th className="px-5 py-3.5">Institution</th>
                <th className="px-5 py-3.5">Country & Location</th>
                <th className="px-5 py-3.5">Source Status</th>
                <th className="px-5 py-3.5">Activity</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {filtered.map(inst => (
                <tr key={inst.id} className="hover:bg-slate-800/40 transition">
                  <td className="px-5 py-4">
                    <div className="font-bold text-white text-sm">{inst.name}</div>
                    <div className="text-[11px] text-slate-500 font-mono mt-0.5">ID: {inst.id}</div>
                  </td>
                  <td className="px-5 py-4 text-slate-300">
                    <div>{inst.country}</div>
                    <div className="text-[11px] text-slate-500">{inst.city || '—'}</div>
                  </td>
                  <td className="px-5 py-4">
                    {inst.source === 'official_database' ? (
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
                  <td className="px-5 py-4 text-slate-400">
                    <div>★ {inst.average_rating ? inst.average_rating.toFixed(1) : '—'} ({inst.rating_count || 0} ratings)</div>
                    <div>{inst.opinion_count || 0} opinions</div>
                  </td>
                  <td className="px-5 py-4 text-right space-x-2">
                    <Link
                      href={`/institution/${inst.id}`}
                      className="text-xs text-slate-400 hover:text-white px-2.5 py-1 rounded bg-slate-800 transition"
                    >
                      View
                    </Link>

                    {/* Merge button */}
                    <button
                      type="button"
                      onClick={() => {
                        setMergeSource(inst);
                        setMergeError(null);
                        setMergeMessage(null);
                      }}
                      className="text-xs text-amber-400 hover:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 px-2.5 py-1 rounded transition inline-flex items-center space-x-1"
                    >
                      <GitMerge className="w-3 h-3" />
                      <span>Merge Into...</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MERGE MODAL */}
      {mergeSource && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center space-x-2 text-amber-400 font-bold text-base">
              <GitMerge className="w-5 h-5" />
              <span>Merge Duplicate Institution</span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              You are about to merge <strong className="text-white font-semibold">"{mergeSource.name}"</strong> into another canonical institution. All ratings and opinions will be safely reassigned, and this duplicate entry will be deleted.
            </p>

            {mergeError && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{mergeError}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Select Canonical Target Institution
              </label>
              <select
                value={mergeTargetId}
                onChange={e => setMergeTargetId(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">-- Choose canonical institution --</option>
                {institutions
                  .filter(i => i.id !== mergeSource.id)
                  .map(target => (
                    <option key={target.id} value={target.id}>
                      {target.name} ({target.country} - {target.source})
                    </option>
                  ))}
              </select>
            </div>

            <div className="pt-3 border-t border-slate-800 flex items-center justify-end space-x-3">
              <button
                type="button"
                onClick={() => setMergeSource(null)}
                className="text-xs text-slate-400 hover:text-white px-4 py-2 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!mergeTargetId || merging}
                onClick={handleExecuteMerge}
                className="text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 px-5 py-2.5 rounded-xl transition disabled:opacity-50"
              >
                {merging ? 'Merging...' : 'Confirm & Merge'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
