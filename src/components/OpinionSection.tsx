'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { Shield, MessageSquare, Send, Clock, User, AlertCircle, Sparkles } from 'lucide-react';

interface OpinionView {
  id: string;
  institution_id: string;
  author_username: string;
  content: string;
  created_at: string;
  is_current_user?: boolean;
}

interface OpinionSectionProps {
  institutionId: string;
  institutionName: string;
  initialOpinions: OpinionView[];
}

export default function OpinionSection({
  institutionId,
  institutionName,
  initialOpinions,
}: OpinionSectionProps) {
  const { user } = useAuth();
  const [opinions, setOpinions] = useState<OpinionView[]>(initialOpinions);
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (content.trim().length < 10) {
      setError('Your opinion must be at least 10 characters long.');
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccess(false);

    try {
      const res = await fetch('/api/opinions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ institution_id: institutionId, content: content.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to submit opinion.');
      } else {
        setOpinions([data.opinion, ...opinions]);
        setContent('');
        setSuccess(true);
      }
    } catch (e: any) {
      setError(e.message || 'Error communicating with server.');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return 'Recently';
    }
  };

  return (
    <div className="space-y-8">
      {/* Write Opinion Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-4 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center space-x-2">
              <MessageSquare className="w-5 h-5 text-emerald-400" />
              <span>Share Your Honest Experience</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Your feedback is published anonymously under your pseudonym{' '}
              {user ? (
                <strong className="text-emerald-400 font-mono">@{user.username}</strong>
              ) : (
                'username'
              )}
              . No emails, phone numbers, or real identities are ever exposed.
            </p>
          </div>
        </div>

        {user ? (
          <form onSubmit={handleSubmit} className="space-y-3">
            {error && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center space-x-2 animate-fadeIn">
                <Sparkles className="w-4 h-4 shrink-0" />
                <span>Your anonymous opinion has been posted!</span>
              </div>
            )}

            <div className="relative">
              <textarea
                value={content}
                onChange={e => setContent(e.target.value)}
                rows={4}
                maxLength={3000}
                placeholder={`What was your real experience at ${institutionName}? Discuss faculty dedication, campus life, research facilities, grading fairness, or curriculum quality...`}
                className="w-full bg-slate-800/90 border border-slate-700 rounded-xl p-4 text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y min-h-[120px]"
              />
              <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1 px-1">
                <span>Published permanently under @{user.username} (no delete allowed)</span>
                <span>{content.length} / 3000</span>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={submitting || content.trim().length < 10}
                className="inline-flex items-center space-x-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-bold px-5 py-2.5 rounded-xl shadow-md shadow-emerald-500/20 disabled:opacity-40 disabled:cursor-not-allowed transition text-sm"
              >
                {submitting ? (
                  <span>Publishing...</span>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Post Anonymous Opinion</span>
                  </>
                )}
              </button>
            </div>
          </form>
        ) : (
          <div className="p-6 rounded-xl bg-slate-800/40 border border-slate-700/60 text-center space-y-3">
            <p className="text-sm text-slate-300">
              Sign in with your anonymous credentials to submit an honest opinion.
            </p>
            <div className="flex items-center justify-center space-x-3">
              <Link
                href="/signin"
                className="text-xs bg-slate-700 hover:bg-slate-600 text-white font-semibold px-4 py-2 rounded-xl transition"
              >
                Sign In
              </Link>
              <Link
                href="/signup"
                className="text-xs bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-4 py-2 rounded-xl transition"
              >
                Create Anonymous Account
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Opinions Feed */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-base font-bold text-white">
            Student Opinions & Experiences ({opinions.length})
          </h4>
          <span className="text-xs text-slate-400">Chronological feed</span>
        </div>

        {opinions.length === 0 ? (
          <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800 text-center text-slate-400 space-y-2">
            <MessageSquare className="w-8 h-8 text-slate-600 mx-auto" />
            <p className="text-sm font-medium">No student opinions shared yet for this institution.</p>
            <p className="text-xs text-slate-500">Be the first student to share your honest perspective!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {opinions.map(op => (
              <div
                key={op.id}
                className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-xs font-bold border border-indigo-500/30">
                      <User className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-bold text-slate-200 font-mono">
                          @{op.author_username}
                        </span>
                        {op.is_current_user && (
                          <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                            Your Opinion
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-1 text-xs text-slate-400">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    <span>{formatDate(op.created_at)}</span>
                  </div>
                </div>

                <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap pl-10">
                  {op.content}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
