
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useWallet } from "../../contexts/WalletContext";
import { 
  ShieldCheck, 
  GitBranch as Github, 
  FileText, 
  CreditCard, 
  Briefcase, 
  Upload, 
  Loader2, 
  CheckCircle2, 
  Award,
  Fingerprint,
  X,
  Copy,
  Check,
  ExternalLink,
  AlertTriangle
} from "lucide-react";
import { cn } from "../../lib/utils";
 
type VerificationStatus = "idle" | "verifying" | "success" | "error";
 
interface Badge {
  id: string;
  name: string;
  category: "Identity" | "Github" | "Work" | "Academic";
  icon: React.ElementType;
  date: string;
  txHash?: string;
}
 
interface VerifyResultData {
  hash: string;
  maskedId?: string;
  verificationMethod?: "format" | "qr_signature";
  boost?: number;
}
 
export function ProfilePage() {
  const { address, token, connect } = useWallet();
  const [reputationScore, setReputationScore] = useState(150); // Starting score
  const [badges, setBadges] = useState<Badge[]>([]);
 
  // States for modals
  const [activeModal, setActiveModal] = useState<"aadhaar" | "gov" | "github" | "work" | null>(null);
  
  const [verifyStatus, setVerifyStatus] = useState<VerificationStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [verifyResult, setVerifyResult] = useState<VerifyResultData | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [idNumber, setIdNumber] = useState("");
  const [govIdType, setGovIdType] = useState("pan");
 
  // Load profile score and badges
  React.useEffect(() => {
    if (!token) return;
    
    fetch('/api/profile', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(d => {
        if (d.score) setReputationScore(d.score);
      })
      .catch(console.error);
 
    fetch('/api/my-badges', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(d => {
        if (d.badges) {
          const loadedBadges = d.badges.map((b: any) => {
            let icon = Award;
            let name = b.recipientName;
            if (b.courseName === 'aadhaar') { icon = Fingerprint; name = "Aadhaar Verified"; }
            else if (b.courseName === 'gov') { icon = CreditCard; name = "Gov ID Verified"; }
            else if (b.courseName === 'github') { icon = Github; name = "GitHub Developer"; }
            else if (b.courseName === 'work') { icon = Briefcase; name = "Work Experience"; }
            
            return {
              id: b.hash,
              name: name,
              category: "Identity",
              icon: icon,
              date: new Date(b.issuedAt).toLocaleDateString("en-US", { year: 'numeric', month: 'short', day: 'numeric' })
            };
          });
          setBadges(loadedBadges);
        }
      })
      .catch(console.error);
  }, [token]);
 
  const closeModal = () => {
    setActiveModal(null);
    setVerifyStatus("idle");
    setErrorMessage(null);
    setVerifyResult(null);
    setFile(null);
    setIdNumber("");
  };
 
  const handleVerify = async (type: "aadhaar" | "gov" | "github" | "work") => {
    setVerifyStatus("verifying");
    setErrorMessage(null);
 
    try {
      let res: Response;
 
      // Aadhaar has two real paths now: manual masked number (weak, format-only
      // check) or the QR image extracted from the e-Aadhaar (strong, UIDAI
      // signature verified). No more "mock-id" fallback — a real value is required.
      if (type === "aadhaar" && file) {
        const formData = new FormData();
        formData.append("qrImage", file);
        res = await fetch('/api/verify-identity/aadhaar-qr', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });
      } else {
        if (type !== "github" && !idNumber.trim()) {
          throw new Error("Please enter a value before verifying.");
        }
        res = await fetch('/api/verify-identity', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ type, idNumber }),
        });
      }
 
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Verification failed.");
      if (!data.hash) throw new Error("Server did not return a certificate hash.");
 
      let newBadge: Badge;
      const today = new Date().toLocaleDateString("en-US", { year: 'numeric', month: 'short', day: 'numeric' });
 
      switch (type) {
        case "aadhaar":
          newBadge = { id: data.hash, name: "Aadhaar Verified", category: "Identity", icon: Fingerprint, date: today, txHash: data.txHash };
          break;
        case "gov":
          newBadge = { id: data.hash, name: govIdType.toUpperCase() + " Verified", category: "Identity", icon: CreditCard, date: today, txHash: data.txHash };
          break;
        case "github":
          newBadge = { id: data.hash, name: "GitHub Developer", category: "Github", icon: Github, date: today, txHash: data.txHash };
          break;
        case "work":
          newBadge = { id: data.hash, name: "Work Experience", category: "Work", icon: Briefcase, date: today, txHash: data.txHash };
          break;
      }
 
      setBadges(prev => [newBadge, ...prev]);
      if (data.boost) setReputationScore(prev => prev + data.boost);
 
      setVerifyResult({
        hash: data.hash,
        maskedId: data.maskedId,
        verificationMethod: data.verificationMethod,
        boost: data.boost,
      });
      setVerifyStatus("success");
      // No auto-close: the user needs time to copy/see the certificate hash.
    } catch (e: any) {
      console.error(e);
      setErrorMessage(e.message || "Something went wrong. Please try again.");
      setVerifyStatus("error");
    }
  };
 
  if (!address) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center pt-32 pb-24 px-6 bg-zinc-50">
        <ShieldCheck className="w-16 h-16 text-[#00a859] mb-6" />
        <h1 className="text-3xl font-serif font-bold mb-4 text-black">Connect your wallet</h1>
        <p className="text-zinc-500 mb-8 max-w-md text-center">You need to connect your wallet to access your profile, view your reputation score, and manage your verifications.</p>
        <button 
          onClick={connect}
          className="bg-[#00a859] text-white px-8 py-3 rounded-full font-bold hover:bg-[#008f4c] transition-colors"
        >
          Connect Wallet
        </button>
      </div>
    );
  }
 
  return (
    <div className="flex-1 w-full bg-zinc-50 pt-24 pb-20">
      <div className="max-w-[1400px] mx-auto px-6 md:px-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          
          {/* LEFT: Profile Overview */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white border border-gray-200 rounded-3xl p-8 shadow-sm">
              <div className="w-20 h-20 bg-gradient-to-br from-[#00a859] to-[#00529b] rounded-full flex items-center justify-center text-white text-2xl font-bold mb-6 shadow-inner">
                {address.substring(2, 4).toUpperCase()}
              </div>
              <h2 className="text-2xl font-bold text-black mb-1 font-serif">Your Profile</h2>
              <p className="text-zinc-500 font-mono text-sm break-all mb-8 bg-zinc-100 p-3 rounded-xl border border-zinc-200">
                {address}
              </p>
 
              <div className="pt-6 border-t border-gray-100">
                <p className="text-sm font-bold text-zinc-500 uppercase tracking-wider mb-2">Reputation Score</p>
                <div className="flex items-end gap-3">
                  <span className="text-5xl font-black text-[#00a859] tracking-tighter">{reputationScore}</span>
                  <span className="text-zinc-400 mb-1 font-medium">pts</span>
                </div>
              </div>
            </div>
 
            {/* Badges Display */}
            <div className="bg-white border border-gray-200 rounded-3xl p-8 shadow-sm">
              <h3 className="text-lg font-bold text-black mb-6 flex items-center gap-2">
                <Award className="w-5 h-5 text-[#f6a01a]" />
                Your Badges
              </h3>
              
              {badges.length === 0 ? (
                <div className="text-center py-8 bg-zinc-50 rounded-2xl border border-zinc-100 border-dashed">
                  <p className="text-zinc-400 text-sm font-medium">No badges yet.</p>
                  <p className="text-zinc-400 text-xs mt-1">Complete verifications to earn them!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {badges.map(badge => (
                    <motion.div 
                      key={badge.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center gap-4 p-4 rounded-2xl bg-zinc-50 border border-zinc-100"
                    >
                      <div className="w-10 h-10 rounded-full bg-white shadow-sm border border-zinc-200 flex items-center justify-center shrink-0">
                        <badge.icon className="w-5 h-5 text-[#00a859]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-sm text-black truncate">{badge.name}</h4>
                        <p className="text-xs text-zinc-500">{badge.date} • {badge.category}</p>
                      </div>
                      <a
                        href={`/verify/${badge.id}`}
                        title="View on public verification page"
                        className="shrink-0"
                      >
                        <CheckCircle2 className="w-5 h-5 text-[#00a859] hover:text-[#008f4c] transition-colors" />
                      </a>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </div>
 
          {/* RIGHT: Verifications */}
          <div className="lg:col-span-8">
            <h2 className="text-3xl font-serif font-bold text-black mb-8">Add Verifications</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <VerificationCard 
                title="Aadhaar Verification"
                description="Verify your identity with India's national ID. Enter a masked number or upload the QR from your e-Aadhaar for a stronger, signature-verified badge."
                icon={Fingerprint}
                color="bg-blue-50 text-blue-600"
                boost="+50 pts"
                onClick={() => setActiveModal("aadhaar")}
                completed={badges.some(b => b.name === "Aadhaar Verified")}
              />
 
              <VerificationCard 
                title="Other Government IDs"
                description="Verify PAN, Driving License, or Passport to strengthen your identity profile."
                icon={CreditCard}
                color="bg-emerald-50 text-emerald-600"
                boost="+30 pts"
                onClick={() => setActiveModal("gov")}
              />
 
              <VerificationCard 
                title="GitHub Attestation"
                description="Link your GitHub account to prove your developer experience and contributions."
                icon={Github}
                color="bg-purple-50 text-purple-600"
                boost="+80 pts"
                onClick={() => setActiveModal("github")}
                completed={badges.some(b => b.name === "GitHub Developer")}
              />
 
              <VerificationCard 
                title="Work Experience"
                description="Upload employment certificates or get signed attestations from verified employers."
                icon={Briefcase}
                color="bg-orange-50 text-orange-600"
                boost="+40 pts"
                onClick={() => setActiveModal("work")}
              />
            </div>
          </div>
        </div>
      </div>
 
      {/* Modal Overlay */}
      <AnimatePresence>
        {activeModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/40 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-zinc-50/50">
                <h3 className="text-xl font-bold text-black font-serif">
                  {activeModal === "aadhaar" && "Verify Aadhaar"}
                  {activeModal === "gov" && "Verify Government ID"}
                  {activeModal === "github" && "Link GitHub"}
                  {activeModal === "work" && "Verify Experience"}
                </h3>
                <button 
                  onClick={() => {
                    if (verifyStatus !== "verifying") closeModal();
                  }}
                  className="text-zinc-400 hover:text-black transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
 
              <div className="p-8">
                {verifyStatus === "success" && verifyResult ? (
                  <SuccessView result={verifyResult} onDone={closeModal} />
                ) : (
                  <div className="space-y-6">
                    {errorMessage && (
                      <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
                        <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                        <span>{errorMessage}</span>
                      </div>
                    )}
 
                    {activeModal === "aadhaar" && (
                      <>
                        <div>
                          <label className="block text-sm font-bold text-zinc-700 mb-2">Aadhaar Number (Masked/Virtual)</label>
                          <input 
                            type="text"
                            placeholder="XXXX-XXXX-XXXX"
                            value={idNumber}
                            onChange={(e) => { setIdNumber(e.target.value); setFile(null); }}
                            className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-black placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#00a859] focus:border-transparent transition-all"
                          />
                          <p className="text-xs text-zinc-400 mt-1.5">Format-checked only. For a stronger, UIDAI-signature-verified badge, use the QR upload below instead.</p>
                        </div>
                        <div className="text-center text-sm font-bold text-zinc-400">OR</div>
                        <FileUpload
                          file={file}
                          setFile={(f) => { setFile(f); if (f) setIdNumber(""); }}
                          label="Upload the QR code from your e-Aadhaar"
                          accept="image/png,image/jpeg,image/webp"
                          hint="PNG or JPG of the QR code — not the PDF itself. Unlock and extract the QR image first."
                        />
                      </>
                    )}
 
                    {activeModal === "gov" && (
                      <>
                        <div>
                          <label className="block text-sm font-bold text-zinc-700 mb-2">ID Type</label>
                          <select 
                            value={govIdType}
                            onChange={(e) => setGovIdType(e.target.value)}
                            className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-black focus:outline-none focus:ring-2 focus:ring-[#00a859] transition-all"
                          >
                            <option value="pan">PAN Card</option>
                            <option value="driving">Driving License</option>
                            <option value="passport">Passport</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-bold text-zinc-700 mb-2">Document Number</label>
                          <input 
                            type="text"
                            placeholder="Enter number"
                            value={idNumber}
                            onChange={(e) => setIdNumber(e.target.value)}
                            className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-black placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#00a859] transition-all"
                          />
                        </div>
                        <FileUpload file={file} setFile={setFile} label="Upload Document Front" />
                      </>
                    )}
 
                    {activeModal === "github" && (
                      <div className="text-center py-6">
                        <div className="w-16 h-16 bg-zinc-100 rounded-full flex items-center justify-center mx-auto mb-6">
                          <Github className="w-8 h-8 text-black" />
                        </div>
                        <p className="text-zinc-600 mb-6 max-w-sm mx-auto">
                          We will redirect you to GitHub to authorize ReputeChain to read your public repositories and contribution graph.
                        </p>
                      </div>
                    )}
 
                    {activeModal === "work" && (
                      <>
                        <div>
                          <label className="block text-sm font-bold text-zinc-700 mb-2">Company Name</label>
                          <input 
                            type="text"
                            placeholder="e.g. Acme Corp"
                            value={idNumber}
                            onChange={(e) => setIdNumber(e.target.value)}
                            className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-black placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#00a859] transition-all"
                          />
                        </div>
                        <FileUpload file={file} setFile={setFile} label="Upload Experience Letter PDF" />
                      </>
                    )}
 
                    <button
                      onClick={() => handleVerify(activeModal)}
                      disabled={verifyStatus === "verifying" || (activeModal !== "github" && !idNumber && !file)}
                      className="w-full bg-[#00a859] text-white py-4 rounded-xl font-bold hover:bg-[#008f4c] transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed mt-4"
                    >
                      {verifyStatus === "verifying" ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Minting Proof on-chain...
                        </>
                      ) : (
                        activeModal === "github" ? "Connect GitHub" : "Verify & Mint Badge"
                      )}
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
 
function SuccessView({ result, onDone }: { result: VerifyResultData; onDone: () => void }) {
  const [copied, setCopied] = useState(false);
  const isStrong = result.verificationMethod === "qr_signature";
 
  const handleCopy = async () => {
    await navigator.clipboard.writeText(result.hash);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
 
  return (
    <div className="py-2">
      <div className="text-center mb-6">
        <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="w-10 h-10 text-green-500" />
        </div>
        <h4 className="text-2xl font-bold text-black mb-2">Verification Successful!</h4>
        <p className="text-zinc-500">
          Your badge has been minted on ReputeChain.
          {isStrong && <span className="block text-sm text-[#00a859] font-semibold mt-1">UIDAI digital signature verified</span>}
        </p>
      </div>
 
      {result.maskedId && (
        <p className="text-center text-sm text-zinc-500 mb-4">
          Linked to Aadhaar <span className="font-mono font-medium text-black">{result.maskedId}</span>
          {typeof result.boost === "number" && <> · +{result.boost} reputation</>}
        </p>
      )}
 
      <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-4 mb-4">
        <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Certificate Hash</label>
        <div className="mt-2 flex items-center gap-2">
          <code className="flex-1 truncate rounded-lg bg-white border border-zinc-200 px-3 py-2 text-xs font-mono text-zinc-700">
            {result.hash}
          </code>
          <button
            type="button"
            onClick={handleCopy}
            className="shrink-0 rounded-lg p-2 bg-white border border-zinc-200 hover:bg-zinc-100 transition-colors"
            aria-label="Copy certificate hash"
          >
            {copied ? <Check className="w-4 h-4 text-[#00a859]" /> : <Copy className="w-4 h-4 text-zinc-500" />}
          </button>
        </div>
        <a
          href={`/verify/${result.hash}`}
          className="inline-flex items-center gap-1.5 text-sm text-[#00a859] hover:underline mt-3"
        >
          View on the public verification page
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>
 
      <button
        onClick={onDone}
        className="w-full bg-white border border-zinc-200 text-black py-3 rounded-xl font-bold hover:bg-zinc-50 transition-colors"
      >
        Done
      </button>
    </div>
  );
}
 
function VerificationCard({ 
  title, 
  description, 
  icon: Icon, 
  color, 
  boost, 
  onClick,
  completed
}: { 
  title: string; 
  description: string; 
  icon: any; 
  color: string;
  boost: string;
  onClick: () => void;
  completed?: boolean;
}) {
  return (
    <div className="bg-white border border-gray-200 p-6 rounded-3xl hover:shadow-lg transition-all flex flex-col group relative overflow-hidden">
      {completed && (
        <div className="absolute top-4 right-4 bg-green-50 text-green-600 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1 border border-green-200">
          <CheckCircle2 className="w-3 h-3" />
          Verified
        </div>
      )}
      <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center mb-6", color)}>
        <Icon className="w-6 h-6" />
      </div>
      <h3 className="text-lg font-bold text-black mb-2">{title}</h3>
      <p className="text-zinc-500 text-sm mb-8 flex-1">{description}</p>
      
      <div className="flex items-center justify-between mt-auto">
        <span className="text-[#00a859] font-bold text-sm bg-green-50 px-3 py-1 rounded-lg">{boost}</span>
        <button 
          onClick={onClick}
          disabled={completed}
          className="text-sm font-bold text-black group-hover:text-[#00a859] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {completed ? "Completed" : "Start Verification →"}
        </button>
      </div>
    </div>
  );
}
 
function FileUpload({
  file,
  setFile,
  label,
  accept,
  hint,
}: {
  file: File | null;
  setFile: (f: File | null) => void;
  label: string;
  accept?: string;
  hint?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-bold text-zinc-700 mb-2">{label}</label>
      <div className="relative w-full border-2 border-dashed border-zinc-200 rounded-xl p-6 hover:border-[#00a859] transition-colors bg-zinc-50 group cursor-pointer">
        <input 
          type="file" 
          accept={accept}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          onChange={(e) => {
            if (e.target.files && e.target.files[0]) {
              setFile(e.target.files[0]);
            }
          }}
        />
        <div className="flex flex-col items-center justify-center text-center">
          <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm border border-zinc-100 mb-3 group-hover:scale-110 transition-transform">
            <Upload className="w-5 h-5 text-zinc-400 group-hover:text-[#00a859] transition-colors" />
          </div>
          {file ? (
            <div className="text-[#00a859] font-bold text-sm flex items-center gap-2">
              <FileText className="w-4 h-4" />
              {file.name}
            </div>
          ) : (
            <>
              <p className="text-sm font-bold text-zinc-700">Click to upload or drag and drop</p>
              <p className="text-xs text-zinc-500 mt-1">{hint || "PDF, JPG, PNG up to 5MB"}</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
 