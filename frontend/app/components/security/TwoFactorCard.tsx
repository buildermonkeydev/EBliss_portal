"use client";

import { useState } from "react";
import { 
  Shield, 
  Smartphone, 
  AlertCircle, 
  CheckCircle, 
  QrCode,
  Copy,
  Check,
  Download,
  RefreshCw,
  Key
} from "lucide-react";
import TwoFAModal from "./TwoFAModal";

export default function TwoFactorCard() {
  const [open, setOpen] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false);

  return (
    <>
      <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Two-Factor Authentication</h2>
              <p className="text-sm text-slate-400">Add an extra layer of security to your account</p>
            </div>
          </div>
        </div>
        
        <div className="p-6">
          {!isEnabled ? (
            <div className="space-y-6">
              <div className="flex items-start gap-4 p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl">
                <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-amber-400 font-medium">2FA Not Enabled</p>
                  <p className="text-xs text-slate-400 mt-1">
                    Your account is currently protected only by password. Enable 2FA for enhanced security.
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-800/30 rounded-xl p-4 text-center">
                  <Smartphone className="w-8 h-8 text-indigo-400 mx-auto mb-2" />
                  <p className="text-white font-medium text-sm">Authenticator App</p>
                  <p className="text-xs text-slate-500 mt-1">Google Authenticator, Authy, etc.</p>
                </div>
                <div className="bg-slate-800/30 rounded-xl p-4 text-center">
                  <Key className="w-8 h-8 text-indigo-400 mx-auto mb-2" />
                  <p className="text-white font-medium text-sm">Backup Codes</p>
                  <p className="text-xs text-slate-500 mt-1">Generate recovery codes</p>
                </div>
              </div>
              
              <button
                onClick={() => setOpen(true)}
                className="w-full px-5 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-medium transition-all duration-300 flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20"
              >
                <Shield className="w-4 h-4" />
                Enable Two-Factor Authentication
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-start gap-4 p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-xl">
                <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-emerald-400 font-medium">2FA Enabled</p>
                  <p className="text-xs text-slate-400 mt-1">
                    Your account is protected by two-factor authentication.
                  </p>
                </div>
              </div>
              
              <div className="space-y-3">
                <button className="w-full px-5 py-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium transition flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4" />
                  Regenerate Backup Codes
                </button>
                <button className="w-full px-5 py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 text-sm font-medium transition flex items-center justify-center gap-2 border border-red-500/30">
                  Disable 2FA
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {open && (
        <TwoFAModal 
          onClose={() => setOpen(false)} 
          onEnable={() => setIsEnabled(true)} 
        />
      )}
    </>
  );
}