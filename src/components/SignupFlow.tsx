'use client';

import React, { useState, useEffect, useId, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { COUNTRIES, getCountryByCodeOrName } from '@/lib/countries';
import { Institution } from '@/lib/types';
import { useAuth } from '@/context/AuthContext';
import {
  Shield,
  KeyRound,
  Globe,
  GraduationCap,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  Search,
  PlusCircle,
  Eye,
  EyeOff,
  Check,
  Building2,
  Sparkles,
  Info
} from 'lucide-react';

interface HighlightProps {
  text: string;
  query: string;
}

function HighlightMatch({ text, query }: HighlightProps) {
  if (!query.trim()) return <span>{text}</span>;

  // Split query into tokens for multi-token highlighting
  const tokens = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return <span>{text}</span>;

  // Build regex matching any token
  const pattern = new RegExp(`(${tokens.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi');
  const parts = text.split(pattern);

  return (
    <span>
      {parts.map((part, i) =>
        tokens.some(t => t.toLowerCase() === part.toLowerCase()) ? (
          <mark key={i} className="bg-amber-400/30 text-amber-200 font-semibold px-0.5 rounded">
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </span>
  );
}

export default function SignupFlow() {
  const router = useRouter();
  const { signUp } = useAuth();

  // Wizard state: 1: Username, 2: Password, 3: Country, 4: University, 5: Confirm, 6: Success
  const [currentStep, setCurrentStep] = useState<number>(1);

  // Form Fields
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [acknowledgedWarning, setAcknowledgedWarning] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState('India');
  const [selectedInstitution, setSelectedInstitution] = useState<Institution | null>(null);
  const [isManualInstitution, setIsManualInstitution] = useState(false);
  const [manualInstitutionName, setManualInstitutionName] = useState('');
  const [manualInstitutionCity, setManualInstitutionCity] = useState('');

  // Password visibility
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Username validation & real-time availability
  const [usernameChecking, setUsernameChecking] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [usernameError, setUsernameError] = useState<string | null>(null);

  // Institution Search & Autocomplete
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Institution[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);

  // Submit / error state
  const [submitting, setSubmitting] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);

  // Steps definition for progress bar
  const STEPS = [
    { num: 1, label: 'Identity', icon: Shield },
    { num: 2, label: 'Password', icon: KeyRound },
    { num: 3, label: 'Country', icon: Globe },
    { num: 4, label: 'University', icon: GraduationCap },
    { num: 5, label: 'Confirm', icon: CheckCircle2 },
  ];

  // Debounced real-time username availability check
  useEffect(() => {
    if (!username.trim()) {
      setUsernameAvailable(null);
      setUsernameError(null);
      return;
    }

    if (username.length < 3) {
      setUsernameAvailable(false);
      setUsernameError('Username must be at least 3 characters.');
      return;
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      setUsernameAvailable(false);
      setUsernameError('Only letters, numbers, and underscores are allowed.');
      return;
    }

    setUsernameChecking(true);
    setUsernameError(null);

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/auth/check-username?username=${encodeURIComponent(username.trim())}`);
        const data = await res.json();
        setUsernameChecking(false);
        if (data.available) {
          setUsernameAvailable(true);
          setUsernameError(null);
        } else {
          setUsernameAvailable(false);
          setUsernameError(data.reason || 'Username is not available.');
        }
      } catch {
        setUsernameChecking(false);
        setUsernameAvailable(null);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [username]);

  // Debounced college/university autocomplete search
  useEffect(() => {
    if (!selectedCountry) {
      setSearchResults([]);
      return;
    }

    setSearchLoading(true);
    const timer = setTimeout(async () => {
      try {
        const q = encodeURIComponent(searchQuery.trim());
        const c = encodeURIComponent(selectedCountry);
        const res = await fetch(`/api/institutions?country=${c}&q=${q}&limit=8`);
        const data = await res.json();
        setSearchResults(data.institutions || []);
      } catch {
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [selectedCountry, searchQuery]);

  // Password strength calculation
  const getPasswordStrength = () => {
    if (!password) return { score: 0, label: 'None', color: 'bg-slate-700' };
    let score = 0;
    if (password.length >= 6) score += 1;
    if (password.length >= 10) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password)) score += 1;

    if (score <= 1) return { score: 1, label: 'Weak', color: 'bg-red-500' };
    if (score <= 3) return { score: 2, label: 'Medium', color: 'bg-amber-500' };
    return { score: 3, label: 'Strong', color: 'bg-emerald-500' };
  };

  const passwordStrength = getPasswordStrength();

  // Navigation handlers
  const canProceedStep1 = username.length >= 3 && usernameAvailable === true && !usernameChecking;
  const canProceedStep2 =
    password.length >= 6 &&
    password === confirmPassword &&
    acknowledgedWarning;
  const canProceedStep3 = !!selectedCountry;
  const canProceedStep4 =
    (selectedInstitution !== null && !isManualInstitution) ||
    (isManualInstitution && manualInstitutionName.trim().length >= 2);

  const handleNext = () => {
    setGeneralError(null);
    if (currentStep === 1 && !canProceedStep1) return;
    if (currentStep === 2 && !canProceedStep2) return;
    if (currentStep === 3 && !canProceedStep3) return;
    if (currentStep === 4 && !canProceedStep4) return;
    setCurrentStep(prev => prev + 1);
  };

  const handleBack = () => {
    setGeneralError(null);
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleSelectInstitution = (inst: Institution) => {
    setSelectedInstitution(inst);
    setIsManualInstitution(false);
    setManualInstitutionName('');
  };

  const handleSelectManual = () => {
    setIsManualInstitution(true);
    setSelectedInstitution(null);
  };

  const handleCreateAccount = async () => {
    setSubmitting(true);
    setGeneralError(null);

    const payload = {
      username: username.trim(),
      password,
      confirmPassword,
      country: selectedCountry,
      institution_id: selectedInstitution ? selectedInstitution.id : undefined,
      manualInstitutionName: isManualInstitution ? manualInstitutionName.trim() : undefined,
      acknowledgedRecoveryWarning: acknowledgedWarning,
    };

    const result = await signUp(payload);
    setSubmitting(false);

    if (result.success) {
      setCurrentStep(6); // Success screen
    } else {
      setGeneralError(result.error || 'Failed to create anonymous account.');
    }
  };

  const selectedCountryObj = getCountryByCodeOrName(selectedCountry);

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Onboarding Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 sm:p-10 backdrop-blur-xl relative overflow-hidden">
        {/* Glow ambient background effect */}
        <div className="absolute -top-24 -left-24 w-60 h-60 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-60 h-60 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Progress Stepper (hidden on success step 6) */}
        {currentStep <= 5 && (
          <div className="mb-8">
            <div className="flex items-center justify-between relative">
              {/* Progress track line */}
              <div className="absolute top-1/2 left-0 right-0 -translate-y-1/2 h-1 bg-slate-800 z-0" />
              <div
                className="absolute top-1/2 left-0 -translate-y-1/2 h-1 bg-gradient-to-r from-emerald-500 to-indigo-500 transition-all duration-300 z-0"
                style={{
                  width: `${((currentStep - 1) / (STEPS.length - 1)) * 100}%`,
                }}
              />

              {STEPS.map(step => {
                const isCompleted = currentStep > step.num;
                const isCurrent = currentStep === step.num;
                const StepIcon = step.icon;

                return (
                  <div key={step.num} className="relative z-10 flex flex-col items-center">
                    <div
                      className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all font-semibold text-xs sm:text-sm ${
                        isCompleted
                          ? 'bg-emerald-500 text-slate-950 ring-4 ring-emerald-500/20 shadow-md'
                          : isCurrent
                          ? 'bg-indigo-600 text-white ring-4 ring-indigo-500/30 shadow-lg'
                          : 'bg-slate-800 text-slate-400 border border-slate-700'
                      }`}
                    >
                      {isCompleted ? <Check className="w-5 h-5 stroke-[2.5]" /> : <StepIcon className="w-4 h-4" />}
                    </div>
                    <span
                      className={`hidden sm:block text-[11px] font-medium mt-1.5 transition-colors ${
                        isCurrent ? 'text-indigo-400 font-semibold' : isCompleted ? 'text-emerald-400' : 'text-slate-500'
                      }`}
                    >
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Mobile step label */}
            <div className="sm:hidden text-center mt-3 text-xs font-semibold text-indigo-400 uppercase tracking-wider">
              Step {currentStep} of {STEPS.length}: {STEPS[currentStep - 1]?.label}
            </div>
          </div>
        )}

        {/* Global Error Banner */}
        {generalError && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm flex items-start space-x-3">
            <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <span>{generalError}</span>
          </div>
        )}

        {/* STEP 1: USERNAME */}
        {currentStep === 1 && (
          <div className="space-y-6 animate-fadeIn">
            <div>
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium mb-3">
                <Shield className="w-3.5 h-3.5" />
                <span>Public Anonymous Pseudonym</span>
              </div>
              <h2 className="text-2xl font-bold text-white tracking-tight">
                Step 1 — Create your anonymous identity
              </h2>
              <p className="text-slate-400 text-sm mt-1">
                Choose a username. This will be your public identity on the platform when sharing honest feedback.
              </p>
            </div>

            <div className="space-y-3">
              <label className="block text-sm font-semibold text-slate-200">
                Choose a username
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500 font-mono text-base">
                  @
                </span>
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value.toLowerCase().replace(/\s+/g, ''))}
                  placeholder="e.g. anonymous_karan"
                  className="w-full bg-slate-800/80 border border-slate-700 rounded-xl pl-9 pr-12 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-medium"
                  autoFocus
                />
                <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center">
                  {usernameChecking ? (
                    <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                  ) : usernameAvailable === true ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  ) : usernameAvailable === false ? (
                    <AlertTriangle className="w-5 h-5 text-red-400" />
                  ) : null}
                </div>
              </div>

              {/* Real-time username status */}
              {usernameChecking && (
                <p className="text-xs text-indigo-400 animate-pulse">Checking username availability...</p>
              )}
              {usernameAvailable === true && (
                <p className="text-xs text-emerald-400 flex items-center space-x-1.5 font-medium">
                  <Check className="w-3.5 h-3.5" />
                  <span>Available! Other students will see you as <strong>@{username}</strong>.</span>
                </p>
              )}
              {usernameError && (
                <p className="text-xs text-red-400 flex items-center space-x-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>{usernameError}</span>
                </p>
              )}
            </div>

            {/* Username Rules & Examples */}
            <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/60 space-y-3">
              <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center space-x-1.5">
                <Info className="w-3.5 h-3.5 text-indigo-400" />
                <span>Username requirements</span>
              </div>
              <ul className="text-xs text-slate-400 space-y-1 list-disc list-inside">
                <li>Between 3 and 30 characters long</li>
                <li>Letters, numbers, and underscores only</li>
                <li>No email addresses, phone numbers, or real identities</li>
              </ul>

              <div className="pt-2 border-t border-slate-700/50">
                <p className="text-xs text-slate-400 mb-1.5">Quick Inspiration Examples:</p>
                <div className="flex flex-wrap gap-2">
                  {['student_x', 'campusvoice', 'anonymous_21', 'truth_seeker'].map(ex => (
                    <button
                      key={ex}
                      type="button"
                      onClick={() => setUsername(ex)}
                      className="text-xs bg-slate-800 hover:bg-slate-750 text-indigo-300 border border-slate-700 px-2.5 py-1 rounded-md transition hover:border-indigo-500"
                    >
                      @{ex}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Step 1 Actions */}
            <div className="pt-4 flex justify-end">
              <button
                type="button"
                onClick={handleNext}
                disabled={!canProceedStep1}
                className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-bold px-6 py-3 rounded-xl shadow-lg shadow-emerald-500/20 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                <span>Continue to Password</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: PASSWORD + IRREVERSIBLE RECOVERY WARNING */}
        {currentStep === 2 && (
          <div className="space-y-6 animate-fadeIn">
            <div>
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-medium mb-3">
                <KeyRound className="w-3.5 h-3.5" />
                <span>Zero-Recovery Architecture</span>
              </div>
              <h2 className="text-2xl font-bold text-white tracking-tight">
                Step 2 — Create your password
              </h2>
              <p className="text-slate-400 text-sm mt-1">
                Your password is your sole key to this account.
              </p>
            </div>

            {/* Password input */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-200 mb-1.5">
                  Create a password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Enter a secure password (min 6 chars)"
                    className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 pr-12 font-medium"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-200"
                    aria-label="Toggle password visibility"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Password strength feedback */}
                {password && (
                  <div className="mt-2 space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">Password strength:</span>
                      <span className="font-semibold text-slate-200">{passwordStrength.label}</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden flex">
                      <div
                        className={`h-full transition-all duration-300 ${passwordStrength.color}`}
                        style={{ width: `${(passwordStrength.score / 3) * 100}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Confirm password input */}
              <div>
                <label className="block text-sm font-semibold text-slate-200 mb-1.5">
                  Confirm password
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter your password"
                    className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 pr-12 font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-200"
                    aria-label="Toggle confirm password visibility"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {confirmPassword && password !== confirmPassword && (
                  <p className="text-xs text-red-400 mt-1">Passwords do not match.</p>
                )}
                {confirmPassword && password === confirmPassword && (
                  <p className="text-xs text-emerald-400 mt-1 flex items-center space-x-1">
                    <Check className="w-3.5 h-3.5" />
                    <span>Passwords match.</span>
                  </p>
                )}
              </div>
            </div>

            {/* MANDATORY PROMINENT IRREVERSIBLE PASSWORD WARNING */}
            <div className="p-4 sm:p-5 rounded-2xl bg-amber-500/10 border-2 border-amber-500/30 space-y-3">
              <div className="flex items-start space-x-3">
                <span className="text-2xl shrink-0">⚠️</span>
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-amber-300">
                    Keep your password safe.
                  </h4>
                  <p className="text-xs sm:text-sm text-amber-200/90 leading-relaxed">
                    Because your account is anonymous and does not use an email or phone number for recovery,
                    <strong> forgetting your password means you can no longer access this account.</strong>
                  </p>
                </div>
              </div>

              {/* Mandatory acknowledgement checkbox */}
              <label className="flex items-start space-x-3 pt-3 border-t border-amber-500/20 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={acknowledgedWarning}
                  onChange={e => setAcknowledgedWarning(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded border-amber-500/50 text-indigo-600 focus:ring-indigo-500 bg-slate-900"
                />
                <span className="text-xs sm:text-sm font-medium text-slate-200">
                  I understand that my password cannot be recovered if I lose it.
                </span>
              </label>
            </div>

            {/* Step 2 Actions */}
            <div className="pt-4 flex items-center justify-between">
              <button
                type="button"
                onClick={handleBack}
                className="inline-flex items-center space-x-1.5 text-sm text-slate-400 hover:text-white px-3 py-2 rounded-lg transition"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>

              <button
                type="button"
                onClick={handleNext}
                disabled={!canProceedStep2}
                className="inline-flex items-center space-x-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-bold px-6 py-3 rounded-xl shadow-lg shadow-emerald-500/20 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                <span>Continue to Country</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: WHERE DO YOU STUDY? (COUNTRY SELECTOR) */}
        {currentStep === 3 && (
          <div className="space-y-6 animate-fadeIn">
            <div>
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium mb-3">
                <Globe className="w-3.5 h-3.5" />
                <span>Study Location</span>
              </div>
              <h2 className="text-2xl font-bold text-white tracking-tight">
                Where do you study?
              </h2>
              <p className="text-slate-400 text-sm mt-1">
                Select your country or territory. College suggestions will be prioritized based on your location.
              </p>
            </div>

            <div className="space-y-3">
              <label className="block text-sm font-semibold text-slate-200">
                Select your country
              </label>
              <div className="relative">
                <select
                  value={selectedCountry}
                  onChange={e => {
                    setSelectedCountry(e.target.value);
                    setSelectedInstitution(null);
                    setSearchQuery('');
                  }}
                  className="w-full appearance-none bg-slate-800 border border-slate-700 rounded-xl px-4 py-3.5 text-white font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 text-base"
                >
                  {COUNTRIES.map(c => (
                    <option key={c.code} value={c.name} className="bg-slate-900 text-white">
                      {c.flag} {c.name}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-400">
                  ▼
                </div>
              </div>
            </div>

            {/* Quick Country Badges */}
            <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-800 space-y-2">
              <p className="text-xs text-slate-400 font-medium">Popular Regions:</p>
              <div className="flex flex-wrap gap-2">
                {[
                  { name: 'India', flag: '🇮🇳' },
                  { name: 'United States', flag: '🇺🇸' },
                  { name: 'United Kingdom', flag: '🇬🇧' },
                  { name: 'Canada', flag: '🇨🇦' },
                  { name: 'Australia', flag: '🇦🇺' },
                  { name: 'Germany', flag: '🇩🇪' },
                  { name: 'Singapore', flag: '🇸🇬' },
                ].map(c => (
                  <button
                    key={c.name}
                    type="button"
                    onClick={() => {
                      setSelectedCountry(c.name);
                      setSelectedInstitution(null);
                      setSearchQuery('');
                    }}
                    className={`text-xs px-3 py-1.5 rounded-lg border transition flex items-center space-x-1.5 ${
                      selectedCountry === c.name
                        ? 'bg-indigo-600/30 border-indigo-500 text-white font-semibold'
                        : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300'
                    }`}
                  >
                    <span>{c.flag}</span>
                    <span>{c.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Step 3 Actions */}
            <div className="pt-4 flex items-center justify-between">
              <button
                type="button"
                onClick={handleBack}
                className="inline-flex items-center space-x-1.5 text-sm text-slate-400 hover:text-white px-3 py-2 rounded-lg transition"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>

              <button
                type="button"
                onClick={handleNext}
                disabled={!canProceedStep3}
                className="inline-flex items-center space-x-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-bold px-6 py-3 rounded-xl shadow-lg shadow-emerald-500/20 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                <span>Find Your University</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: FIND YOUR COLLEGE/UNIVERSITY (AUTOCOMPLETE + NOT AVAILABLE FALLBACK) */}
        {currentStep === 4 && (
          <div className="space-y-6 animate-fadeIn">
            <div>
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium mb-3">
                <GraduationCap className="w-3.5 h-3.5" />
                <span>{selectedCountryObj?.flag} {selectedCountry}</span>
              </div>
              <h2 className="text-2xl font-bold text-white tracking-tight">
                Find your college/university
              </h2>
              <p className="text-slate-400 text-sm mt-1">
                Type your university name, abbreviation, or city. Autocomplete suggestions will appear instantly.
              </p>
            </div>

            {/* College search box */}
            <div className="space-y-2">
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Search className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  onFocus={() => setSearchFocused(true)}
                  placeholder={`Search colleges in ${selectedCountry}... (e.g. cent, CUSB, IIT)`}
                  className="w-full bg-slate-800/90 border border-slate-700 rounded-xl pl-10 pr-10 py-3.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                  autoFocus
                />
                {searchLoading && (
                  <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center">
                    <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </div>

              {/* Currently Selected Institution Pill */}
              {selectedInstitution && !isManualInstitution && (
                <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between">
                  <div className="flex items-center space-x-2.5">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                    <div>
                      <p className="text-sm font-bold text-emerald-300">
                        ✓ {selectedInstitution.name}
                      </p>
                      <p className="text-xs text-emerald-400/80">
                        {selectedInstitution.city ? `${selectedInstitution.city}, ` : ''}
                        {selectedInstitution.state ? `${selectedInstitution.state}, ` : ''}
                        {selectedInstitution.country}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedInstitution(null)}
                    className="text-xs text-slate-400 hover:text-white px-2 py-1 bg-slate-800 rounded-md"
                  >
                    Change
                  </button>
                </div>
              )}
            </div>

            {/* Live Autocomplete Suggestions Box */}
            <div className="border border-slate-800 rounded-2xl bg-slate-950/70 overflow-hidden divide-y divide-slate-800/80 shadow-xl">
              <div className="px-4 py-2 bg-slate-800/40 text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                <span>Suggestions ({searchResults.length})</span>
                <span className="text-[11px] text-slate-500">Live search</span>
              </div>

              {searchResults.length > 0 ? (
                <div className="max-h-60 overflow-y-auto divide-y divide-slate-800/60 custom-scrollbar">
                  {searchResults.map(inst => {
                    const isSelected = selectedInstitution?.id === inst.id && !isManualInstitution;
                    return (
                      <button
                        key={inst.id}
                        type="button"
                        onClick={() => handleSelectInstitution(inst)}
                        className={`w-full text-left px-4 py-3 hover:bg-slate-800/80 transition flex items-start justify-between group ${
                          isSelected ? 'bg-indigo-900/30 border-l-4 border-indigo-500' : ''
                        }`}
                      >
                        <div className="space-y-0.5">
                          <p className="text-sm font-semibold text-slate-100 group-hover:text-white">
                            <HighlightMatch text={inst.name} query={searchQuery} />
                          </p>
                          <p className="text-xs text-slate-400">
                            {inst.city ? `${inst.city}, ` : ''}
                            {inst.state ? `${inst.state}, ` : ''}
                            {inst.country}
                          </p>
                          {inst.abbreviations && inst.abbreviations.length > 0 && (
                            <div className="flex gap-1.5 pt-1">
                              {inst.abbreviations.map(ab => (
                                <span
                                  key={ab}
                                  className="text-[10px] bg-slate-800 text-indigo-300 px-1.5 py-0.5 rounded border border-slate-700"
                                >
                                  {ab}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        {isSelected ? (
                          <div className="shrink-0 text-emerald-400 mt-1">
                            <Check className="w-5 h-5 stroke-[2.5]" />
                          </div>
                        ) : (
                          <span className="shrink-0 text-xs text-indigo-400 opacity-0 group-hover:opacity-100 transition mt-1 font-medium">
                            Select →
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="p-6 text-center text-slate-400 space-y-1">
                  <p className="text-sm">No institutions found matching "{searchQuery}" in {selectedCountry}.</p>
                  <p className="text-xs text-slate-500">You can add your institution manually below.</p>
                </div>
              )}

              {/* MANDATORY: ALWAYS AVAILABLE "+ Not Available — Add manually" FALLBACK */}
              <div className="p-4 bg-slate-900/90">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-slate-300">
                    Can't find your college/university?
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleSelectManual}
                  className={`w-full py-2.5 px-4 rounded-xl border border-dashed text-sm font-semibold transition flex items-center justify-center space-x-2 ${
                    isManualInstitution
                      ? 'border-amber-400 bg-amber-500/10 text-amber-300'
                      : 'border-slate-700 bg-slate-800/60 hover:bg-slate-800 text-slate-300 hover:text-white hover:border-slate-600'
                  }`}
                >
                  <PlusCircle className="w-4 h-4 text-amber-400" />
                  <span>＋ Not Available — Add manually</span>
                </button>

                {/* If user selected "Not Available", show manual input */}
                {isManualInstitution && (
                  <div className="mt-4 p-4 rounded-xl bg-slate-850 border border-amber-500/30 space-y-3 animate-fadeIn">
                    <div className="flex items-center space-x-2 text-xs font-semibold text-amber-400 uppercase tracking-wider">
                      <Building2 className="w-4 h-4" />
                      <span>Enter your college / university details</span>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">
                        College / University Name *
                      </label>
                      <input
                        type="text"
                        value={manualInstitutionName}
                        onChange={e => setManualInstitutionName(e.target.value)}
                        placeholder="e.g. XYZ Institute of Technology"
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        autoFocus
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1">
                          Country (Retained)
                        </label>
                        <input
                          type="text"
                          value={selectedCountry}
                          disabled
                          className="w-full bg-slate-900/60 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-400 cursor-not-allowed"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1">
                          City / Region (Optional)
                        </label>
                        <input
                          type="text"
                          value={manualInstitutionCity}
                          onChange={e => setManualInstitutionCity(e.target.value)}
                          placeholder="e.g. Pune"
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    </div>

                    <p className="text-[11px] text-amber-300/80 leading-relaxed bg-amber-500/10 p-2.5 rounded-lg border border-amber-500/20">
                      ℹ️ This institution will be added as a <strong>user-submitted institution</strong> and made available for other students to explore and review.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Step 4 Actions */}
            <div className="pt-4 flex items-center justify-between">
              <button
                type="button"
                onClick={handleBack}
                className="inline-flex items-center space-x-1.5 text-sm text-slate-400 hover:text-white px-3 py-2 rounded-lg transition"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>

              <button
                type="button"
                onClick={handleNext}
                disabled={!canProceedStep4}
                className="inline-flex items-center space-x-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-bold px-6 py-3 rounded-xl shadow-lg shadow-emerald-500/20 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                <span>Review Profile</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 5: CONFIRMATION SCREEN */}
        {currentStep === 5 && (
          <div className="space-y-6 animate-fadeIn">
            <div>
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-medium mb-3">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Step 5 — Final Confirmation</span>
              </div>
              <h2 className="text-2xl font-bold text-white tracking-tight">
                Your anonymous profile
              </h2>
              <p className="text-slate-400 text-sm mt-1">
                Please verify your anonymous details before completing registration.
              </p>
            </div>

            {/* Profile summary card */}
            <div className="p-6 rounded-2xl bg-slate-800/60 border border-slate-700/80 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-700">
                <span className="text-xs uppercase font-semibold text-slate-400">Username</span>
                <span className="text-base font-bold text-emerald-400 font-mono">
                  @{username}
                </span>
              </div>

              <div className="flex items-center justify-between pb-3 border-b border-slate-700">
                <span className="text-xs uppercase font-semibold text-slate-400">Country</span>
                <span className="text-sm font-semibold text-slate-200 flex items-center space-x-1.5">
                  <span>{selectedCountryObj?.flag}</span>
                  <span>{selectedCountry}</span>
                </span>
              </div>

              <div className="flex items-start justify-between">
                <span className="text-xs uppercase font-semibold text-slate-400 mt-0.5">
                  College / University
                </span>
                <div className="text-right max-w-xs">
                  <span className="text-sm font-bold text-slate-100 block">
                    {isManualInstitution ? manualInstitutionName : selectedInstitution?.name}
                  </span>
                  <span className="text-xs text-slate-400 block mt-0.5">
                    {isManualInstitution
                      ? `User-submitted (${selectedCountry})`
                      : `${selectedInstitution?.city || ''}, ${selectedInstitution?.country || ''}`}
                  </span>
                </div>
              </div>
            </div>

            {/* Zero-PII Guarantee Box */}
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-400 space-y-2">
              <div className="flex items-center space-x-1.5 text-slate-300 font-semibold">
                <Shield className="w-4 h-4 text-emerald-400" />
                <span>Zero-PII Anonymity Guarantee</span>
              </div>
              <p className="leading-relaxed">
                No email, phone number, or student ID has been collected. Only your chosen pseudonym <strong>@{username}</strong> will ever be visible to other students when you submit ratings and opinions.
              </p>
            </div>

            {/* Step 5 Actions */}
            <div className="pt-4 flex items-center justify-between">
              <button
                type="button"
                onClick={handleBack}
                disabled={submitting}
                className="inline-flex items-center space-x-1.5 text-sm text-slate-400 hover:text-white px-3 py-2 rounded-lg transition"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>

              <button
                type="button"
                onClick={handleCreateAccount}
                disabled={submitting}
                className="inline-flex items-center space-x-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-bold px-7 py-3.5 rounded-xl shadow-lg shadow-emerald-500/25 disabled:opacity-50 transition"
              >
                {submitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                    <span>Creating Account...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Create Anonymous Account</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* STEP 6: ACCOUNT CREATED (SUCCESS SCREEN) */}
        {currentStep === 6 && (
          <div className="text-center py-6 space-y-6 animate-fadeIn">
            <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto ring-8 ring-emerald-500/10">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div className="space-y-2">
              <h2 className="text-3xl font-extrabold text-white tracking-tight">
                🎉 Your anonymous account has been created.
              </h2>
              <p className="text-slate-300 max-w-md mx-auto text-sm leading-relaxed">
                You can now explore colleges and share your honest experiences anonymously.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700 max-w-sm mx-auto text-left space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Signed in as:</span>
                <span className="font-bold text-emerald-400 font-mono">@{username}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Enrolled at:</span>
                <span className="font-medium text-slate-200 truncate max-w-[180px]">
                  {isManualInstitution ? manualInstitutionName : selectedInstitution?.name}
                </span>
              </div>
            </div>

            <div className="pt-4">
              <button
                type="button"
                onClick={() => router.push('/')}
                className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-bold px-8 py-3.5 rounded-xl shadow-lg shadow-emerald-500/25 transition text-base"
              >
                <span>Enter the Platform</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
