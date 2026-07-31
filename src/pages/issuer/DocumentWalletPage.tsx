import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { useWallet } from "../../contexts/WalletContext";
import { Link } from "react-router-dom";
import { 
  Wallet, 
  Download, 
  ExternalLink, 
  Fingerprint, 
  CreditCard, 
  Briefcase, 
  GitBranch as Github, 
  Award,
  ShieldCheck,
  GraduationCap
} from "lucide-react";
import { API_BASE } from "../../lib/api";

export function DocumentWalletPage() {
  const { address, token, connect } = useWallet();
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }

     fetch(`${API_BASE}/api/my-badges`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(d => {
        if (d.badges) {
          setDocuments(d.badges);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [token]);

  const handleDownload = (doc: any) => {
    // Generate a simple text file representation of the verified credential
    let title = doc.courseName;
    if (doc.courseName === 'aadhaar') title = "Aadhaar Card";
    else if (doc.courseName === 'gov') title = "Government ID";
    else if (doc.courseName === 'work') title = "Work Experience";
    else if (doc.courseName === 'github') title = "GitHub Developer";

    const content = `=========================================
          REPUTECHAIN VERIFIED CREDENTIAL
=========================================

Document Type : ${title}
Recipient Name: ${doc.recipientName}
Issuer Name   : ${doc.issuerName}
Issued Date   : ${new Date(doc.issuedAt).toLocaleString()}
Network       : Polygon Amoy Testnet

-----------------------------------------
Certificate Hash (On-Chain Proof):
${doc.hash}
-----------------------------------------

This document serves as an offline representation 
of an on-chain verifiable credential. To verify 
its authenticity, search for the hash on the 
ReputeChain verification portal.
=========================================`;

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ReputeChain_${title.replace(/\s+/g, '_')}_${doc.hash.substring(0, 8)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!address) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center pt-32 pb-24 px-6 bg-zinc-50">
        <Wallet className="w-16 h-16 text-[#00a859] mb-6" />
        <h1 className="text-3xl font-serif font-bold mb-4 text-black">Connect your wallet</h1>
        <p className="text-zinc-500 mb-8 max-w-md text-center">You need to connect your wallet to access your Digital Vault of verified documents.</p>
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
    <div className="flex-1 w-full bg-zinc-50 pt-24 pb-20 min-h-screen">
      <div className="max-w-[1400px] mx-auto px-6 md:px-12">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-10 gap-4">
          <div>
            <h1 className="text-3xl font-serif font-bold text-black flex items-center gap-3">
              <Wallet className="w-8 h-8 text-[#00a859]" />
              My Digital Vault
            </h1>
            <p className="text-zinc-500 mt-2">Manage your verified identity documents, degrees, and work credentials.</p>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#00a859]"></div>
          </div>
        ) : documents.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-zinc-200">
            <ShieldCheck className="w-16 h-16 text-zinc-300 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-zinc-700 mb-2">Your vault is empty</h2>
            <p className="text-zinc-500 mb-6">You haven't verified any documents or received any degrees yet.</p>
            <Link to="/profile" className="inline-flex items-center gap-2 bg-[#00a859] text-white px-6 py-3 rounded-xl font-bold hover:bg-[#008f4c] transition-colors">
              Verify Documents
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {documents.map((doc, idx) => (
              <DocumentCard 
              key={String(doc.hash || idx)}
                doc={doc} 
                onDownload={() => handleDownload(doc)} 
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function DocumentCard({ doc, onDownload }: { doc: any, onDownload: () => void }) {
  let title = doc.courseName;
  let subtitle = "Verified Credential";
  let Icon = Award;
  let gradient = "from-zinc-100 to-zinc-50 text-zinc-800 border-zinc-200";
  let iconColor = "text-zinc-700";

  // Customize based on type
  if (doc.courseName === 'aadhaar') {
    title = "Aadhaar Card";
    subtitle = "Identity Verification";
    Icon = Fingerprint;
    gradient = "from-yellow-50 to-amber-50 text-amber-900 border-amber-200";
    iconColor = "text-amber-600";
  } else if (doc.courseName === 'gov') {
    title = "Government ID";
    subtitle = "PAN / Driving License";
    Icon = CreditCard;
    gradient = "from-blue-50 to-indigo-50 text-indigo-900 border-indigo-200";
    iconColor = "text-indigo-600";
  } else if (doc.courseName === 'github') {
    title = "GitHub Account";
    subtitle = "Developer Profile";
    Icon = Github;
    gradient = "from-gray-100 to-gray-50 text-gray-900 border-gray-300";
    iconColor = "text-gray-700";
  } else if (doc.courseName === 'work') {
    title = "Work Experience";
    subtitle = "Employment Record";
    Icon = Briefcase;
    gradient = "from-orange-50 to-red-50 text-orange-900 border-orange-200";
    iconColor = "text-orange-600";
  } else {
    // It's likely a degree or custom certificate
    title = doc.courseName;
    subtitle = doc.issuerName;
    Icon = GraduationCap;
    gradient = "from-emerald-50 to-green-50 text-green-900 border-green-200";
    iconColor = "text-green-600";
  }

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`relative overflow-hidden rounded-3xl border p-6 flex flex-col h-full shadow-sm hover:shadow-md transition-shadow bg-gradient-to-br ${gradient}`}
    >
      <div className="absolute -right-6 -top-6 opacity-10">
        <Icon className="w-32 h-32" />
      </div>

      <div className="flex items-center gap-4 mb-6 relative z-10">
        <div className={`w-12 h-12 rounded-2xl bg-white/60 backdrop-blur-sm flex items-center justify-center shadow-sm border border-white/40 ${iconColor}`}>
          <Icon className="w-6 h-6" />
        </div>
        <div>
          <h3 className="font-bold text-lg leading-tight">{title}</h3>
          <p className="text-sm opacity-80">{subtitle}</p>
        </div>
      </div>

      <div className="space-y-4 mb-8 flex-1 relative z-10">
        <div>
          <p className="text-xs opacity-60 uppercase font-bold tracking-wider mb-1">Recipient</p>
          <p className="font-medium text-sm truncate">{doc.recipientName}</p>
        </div>
        <div>
          <p className="text-xs opacity-60 uppercase font-bold tracking-wider mb-1">Issued Date</p>
          <p className="font-medium text-sm">{new Date(doc.issuedAt).toLocaleDateString()}</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-3 mt-auto relative z-10 border-t border-black/5 pt-4">
        <button 
          onClick={onDownload}
          className="flex-1 w-full flex items-center justify-center gap-2 bg-white/80 hover:bg-white text-sm font-bold py-2.5 rounded-xl transition-colors shadow-sm text-black"
        >
          <Download className="w-4 h-4" />
          Download
        </button>
        <Link 
          to={`/certificate/${doc.hash}`}
          className="flex-1 w-full flex items-center justify-center gap-2 bg-black text-white hover:bg-black/80 text-sm font-bold py-2.5 rounded-xl transition-colors shadow-sm"
        >
          <ExternalLink className="w-4 h-4" />
          Verify
        </Link>
      </div>
    </motion.div>
  );
}
