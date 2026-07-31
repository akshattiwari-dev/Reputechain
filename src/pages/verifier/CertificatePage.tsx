import { useParams } from "react-router-dom";
import { API_BASE } from "../../lib/api";
import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { QRCodeSVG } from "qrcode.react";
import { CheckCircle2, Copy, ExternalLink, ShieldCheck, ShieldAlert } from "lucide-react";
import { cn } from "../../lib/utils";


export function CertificatePage() {
  const { id } = useParams();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (id) {
        fetch(`${API_BASE}/api/verify/${id}`)
        .then(res => res.json())
        .then(res => {
          if (res.verified) setData(res.data);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }
  }, [id]);

  if (loading) return <div className="pt-32 pb-24 text-center text-zinc-400">Loading certificate details...</div>;

  if (!data) return <div className="pt-32 pb-24 text-center text-red-400">Certificate not found.</div>;

  const url = window.location.href;

  const handleCopy = () => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const embedCode = `<iframe src="${window.location.origin}/certificate/${id}?embed=true" width="400" height="200" style="border:none;border-radius:12px;"></iframe>`;

  return (
    <div className="w-full flex-1 flex flex-col pt-32 pb-24 px-6 md:px-12 max-w-5xl mx-auto">
      <div className="grid md:grid-cols-3 gap-12">
        <div className="md:col-span-2">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-zinc-900 border border-white/10 p-10 md:p-14 rounded-3xl relative overflow-hidden"
            style={{ 
              backgroundImage: 'url("https://i.pinimg.com/originals/c6/3e/76/c63e76434797673b75c27d9b5f0c6a8c.jpg")',
              backgroundSize: 'cover',
              backgroundPosition: 'center'
            }}
          >
            <div className="absolute inset-0 bg-zinc-950/70" />

            <div className="absolute top-0 right-0 p-8 opacity-10">
              <ShieldCheck className="w-64 h-64" />
            </div>

            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-8">
                {data.revoked ? (
                  <span className="px-3 py-1 bg-red-500/10 border border-red-500/20 text-red-500 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                    <ShieldAlert className="w-4 h-4" /> Revoked
                  </span>
                ) : (
                  <span className="px-3 py-1 bg-accent/10 border border-accent/20 text-accent rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                    <ShieldCheck className="w-4 h-4" /> Verified
                  </span>
                )}
                <span className="text-zinc-500 text-sm">Issued by {data.issuerName || "Verified Institution"}</span>
              </div>

              <h1 className="text-4xl md:text-5xl font-serif font-bold mb-2">{data.courseName || "Blockchain Certification"}</h1>
              <p className="text-xl text-zinc-400 mb-12">Awarded to <strong className="text-zinc-200">{data.recipientName || "Unknown"}</strong></p>

              <div className="grid grid-cols-2 gap-8 border-t border-white/10 pt-8 mb-8">
                <div>
                  <span className="text-xs text-zinc-500 uppercase tracking-wider block mb-1">Issue Date</span>
                  <p className="font-medium text-lg text-zinc-200">{new Date(data.issuedAt).toLocaleDateString()}</p>
                </div>
                <div>
                  <span className="text-xs text-zinc-500 uppercase tracking-wider block mb-1">On-Chain Transaction</span>
                  <a href={`https://amoy.polygonscan.com/tx/${data.hash}`} target="_blank" rel="noreferrer" className="font-medium text-lg text-accent hover:underline flex items-center gap-2">
                    View <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>

              {data.metadataURI && (
                <div className="border-t border-white/10 pt-6">
                  <span className="text-xs text-zinc-500 uppercase tracking-wider block mb-2">Original Document</span>
                  <a href={data.metadataURI.replace("ipfs://", "https://ipfs.io/ipfs/")} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-sm text-zinc-300 transition-colors">
                    View on IPFS <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              )}
            </div>
          </motion.div>
        </div>

        <div className="md:col-span-1 space-y-6">
          <div className="bg-background border border-white/10 p-6 rounded-3xl text-center flex flex-col items-center">
            <span className="text-sm text-zinc-400 mb-4">Scan to Verify</span>
            <div className="bg-white p-4 rounded-2xl mb-4">
              <QRCodeSVG value={url} size={150} />
            </div>
            <button 
              onClick={handleCopy}
              className="flex items-center gap-2 text-sm text-zinc-300 hover:text-white transition-colors"
            >
              {copied ? <CheckCircle2 className="w-4 h-4 text-accent" /> : <Copy className="w-4 h-4" />}
              {copied ? "Copied Link!" : "Copy Public Link"}
            </button>
          </div>

          <div className="bg-zinc-900 border border-white/10 p-6 rounded-3xl">
            <h3 className="font-bold mb-4 flex items-center gap-2">Embed Badge</h3>
            <p className="text-xs text-zinc-400 mb-4">Add this verified credential to your portfolio or website.</p>
            <textarea 
              readOnly 
              value={embedCode}
              className="w-full h-24 bg-background border border-white/10 rounded-xl p-3 text-xs font-mono text-zinc-500 focus:outline-none resize-none"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
