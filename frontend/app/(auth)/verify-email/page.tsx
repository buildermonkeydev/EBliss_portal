'use client';

import { Suspense } from 'react';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { FaCheckCircle, FaSpinner, FaExclamationTriangle } from 'react-icons/fa';

// Component that uses useSearchParams
function VerifyEmailContent() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  
  const { verifyEmail } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      setStatus('error');
      setMessage('Invalid verification link');
      return;
    }

    const verify = async () => {
      try {
        await verifyEmail(token);
        setStatus('success');
        setMessage('Email verified successfully! Redirecting to dashboard...');
        setTimeout(() => {
          router.push('/dashboard');
        }, 3000);
      } catch (err: any) {
        setStatus('error');
        setMessage(err.response?.data?.message || 'Verification failed');
      }
    };

    verify();
  }, [searchParams, verifyEmail, router]);

  return (
    <div className="max-w-md w-full bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700 p-8 text-center">
      {status === 'loading' && (
        <>
          <FaSpinner className="w-16 h-16 text-indigo-400 animate-spin mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white">Verifying Email</h1>
          <p className="text-slate-400 mt-2">Please wait while we verify your email...</p>
        </>
      )}

      {status === 'success' && (
        <>
          <FaCheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white">Email Verified!</h1>
          <p className="text-slate-400 mt-2">{message}</p>
        </>
      )}

      {status === 'error' && (
        <>
          <FaExclamationTriangle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white">Verification Failed</h1>
          <p className="text-slate-400 mt-2">{message}</p>
          <div className="mt-6 space-y-3">
            <Link
              href="/login"
              className="block w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium"
            >
              Go to Login
            </Link>
            <Link
              href="/resend-verification"
              className="block w-full py-3 rounded-xl bg-slate-700 text-white font-medium"
            >
              Resend Verification Email
            </Link>
          </div>
        </>
      )}
    </div>
  );
}

// Loading fallback component
function VerifyEmailFallback() {
  return (
    <div className="max-w-md w-full bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700 p-8 text-center">
      <FaSpinner className="w-16 h-16 text-indigo-400 animate-spin mx-auto mb-4" />
      <h1 className="text-2xl font-bold text-white">Loading...</h1>
      <p className="text-slate-400 mt-2">Please wait...</p>
    </div>
  );
}

// Main page component with Suspense boundary
export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
      <Suspense fallback={<VerifyEmailFallback />}>
        <VerifyEmailContent />
      </Suspense>
    </div>
  );
}