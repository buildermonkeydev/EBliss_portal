"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Wallet, 
  CreditCard, 
  Calendar, 
  TrendingUp,
  Lock,
  Loader2,
  CheckCircle,
  XCircle,
  AlertCircle,
  Plus,
  Banknote,
  Zap,
  Shield
} from "lucide-react";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import api from "@/lib/api/auth";

interface WalletBalance {
  balance: number;
  currency: string;
  low_balance_threshold: number;
}

export default function BillingPage() {
  const [balance, setBalance] = useState<WalletBalance>({ balance: 0, currency: "INR", low_balance_threshold: 10 });
  const [unbilledAmount, setUnbilledAmount] = useState(0);
  const [nextInvoiceDate, setNextInvoiceDate] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddFundsModal, setShowAddFundsModal] = useState(false);
  const [addFundsAmount, setAddFundsAmount] = useState<number>(500);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Fetch wallet balance
  const fetchWalletBalance = useCallback(async () => {
    try {
      const response = await api.get("/wallet/balance");
      const data = response.data;
      setBalance({
        balance: data.balance || 0,
        currency: data.currency || "INR",
        low_balance_threshold: data.low_balance_threshold || 10,
      });
    } catch (err) {
      console.error("Failed to fetch wallet balance:", err);
    }
  }, []);

  // Calculate unbilled amount (VMs running cost)
  const fetchUnbilledAmount = useCallback(async () => {
    try {
      const response = await api.get("/vms/running-cost");
      setUnbilledAmount(response.data.total || 0);
    } catch (err) {
      console.error("Failed to fetch unbilled amount:", err);
    }
  }, []);

  // Fetch next invoice date
  const fetchNextInvoiceDate = useCallback(async () => {
    try {
      const response = await api.get("/invoices/next");
      setNextInvoiceDate(response.data.next_date || getNextMonthDate());
    } catch (err) {
      // Fallback: calculate next month's date
      setNextInvoiceDate(getNextMonthDate());
    }
  }, []);

  const getNextMonthDate = () => {
    const date = new Date();
    date.setMonth(date.getMonth() + 1);
    date.setDate(1);
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  useEffect(() => {
    const fetchAll = async () => {
      setIsLoading(true);
      setError(null);
      await Promise.all([
        fetchWalletBalance(),
        fetchUnbilledAmount(),
        fetchNextInvoiceDate(),
      ]);
      setIsLoading(false);
    };
    fetchAll();
  }, [fetchWalletBalance, fetchUnbilledAmount, fetchNextInvoiceDate]);

  // Handle Razorpay payment
  const handleAddFunds = async () => {
    if (addFundsAmount < 100) {
      setPaymentStatus({ type: "error", message: "Minimum amount is ₹100" });
      setTimeout(() => setPaymentStatus(null), 3000);
      return;
    }

    setIsProcessing(true);
    setPaymentStatus(null);

    try {
      const orderResponse = await api.post("/payment/create-order", {
        amount: addFundsAmount,
        currency: "INR",
      });

      const { order, key_id } = orderResponse.data;

      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      document.body.appendChild(script);

      script.onload = () => {
        const options = {
          key: key_id,
          amount: order.amount,
          currency: order.currency,
          name: "eBliss Cloud",
          description: `Add ₹${addFundsAmount} to wallet`,
          order_id: order.id,
          handler: async (response: any) => {
            try {
              const verifyResponse = await api.post("/payment/verify", {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              });

              if (verifyResponse.data.success) {
                setPaymentStatus({ type: "success", message: "Funds added successfully!" });
                fetchWalletBalance();
                setShowAddFundsModal(false);
                setAddFundsAmount(500);
              }
            } catch (err: any) {
              setPaymentStatus({ type: "error", message: err.response?.data?.message || "Payment verification failed" });
            } finally {
              setIsProcessing(false);
            }
          },
          theme: {
            color: "#4f46e5",
          },
          modal: {
            ondismiss: () => {
              setIsProcessing(false);
            },
          },
        };

        const razorpay = new (window as any).Razorpay(options);
        razorpay.open();
      };

      script.onerror = () => {
        setPaymentStatus({ type: "error", message: "Failed to load payment gateway" });
        setIsProcessing(false);
      };
    } catch (err: any) {
      setPaymentStatus({ type: "error", message: err.response?.data?.message || "Failed to create payment order" });
      setIsProcessing(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen bg-[#0A0E27]">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Topbar />
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Loader2 className="w-12 h-12 text-indigo-400 animate-spin mx-auto mb-4" />
              <p className="text-slate-400">Loading billing information...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#0A0E27]">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Topbar />
        
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-[1200px] mx-auto p-6 lg:p-8">
            {/* Header */}
            <div className="relative mb-8">
              <div className="relative bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm border border-slate-700/50 rounded-3xl p-8 overflow-hidden">
                <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 rounded-full blur-3xl" />
                <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-emerald-500/5 to-cyan-500/5 rounded-full blur-3xl" />
                
                <div className="relative">
         
                  <h1 className="text-3xl lg:text-4xl font-bold text-white mb-2">
                    Billing & Payments
                  </h1>
                  <p className="text-slate-400 text-base max-w-2xl">
                    Manage your balance, upcoming invoices and payment methods
                  </p>
                </div>
              </div>
            </div>

            {/* Payment Status Message */}
            <AnimatePresence>
              {paymentStatus && (
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className={`mb-6 p-4 rounded-xl flex items-center gap-3 ${
                    paymentStatus.type === "success"
                      ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400"
                      : "bg-red-500/10 border border-red-500/30 text-red-400"
                  }`}
                >
                  {paymentStatus.type === "success" ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                  <span className="text-sm flex-1">{paymentStatus.message}</span>
                  <button onClick={() => setPaymentStatus(null)} className="hover:opacity-70">✕</button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Balance Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 hover:border-slate-600/50 transition-all duration-300"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="p-2 bg-emerald-500/10 rounded-xl">
                    <Wallet className="w-6 h-6 text-emerald-400" />
                  </div>
                </div>
                <p className="text-slate-400 text-sm mb-1">Available Balance</p>
                <p className="text-3xl font-bold text-white">{formatCurrency(balance.balance)}</p>
                <p className="text-xs text-slate-500 mt-2">Funds available</p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
                className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 hover:border-slate-600/50 transition-all duration-300"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="p-2 bg-amber-500/10 rounded-xl">
                    <TrendingUp className="w-6 h-6 text-amber-400" />
                  </div>
                </div>
                <p className="text-slate-400 text-sm mb-1">Unbilled Amount</p>
                <p className="text-3xl font-bold text-white">{formatCurrency(unbilledAmount)}</p>
                <p className="text-xs text-slate-500 mt-2">Pending charges</p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 hover:border-slate-600/50 transition-all duration-300"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="p-2 bg-blue-500/10 rounded-xl">
                    <Calendar className="w-6 h-6 text-blue-400" />
                  </div>
                </div>
                <p className="text-slate-400 text-sm mb-1">Next Invoice</p>
                <p className="text-2xl font-bold text-white">{nextInvoiceDate}</p>
                <p className="text-xs text-slate-500 mt-2">Estimated billing date</p>
              </motion.div>
            </div>

            {/* Add Funds Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-8"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                  <Plus className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-white">Add Funds</h2>
                  <p className="text-sm text-slate-400">Top up your account balance</p>
                </div>
              </div>

              <div className="max-w-md">
                <div className="mb-6">
                  <label className="block text-slate-300 text-sm font-medium mb-2">Amount (₹)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">₹</span>
                    <input
                      type="number"
                      value={addFundsAmount}
                      onChange={(e) => setAddFundsAmount(parseInt(e.target.value) || 0)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-8 pr-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                      placeholder="Enter amount"
                      min="100"
                    />
                  </div>
                  <div className="flex gap-3 mt-3">
                    {[500, 1000, 2000, 5000].map((amt) => (
                      <button
                        key={amt}
                        onClick={() => setAddFundsAmount(amt)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                          addFundsAmount === amt
                            ? "bg-indigo-600 text-white"
                            : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                        }`}
                      >
                        ₹{amt}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-slate-500 mt-2">Minimum amount: ₹100</p>
                </div>

                <div className="mb-6">
                  <label className="block text-slate-300 text-sm font-medium mb-2">Payment Method</label>
                  <div className="bg-slate-900 border border-slate-700 rounded-xl p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                        <CreditCard className="w-5 h-5 text-indigo-400" />
                      </div>
                      <div>
                        <p className="text-white font-medium">RazorPay</p>
                        <p className="text-xs text-slate-500">UPI/Cards/NetBanking</p>
                      </div>
                    </div>
                    <CheckCircle className="w-5 h-5 text-emerald-400" />
                  </div>
                </div>

                <button
                  onClick={() => setShowAddFundsModal(true)}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-medium transition-all duration-300 flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20"
                >
                  <Plus className="w-4 h-4" />
                  Add Funds
                </button>
              </div>
            </motion.div>

            {/* Security Note */}
            <div className="mt-8 flex items-center justify-between text-xs text-slate-500">
              <div className="flex items-center gap-2">
                <Shield className="w-3 h-3" />
                <span>Secure payments processed via Razorpay</span>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="w-3 h-3" />
                <span>Pay as you go • No commitment</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add Funds Modal */}
      <AnimatePresence>
        {showAddFundsModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
           <motion.div
  initial={{ scale: 0.95, opacity: 0 }}
  animate={{ scale: 1, opacity: 1 }}
  exit={{ scale: 0.95, opacity: 0 }}
  className="
    bg-gradient-to-br from-slate-800 to-slate-900
    border border-slate-700
    rounded-2xl
    w-full
    max-w-2xl
    min-h-[420px]
    max-h-[85vh]
    overflow-y-auto
    p-8
  "
>
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-indigo-500/10 rounded-xl">
                  <Plus className="w-5 h-5 text-indigo-400" />
                </div>
                <h2 className="text-xl font-bold text-white">Confirm Add Funds</h2>
              </div>
              
              <p className="text-slate-400 text-sm mb-4">
                Current Balance: <span className="text-white font-semibold">{formatCurrency(balance.balance)}</span>
              </p>
              
              <div className="bg-slate-800/50 rounded-xl p-4 mb-6">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Amount to add</span>
                  <span className="text-2xl font-bold text-white">{formatCurrency(addFundsAmount)}</span>
                </div>
                <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-700">
                  <span className="text-slate-400">Payment Method</span>
                  <span className="text-white">Razorpay (UPI/Cards/NetBanking)</span>
                </div>
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={() => setShowAddFundsModal(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-medium transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddFunds}
                  disabled={isProcessing}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-medium transition flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Wallet className="w-4 h-4" />
                      Confirm & Pay
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}