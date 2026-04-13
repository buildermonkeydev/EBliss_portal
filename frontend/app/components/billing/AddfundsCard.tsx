"use client";

import { useState } from "react";
import { Plus, CreditCard, Banknote, Zap, ArrowRight, CheckCircle, IndianRupee } from "lucide-react";

export default function AddFundsCard() {
  const [amount, setAmount] = useState("");
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const quickAmounts = [500, 1000, 2500, 5000, 10000];

  const handleAmountSelect = (value: number) => {
    setSelectedAmount(value);
    setAmount(value.toString());
  };

  const handleAddFunds = async () => {
    const finalAmount = parseFloat(amount);
    if (isNaN(finalAmount) || finalAmount <= 0) return;

    setIsProcessing(true);
    // Simulate payment processing
    setTimeout(() => {
      setIsProcessing(false);
      alert(`Adding ₹${finalAmount} to wallet...`);
    }, 1500);
  };

  return (
    <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl overflow-hidden">
      <div className="p-6 border-b border-slate-700">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
            <Plus className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-white font-semibold text-lg">Add Funds to Wallet</h3>
            <p className="text-sm text-slate-400">Recharge your wallet to pay for services</p>
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="max-w-md mx-auto space-y-6">
          {/* Quick Amount Buttons */}
          <div>
            <p className="text-sm text-slate-400 mb-3">Quick Select</p>
            <div className="flex flex-wrap gap-3">
              {quickAmounts.map((amt) => (
                <button
                  key={amt}
                  onClick={() => handleAmountSelect(amt)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                    selectedAmount === amt
                      ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/20"
                      : "bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700"
                  }`}
                >
                  ₹{amt.toLocaleString()}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Amount Input */}
          <div>
            <p className="text-sm text-slate-400 mb-3">Custom Amount</p>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">₹</span>
              <input
                type="number"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  setSelectedAmount(null);
                }}
                placeholder="Enter amount"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-8 pr-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              />
            </div>
          </div>

          {/* Payment Methods */}
          <div>
            <p className="text-sm text-slate-400 mb-3">Payment Method</p>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-xl border border-slate-700">
                <div className="flex items-center gap-3">
                  <CreditCard className="w-5 h-5 text-indigo-400" />
                  <div>
                    <p className="text-white text-sm font-medium">Credit/Debit Card</p>
                    <p className="text-xs text-slate-500">Visa, Mastercard, RuPay</p>
                  </div>
                </div>
                <div className="w-4 h-4 rounded-full bg-emerald-500" />
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-800/30 rounded-xl border border-slate-700 opacity-50">
                <div className="flex items-center gap-3">
                  <Banknote className="w-5 h-5 text-slate-400" />
                  <div>
                    <p className="text-white text-sm font-medium">UPI</p>
                    <p className="text-xs text-slate-500">Google Pay, PhonePe, etc.</p>
                  </div>
                </div>
                <span className="text-xs text-slate-500">Coming Soon</span>
              </div>
            </div>
          </div>

          {/* Bonus Info */}
          <div className="bg-indigo-500/5 border border-indigo-500/20 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <Zap className="w-4 h-4 text-indigo-400 mt-0.5" />
              <div>
                <p className="text-xs text-indigo-300 font-medium">Bonus Credit</p>
                <p className="text-xs text-slate-400 mt-1">
                  Add ₹5000 or more and get 5% bonus credit added to your wallet instantly!
                </p>
              </div>
            </div>
          </div>

          {/* Action Button */}
          <button
            onClick={handleAddFunds}
            disabled={!amount || parseFloat(amount) <= 0 || isProcessing}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-medium transition-all duration-300 flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <IndianRupee className="w-4 h-4" />
                Add Funds
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          <p className="text-center text-xs text-slate-500">
            By adding funds, you agree to our terms and conditions. All transactions are secure and encrypted.
          </p>
        </div>
      </div>
    </div>
  );
}