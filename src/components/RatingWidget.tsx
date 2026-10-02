'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { Star, Shield, Check, AlertCircle } from 'lucide-react';

interface RatingWidgetProps {
  institutionId: string;
  initialUserRating: number | null;
  onRatingUpdated: (newScore: number) => void;
}

export default function RatingWidget({
  institutionId,
  initialUserRating,
  onRatingUpdated,
}: RatingWidgetProps) {
  const { user } = useAuth();
  const [currentRating, setCurrentRating] = useState<number | null>(initialUserRating);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleRate = async (score: number) => {
    if (!user) return;
    setLoading(true);
    setStatusMessage(null);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/ratings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ institution_id: institutionId, score }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || 'Failed to submit rating.');
      } else {
        setCurrentRating(score);
        setStatusMessage(
          currentRating
            ? `Your rating has been updated to ${score} stars!`
            : `Thank you! You rated this institution ${score} stars.`
        );
        onRatingUpdated(score);
      }
    } catch (e: any) {
      setErrorMessage(e.message || 'Error communicating with server.');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="p-4 sm:p-5 rounded-2xl bg-slate-800/40 border border-slate-700/60 text-center space-y-3">
        <p className="text-sm text-slate-300 font-medium">
          Have you studied or worked here? Leave your anonymous rating.
        </p>
        <div className="flex items-center justify-center space-x-3">
          <Link
            href="/signin"
            className="text-xs bg-slate-700 hover:bg-slate-600 text-white font-semibold px-4 py-2 rounded-xl transition"
          >
            Sign In to Rate
          </Link>
          <Link
            href="/signup"
            className="text-xs bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-4 py-2 rounded-xl transition"
          >
            Create Anonymous Account
          </Link>
        </div>
      </div>
    );
  }

  const activeScore = hoverRating || currentRating || 0;

  return (
    <div className="p-5 sm:p-6 rounded-2xl bg-slate-850 border border-slate-700/80 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h4 className="text-sm font-bold text-white flex items-center space-x-2">
            <Shield className="w-4 h-4 text-emerald-400" />
            <span>Submit Your Anonymous Rating</span>
          </h4>
          <p className="text-xs text-slate-400 mt-0.5">
            Strict policy: Exactly one rating per user. Your username remains pseudonymous.
          </p>
        </div>

        {currentRating && (
          <span className="text-xs bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-3 py-1 rounded-full font-semibold self-start sm:self-auto">
            Your Rating: {currentRating} / 5 ★
          </span>
        )}
      </div>

      {/* Star Picker */}
      <div className="flex items-center space-x-2">
        {[1, 2, 3, 4, 5].map(star => {
          const filled = star <= activeScore;
          return (
            <button
              key={star}
              type="button"
              disabled={loading}
              onMouseEnter={() => setHoverRating(star)}
              onMouseLeave={() => setHoverRating(null)}
              onClick={() => handleRate(star)}
              className="p-1 focus:outline-none transition-transform hover:scale-110 disabled:opacity-50"
              title={`Rate ${star} star${star > 1 ? 's' : ''}`}
            >
              <Star
                className={`w-7 h-7 sm:w-8 sm:h-8 transition-colors ${
                  filled
                    ? 'fill-amber-400 text-amber-400 drop-shadow-md'
                    : 'text-slate-600 hover:text-slate-400'
                }`}
              />
            </button>
          );
        })}
        <span className="text-xs text-slate-400 ml-2 font-medium">
          {hoverRating ? `${hoverRating} Stars` : currentRating ? 'Click to change' : 'Select 1–5 stars'}
        </span>
      </div>

      {statusMessage && (
        <p className="text-xs text-emerald-400 flex items-center space-x-1.5 font-medium animate-fadeIn">
          <Check className="w-3.5 h-3.5" />
          <span>{statusMessage}</span>
        </p>
      )}

      {errorMessage && (
        <p className="text-xs text-red-400 flex items-center space-x-1.5 font-medium animate-fadeIn">
          <AlertCircle className="w-3.5 h-3.5" />
          <span>{errorMessage}</span>
        </p>
      )}
    </div>
  );
}
