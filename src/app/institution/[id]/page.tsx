'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Institution } from '@/lib/types';
import RatingWidget from '@/components/RatingWidget';
import OpinionSection from '@/components/OpinionSection';
import {
  Building2,
  MapPin,
  Star,
  CheckCircle,
  ShieldAlert,
  ArrowLeft,
  Users,
  MessageSquare,
  Shield
} from 'lucide-react';

export default function InstitutionPage() {
  const params = useParams();
  const id = params?.id as string;

  const [institution, setInstitution] = useState<Institution | null>(null);
  const [userRating, setUserRating] = useState<number | null>(null);
  const [opinions, setOpinions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDetails = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/institutions/${id}`);
      if (!res.ok) {
        throw new Error('College/University not found.');
      }
      const data = await res.json();
      setInstitution(data.institution);
      setUserRating(data.userRating);
      setOpinions(data.opinions);
    } catch (e: any) {
      setError(e.message || 'Failed to load institution details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchDetails();
    }
  }, [id]);

  const handleRatingUpdated = (newScore: number) => {
    setUserRating(newScore);
    fetchDetails();
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-slate-400">Loading institution details...</p>
        </div>
      </div>
    );
  }

  if (error || !institution) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center space-y-4">
        <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800 text-slate-300">
          <Building2 className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h2 className="text-xl font-bold text-white">Institution Not Found</h2>
          <p className="text-sm text-slate-400 mt-1">{error || 'The requested college could not be found.'}</p>
          <div className="mt-6">
            <Link
              href="/"
              className="inline-flex items-center space-x-2 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-xl transition"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Directory</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const isVerified = institution.verified || institution.source === 'official_database';

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8 animate-fadeIn">
      {/* Top back navigation */}
      <div>
        <Link
          href="/"
          className="inline-flex items-center space-x-1.5 text-xs text-slate-400 hover:text-white transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to All Institutions</span>
        </Link>
      </div>

      {/* Hero Header Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              {isVerified ? (
                <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>Verified Official Institution</span>
                </span>
              ) : (
                <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/20">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>Community User-Submitted</span>
                </span>
              )}

              <span className="text-xs bg-slate-800 text-slate-300 px-3 py-1 rounded-full border border-slate-700">
                {institution.country}
              </span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
              {institution.name}
            </h1>

            <p className="text-sm text-slate-400 flex items-center space-x-1.5">
              <MapPin className="w-4 h-4 text-slate-500 shrink-0" />
              <span>
                {institution.city ? `${institution.city}, ` : ''}
                {institution.state ? `${institution.state}, ` : ''}
                {institution.country}
              </span>
            </p>

            {institution.abbreviations && institution.abbreviations.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {institution.abbreviations.map(ab => (
                  <span
                    key={ab}
                    className="text-xs font-mono font-medium px-2.5 py-1 rounded-lg bg-slate-800 text-indigo-300 border border-slate-700"
                  >
                    {ab}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Rating Summary Scorecard */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-6 text-center shrink-0 min-w-[200px] space-y-2">
            <span className="text-xs uppercase font-semibold text-slate-400">Average Rating</span>
            <div className="flex items-center justify-center space-x-2">
              <Star className="w-8 h-8 fill-amber-400 text-amber-400" />
              <span className="text-4xl font-black text-white">
                {institution.average_rating ? institution.average_rating.toFixed(1) : '—'}
              </span>
            </div>
            <div className="flex items-center justify-center space-x-3 text-xs text-slate-400 pt-1 border-t border-slate-800">
              <span>{institution.rating_count || 0} Ratings</span>
              <span>•</span>
              <span>{institution.opinion_count || 0} Opinions</span>
            </div>
          </div>
        </div>
      </div>

      {/* Strict Rating Enforcement Widget */}
      <RatingWidget
        institutionId={institution.id}
        initialUserRating={userRating}
        onRatingUpdated={handleRatingUpdated}
      />

      {/* Opinions Feed & Submission */}
      <OpinionSection
        institutionId={institution.id}
        institutionName={institution.name}
        initialOpinions={opinions}
      />
    </div>
  );
}
