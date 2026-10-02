'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
  Shield,
  Star,
  MessageSquare,
  Globe,
  GraduationCap,
  AlertTriangle,
  Clock,
  ArrowRight,
  LogOut,
  Building2
} from 'lucide-react';

export default function ProfilePage() {
  const router = useRouter();
  const { user, loading: authLoading, signOut } = useAuth();

  const [ratings, setRatings] = useState<any[]>([]);
  const [opinions, setOpinions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/signin');
      return;
    }

    if (user) {
      const fetchActivity = async () => {
        try {
          const res = await fetch('/api/user/activity');
          if (res.ok) {
            const data = await res.json();
            setRatings(data.ratings || []);
            setOpinions(data.opinions || []);
          }
        } catch (e) {
          console.error(e);
        } finally {
          setLoading(false);
        }
      };
      fetchActivity();
    }
  }, [user, authLoading, router]);

  if (authLoading || loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 space-y-8 animate-fadeIn">
      {/* Profile Header Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-500 to-indigo-600 p-0.5 shadow-lg shadow-emerald-500/10">
              <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center text-3xl">
                <span>{user.avatar === 'female' ? '👩‍🎓' : '👨‍🎓'}</span>
              </div>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-2xl font-extrabold text-white font-mono">
                  @{user.username}
                </h1>
                <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Active Pseudonym
                </span>
                <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 capitalize">
                  {user.avatar} Student
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1 flex items-center space-x-3">
                <span className="flex items-center space-x-1">
                  <Globe className="w-3.5 h-3.5 text-slate-500" />
                  <span>{user.country}</span>
                </span>
                <span>•</span>
                <span className="flex items-center space-x-1">
                  <GraduationCap className="w-3.5 h-3.5 text-slate-500" />
                  <span>{user.institution_name}</span>
                </span>
              </p>
            </div>
          </div>

          <button
            onClick={() => signOut()}
            className="self-start sm:self-auto inline-flex items-center space-x-1.5 text-xs text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 px-3.5 py-2 rounded-xl transition border border-red-500/20"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>

        {/* Security Warning Notice */}
        <div className="mt-6 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs sm:text-sm text-amber-200/90 space-y-1">
          <div className="flex items-center space-x-1.5 font-bold text-amber-300">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>Account Security Notice</span>
          </div>
          <p className="leading-relaxed">
            Your account is strictly anonymous. No email or phone is attached. If you ever forget your password,
            access to this account is lost permanently. Keep your password safely stored.
          </p>
        </div>
      </div>

      {/* Activity Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 text-center">
          <span className="text-3xl font-extrabold text-white block">{ratings.length}</span>
          <span className="text-xs text-slate-400 uppercase font-semibold mt-1 flex items-center justify-center space-x-1">
            <Star className="w-3.5 h-3.5 text-amber-400" />
            <span>Ratings Submitted</span>
          </span>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 text-center">
          <span className="text-3xl font-extrabold text-white block">{opinions.length}</span>
          <span className="text-xs text-slate-400 uppercase font-semibold mt-1 flex items-center justify-center space-x-1">
            <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
            <span>Opinions Published</span>
          </span>
        </div>
      </div>

      {/* Submitted Ratings List */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-white flex items-center space-x-2">
          <Star className="w-5 h-5 text-amber-400" />
          <span>My Institution Ratings</span>
        </h3>

        {ratings.length === 0 ? (
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 text-center text-slate-400 text-xs">
            You haven't rated any institutions yet.
          </div>
        ) : (
          <div className="space-y-3">
            {ratings.map(r => (
              <div
                key={r.id}
                className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center justify-between"
              >
                <div>
                  <h4 className="text-sm font-bold text-white">{r.institution_name}</h4>
                  <div className="flex items-center space-x-1 text-xs text-amber-400 mt-0.5">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-3.5 h-3.5 ${
                          i < r.score ? 'fill-amber-400 text-amber-400' : 'text-slate-600'
                        }`}
                      />
                    ))}
                    <span className="ml-1 text-slate-300 font-bold">{r.score} / 5</span>
                  </div>
                </div>

                <Link
                  href={`/institution/${r.institution_id}`}
                  className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold flex items-center space-x-1"
                >
                  <span>View</span>
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Submitted Opinions List */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-white flex items-center space-x-2">
          <MessageSquare className="w-5 h-5 text-emerald-400" />
          <span>My Anonymous Opinions</span>
        </h3>

        {opinions.length === 0 ? (
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 text-center text-slate-400 text-xs">
            You haven't submitted any opinions yet.
          </div>
        ) : (
          <div className="space-y-3">
            {opinions.map(o => (
              <div
                key={o.id}
                className="bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-5 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-indigo-400">
                    {o.institution_name}
                  </span>
                  <span className="text-[11px] text-slate-500">
                    {new Date(o.created_at).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
                  {o.content}
                </p>
                <div className="pt-2 flex justify-end">
                  <Link
                    href={`/institution/${o.institution_id}`}
                    className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold inline-flex items-center space-x-1"
                  >
                    <span>View College Page</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
