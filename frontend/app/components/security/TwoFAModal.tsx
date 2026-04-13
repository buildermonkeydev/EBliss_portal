"use client";

import { useState } from "react";
import { 
  X, 
  QrCode, 
  Copy, 
  Check, 
  Download, 
  Key, 
  AlertCircle,
  Shield,
  Smartphone
} from "lucide-react";

interface TwoFAModalProps {
  onClose: () => void;
  onEnable: () => void;
}

export default function TwoFAModal({ onClose, onEnable }: TwoFAModalProps) {
  const [step, setStep] = useState(1);
  const [code, setCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState("");

  const secretKey = "ABCD EFGH IJKL MNOP QRST UVWX YZ12 34";
  const qrCodeUrl = "https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=otpauth://totp/eBliss:ayush%40ebliss.com?secret=JBSWY3DPEHPK3PXP&issuer=eBliss";

  const handleCopy = () => {
    navigator.clipboard.writeText(secretKey.replace(/\s/g, ""));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleVerify = async () => {
    if (code.length !== 6) {
      setError("Please enter a valid 6-digit code");
      return;
    }
    
    setIsVerifying(true);
    setError("");
    
    // Simulate verification
    setTimeout(() => {
      setIsVerifying(false);
      onEnable();
      onClose();
    }, 1500);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center animate-fadeIn p-4">
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-slate-800/95 backdrop-blur-sm border-b border-slate-700 p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Set Up 2FA</h2>
                <p className="text-xs text-slate-400">Step {step} of 2</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-slate-400" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {step === 1 ? (
            <div className="space-y-6">
              <div className="text-center">
                <div className="w-20 h-20 rounded-xl bg-indigo-500/10 flex items-center justify-center mx-auto mb-4">
                  <Smartphone className="w-10 h-10 text-indigo-400" />
                </div>
                <h3 className="text-white font-semibold text-lg">Scan QR Code</h3>
                <p className="text-slate-400 text-sm mt-2">
                  Scan the QR code with your authenticator app
                </p>
              </div>

              <div className="bg-white p-4 rounded-xl flex justify-center">
                <img src={qrCodeUrl} alt="QR Code" className="w-48 h-48" />
              </div>

              <div className="bg-slate-800/50 rounded-xl p-4">
                <p className="text-slate-400 text-xs mb-2">Or enter this code manually:</p>
                <div className="flex items-center justify-between bg-slate-900 rounded-lg p-3">
                  <code className="text-white font-mono text-sm tracking-wider">{secretKey}</code>
                  <button
                    onClick={handleCopy}
                    className="p-1.5 hover:bg-slate-700 rounded transition"
                  >
                    {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-slate-400" />}
                  </button>
                </div>
              </div>

              <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs text-amber-400 font-medium">Important</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Save your backup codes in a safe place. You'll need them if you lose access to your authenticator app.
                    </p>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setStep(2)}
                className="w-full px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-medium transition"
              >
                Continue
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="text-center">
                <div className="w-20 h-20 rounded-xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
                  <Key className="w-10 h-10 text-emerald-400" />
                </div>
                <h3 className="text-white font-semibold text-lg">Verify Setup</h3>
                <p className="text-slate-400 text-sm mt-2">
                  Enter the 6-digit code from your authenticator app
                </p>
              </div>

              <div>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="000000"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white text-center text-2xl font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  maxLength={6}
                  autoFocus
                />
                {error && (
                  <p className="text-red-400 text-xs mt-2">{error}</p>
                )}
              </div>

              <button
                onClick={handleVerify}
                disabled={isVerifying}
                className="w-full px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-medium transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isVerifying ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Verifying...
                  </>
                ) : (
                  "Verify and Enable"
                )}
              </button>

              <button
                onClick={() => setStep(1)}
                className="w-full text-slate-400 hover:text-white text-sm transition"
              >
                Back to QR Code
              </button>
            </div>
          )}
        </div>

        {/* Backup Codes Section */}
        {step === 1 && (
          <div className="border-t border-slate-700 p-5 bg-slate-800/30">
            <p className="text-xs text-slate-400 text-center">
              Supported apps: Google Authenticator, Microsoft Authenticator, Authy, and more
            </p>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }
      `}</style>
    </div>
  );
}