import React from 'react';
import Link from 'next/link';
import { Institution } from '@/lib/types';
import { Star, MapPin, MessageSquare, CheckCircle, ShieldAlert, ArrowRight } from 'lucide-react';

interface InstitutionCardProps {
  institution: Institution;
}

export default function InstitutionCard({ institution }: InstitutionCardProps) {
  const isVerified = institution.verified || institution.source === 'official_database';

  return (
    <div className="bg-slate-900/90 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 sm:p-6 transition-all duration-200 hover:shadow-xl hover:shadow-indigo-500/5 flex flex-col justify-between group">
      <div>
        {/* Source Badge & Rating Pill */}
        <div className="flex items-center justify-between gap-2 mb-3">
          {isVerified ? (
            <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <CheckCircle className="w-3 h-3" />
              <span>Verified Institution</span>
            </span>
          ) : (
            <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/20">
              <ShieldAlert className="w-3 h-3" />
              <span>User Submitted</span>
            </span>
          )}

          <div className="flex items-center space-x-1 bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700/60">
            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
            <span className="text-xs font-bold text-white">
              {institution.average_rating ? institution.average_rating.toFixed(1) : 'New'}
            </span>
            <span className="text-[10px] text-slate-400">
              ({institution.rating_count || 0})
            </span>
          </div>
        </div>

        {/* Institution Name */}
        <h3 className="text-lg font-bold text-white group-hover:text-indigo-300 transition-colors line-clamp-2">
          {institution.name}
        </h3>

        {/* Location */}
        <p className="text-xs text-slate-400 mt-2 flex items-center space-x-1.5">
          <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          <span>
            {institution.city ? `${institution.city}, ` : ''}
            {institution.state ? `${institution.state}, ` : ''}
            {institution.country}
          </span>
        </p>

        {/* Abbreviations */}
        {institution.abbreviations && institution.abbreviations.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {institution.abbreviations.map(ab => (
              <span
                key={ab}
                className="text-[10px] font-mono font-medium px-2 py-0.5 rounded bg-slate-800 text-indigo-300 border border-slate-700"
              >
                {ab}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Footer stats & Action */}
      <div className="mt-5 pt-4 border-t border-slate-800/80 flex items-center justify-between">
        <div className="flex items-center space-x-1 text-xs text-slate-400">
          <MessageSquare className="w-3.5 h-3.5 text-slate-500" />
          <span>{institution.opinion_count || 0} opinions</span>
        </div>

        <Link
          href={`/institution/${institution.id}`}
          className="inline-flex items-center space-x-1 text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition group-hover:translate-x-0.5"
        >
          <span>View & Review</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}
