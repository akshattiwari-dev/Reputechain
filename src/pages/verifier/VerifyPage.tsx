import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { Search, ShieldCheck, ShieldAlert, Loader2, ExternalLink, QrCode } from "lucide-react";
import { cn } from "../../lib/utils";
import { Html5QrcodeScanner } from "html5-qrcode";
import { API_BASE } from "../../lib/api";

interface VerifyResult {
  verified: boolean;
  data?: {
    hash: string;
    recipientName: string;
    courseName: string;
    issuerName: string;
    issuedAt: string;
    revoked: boolean;
  };
  error?: string;
}

export function VerifyPage() {
  const { hash } = useParams();
  const navigate = useNavigate();
  const [searchInput, setSearchInput] = useState(hash || "");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [scanning, setScanning] = useState(false);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    if (hash) {
      handleSearch(hash);
    }
  }, [hash]);

  const handleSearch = async (searchHash: string) => {
    if (!searchHash.trim()) return;
    
    setLoading(true);
    setResult(null);
    setScanning(false);
    
    if (scannerRef.current) {
      scannerRef.current.clear().catch(console.error);
    }

    try {
       const res = await fetch(`${API_BASE}/api/verify/${searchHash}`);
      const data = await res.json();
      setResult(data);
    } catch (err) {
      setResult({ verified: false, error: "Network error occurred." });
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput) {
      navigate(`/verify/${searchInput}`);
    }
  };

  const startScanner = () => {
    setScanning(true);
    setResult(null);
    setTimeout(() => {
      scannerRef.current = new Html5QrcodeScanner(
        "reader",
        { fps: 10, qrbox: {width: 250, height: 250} },
        false
      );
      scannerRef.current.render(
        (decodedText) => {
          // If the QR code is a full URL, extract the ID
          let extractedHash = decodedText;
          try {
            const url = new URL(decodedText);
            const pathParts = url.pathname.split('/');
            extractedHash = pathParts[pathParts.length - 1] || decodedText;
          } catch(e) {}
          
          setSearchInput(extractedHash);
          if (scannerRef.current) scannerRef.current.clear();
          setScanning(false);
          navigate(`/verify/${extractedHash}`);
        },
        () => {}
      );
    }, 100);
  };

  return (
    <div className="w-full flex-1 flex flex-col pt-32 pb-24 px-6 md:px-12 max-w-4xl mx-auto">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-12"
      >
        <span className="font-script text-accent text-2xl mb-2 block">Public Portal</span>
        <h1 className="text-4xl md:text-5xl font-serif font-bold mb-4">Verify a Certificate</h1>
        <p className="text-zinc-400">Enter the cryptographic hash or scan the QR code to check on-chain status.</p>
      </motion.div>

      <motion.form 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
        onSubmit={onSubmit}
        className="relative mb-6"
      >
        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
          <Search className="w-5 h-5 text-zinc-500" />
        </div>
        <input 
          type="text"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="0x..."
          className="w-full bg-zinc-900 border border-white/10 rounded-2xl py-5 pl-12 pr-40 text-lg focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all font-mono"
        />
        <div className="absolute inset-y-2 right-2 flex items-center gap-2">
          <button
            type="button"
            onClick={startScanner}
            className="p-3 bg-zinc-800 text-zinc-300 rounded-xl hover:bg-zinc-700 transition-colors"
            title="Scan QR Code"
          >
            <QrCode className="w-5 h-5" />
          </button>
          <button 
            type="submit"
            disabled={loading || !searchInput.trim()}
            className="bg-accent text-background px-6 py-3 rounded-xl font-semibold hover:bg-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[100px]"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Verify"}
          </button>
        </div>
      </motion.form>

      {scanning && (
        <div className="mb-12 bg-zinc-900 border border-white/10 p-4 rounded-3xl overflow-hidden max-w-md mx-auto w-full">
          <div id="reader" className="w-full bg-black rounded-2xl overflow-hidden"></div>
          <button 
            onClick={() => {
              setScanning(false);
              if (scannerRef.current) scannerRef.current.clear();
            }}
            className="mt-4 w-full py-2 text-sm text-zinc-400 hover:text-white"
          >
            Cancel Scanning
          </button>
        </div>
      )}

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
            <div className="flex flex-col md:flex-row items-start md:items-center gap-6 mb-8">
              <div className={cn(
                "p-4 rounded-2xl",
                result.verified && !result.data?.revoked ? "bg-accent/10 text-accent" : "bg-red-500/10 text-red-500"
              )}>
                {result.verified && !result.data?.revoked ? <ShieldCheck className="w-10 h-10" /> : <ShieldAlert className="w-10 h-10" />}
              </div>
              <div>
                <h2 className="text-2xl font-serif font-bold mb-1">
                  {result.verified && !result.data?.revoked ? "Certificate Verified" : "Verification Failed"}
                </h2>
                <p className={cn(
                  "text-sm font-medium",
                  result.verified && !result.data?.revoked ? "text-accent" : "text-red-400"
                )}>
                  {result.verified 
                    ? (result.data?.revoked ? "This certificate has been revoked by the issuer." : "Anchored securely on Polygon Amoy")
                    : (result.error || "Hash not found on-chain.")}
                </p>
              </div>
            </div>

            {result.verified && result.data && (
              <div className="grid md:grid-cols-2 gap-6 bg-zinc-950/50 rounded-2xl p-6 border border-white/5">
                <div>
                  <span className="text-xs text-zinc-500 uppercase font-medium tracking-wider block mb-1">Recipient</span>
                  <p className="font-semibold text-lg">{result.data.recipientName || "N/A"}</p>
                </div>
                <div>
                  <span className="text-xs text-zinc-500 uppercase font-medium tracking-wider block mb-1">Course / Credential</span>
                  <p className="font-semibold text-lg">{result.data.courseName || "N/A"}</p>
                </div>
                <div>
                  <span className="text-xs text-zinc-500 uppercase font-medium tracking-wider block mb-1">Issuer</span>
                  <p className="font-medium text-zinc-300">{result.data.issuerName || "N/A"}</p>
                </div>
                <div>
                  <span className="text-xs text-zinc-500 uppercase font-medium tracking-wider block mb-1">Issue Date</span>
                  <p className="font-medium text-zinc-300">{new Date(result.data.issuedAt).toLocaleDateString()}</p>
                </div>
                <div className="md:col-span-2 pt-4 border-t border-white/5">
                  <span className="text-xs text-zinc-500 uppercase font-medium tracking-wider block mb-2">On-Chain Hash</span>
                  <div className="bg-background rounded-lg p-3 font-mono text-xs text-zinc-400 break-all border border-white/5 flex justify-between items-center">
                    {result.data.hash}
                    <a href={`https://amoy.polygonscan.com/tx/${result.data.hash}`} target="_blank" rel="noreferrer" className="text-accent hover:text-accent-hover ml-4 shrink-0 flex items-center gap-1">
                      View Tx <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </div>
                <div className="md:col-span-2 pt-4">
                  <button 
                    onClick={() => navigate(`/certificate/${result.data!.hash}`)}
                    className="w-full bg-white/5 border border-white/10 hover:bg-white/10 text-white py-3 rounded-xl font-medium transition-colors text-sm"
                  >
                    View Full Certificate Profile
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
