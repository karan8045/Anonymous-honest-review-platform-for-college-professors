'use client';

import React from 'react';
import SignupFlow from '@/components/SignupFlow';

export default function SignUpPage() {
  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-10 sm:py-16">
      <SignupFlow />
    </div>
  );
}
