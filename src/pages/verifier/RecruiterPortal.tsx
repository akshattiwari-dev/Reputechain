import React, { useState } from "react";
import { API_BASE } from "../../lib/api";
import { motion, AnimatePresence } from "motion/react";
import { Search, ShieldCheck, ShieldAlert, Loader2, Users, Briefcase } from "lucide-react";
import { cn } from "../../lib/utils";

export function RecruiterPortal() {
  const [searchInput, setSearchInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchInput.trim()) return;
    
    setLoading(true);
    setResult(null);
    
    try {
      const res = await fetch(`${API_BASE}/api/verify/${searchInput}`);
      const data = await res.json();
      setResult(data);
    } catch (err) {
      setResult({ verified: false, error: "Network error occurred." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full flex-1 flex flex-col pt-32 pb-24 px-6 md:px-12 max-w-4xl mx-auto">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-12"
      >
        <span className="font-script text-accent text-2xl mb-2 block">For Employers</span>
        <h1 className="text-4xl md:text-5xl font-serif font-bold mb-4">Background Checks, Simplified.</h1>
        <p className="text-zinc-400">Instantly verify candidate credentials. No crypto knowledge required.</p>
      </motion.div>

      <motion.form 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
        onSubmit={handleSearch}
        className="relative mb-12"
      >
        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
          <Search className="w-5 h-5 text-zinc-500" />
        </div>
        <input 
          type="text"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Enter Candidate's Credential ID or Hash"
          className="w-full bg-zinc-900 border border-white/10 rounded-2xl py-5 pl-12 pr-32 text-lg focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all font-sans"
        />
        <button 
          type="submit"
          disabled={loading || !searchInput.trim()}
          className="absolute inset-y-2 right-2 bg-accent text-background px-6 rounded-xl font-semibold hover:bg-accent-hover transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Check Status"}
        </button>
      </motion.form>

      <AnimatePresence mode="wait">
        {result && (
          <motion.div
            key={result.verified ? "success" : "error"}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={cn(
              "p-8 rounded-3xl border relative overflow-hidden",
              result.verified && !result.data?.revoked ? "bg-accent/5 border-accent/20" : "bg-red-500/5 border-red-500/20"
            )}
          >
            <div className="flex items-center gap-6 mb-8">
              <div className={cn(
                "p-4 rounded-2xl",
                result.verified && !result.data?.revoked ? "bg-accent/10 text-accent" : "bg-red-500/10 text-red-500"
              )}>
                {result.verified && !result.data?.revoked ? <ShieldCheck className="w-10 h-10" /> : <ShieldAlert className="w-10 h-10" />}
              </div>
              <div>
                <h2 className="text-2xl font-serif font-bold mb-1">
                  {result.verified && !result.data?.revoked ? "Valid Credential" : "Invalid Credential"}
                </h2>
                <p className={cn(
                  "text-sm font-medium",
                  result.verified && !result.data?.revoked ? "text-accent" : "text-red-400"
                )}>
                  {result.verified 
                    ? (result.data?.revoked ? "This credential was revoked by the issuing institution." : "This credential is authentic and active.")
                    : (result.error || "We couldn't find this credential in our database.")}
                </p>
              </div>
            </div>

            {result.verified && result.data && !result.data.revoked && (
              <div className="grid md:grid-cols-2 gap-6 bg-zinc-950/50 rounded-2xl p-6 border border-white/5">
                <div className="flex items-start gap-4">
                  <Users className="w-6 h-6 text-zinc-500 shrink-0" />
                  <div>
                    <span className="text-xs text-zinc-500 uppercase font-medium tracking-wider block mb-1">Candidate Name</span>
                    <p className="font-semibold text-lg">{result.data.recipientName || "N/A"}</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <Briefcase className="w-6 h-6 text-zinc-500 shrink-0" />
                  <div>
                    <span className="text-xs text-zinc-500 uppercase font-medium tracking-wider block mb-1">Qualification</span>
                    <p className="font-semibold text-lg">{result.data.courseName || "N/A"}</p>
                  </div>
                </div>
                <div className="md:col-span-2 pt-4 border-t border-white/5 flex justify-between items-center">
                  <div>
                    <span className="text-xs text-zinc-500 uppercase font-medium tracking-wider block mb-1">Issuing Institution</span>
                    <p className="font-medium text-zinc-300">{result.data.issuerName || "Verified Institution"}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-zinc-500 uppercase font-medium tracking-wider block mb-1">Issue Date</span>
                    <p className="font-medium text-zinc-300">{new Date(result.data.issuedAt).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
