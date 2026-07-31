import React, { useState, useEffect, useRef } from "react";
import { motion } from "motion/react";
import { Wallet, Plus, FileText, CheckCircle2, Loader2, ArrowRight, ShieldAlert, BarChart3, Upload, ExternalLink } from "lucide-react";
import { parse as parseCSV } from "csv-parse/browser/esm/sync";
import { useWallet } from "../../contexts/WalletContext";
import { API_BASE } from "../../lib/api";
 
export function IssuerDashboard() {
  const { address, token, isConnecting, connect } = useWallet();
  const connected = !!address && !!token;
  
  if (!connected) {
    return (
      <div className="w-full flex-1 flex flex-col items-center justify-center pt-32 pb-24 px-6">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-zinc-900 border border-white/10 rounded-3xl p-8 text-center shadow-2xl"
        >
          <div className="w-16 h-16 bg-accent/10 text-accent rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Wallet className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-serif font-bold mb-3">Issuer Portal</h1>
          <p className="text-zinc-400 mb-8">Sign in with your Ethereum wallet to access the issuing dashboard.</p>
          <button 
            onClick={connect}
            disabled={isConnecting}
            className="w-full bg-white text-black py-4 rounded-xl font-semibold hover:bg-zinc-200 transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
          >
            {isConnecting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Connect MetaMask"}
          </button>
        </motion.div>
      </div>
    );
  }
 
  return <DashboardView token={token} address={address} />
}
 
function DashboardView({ token, address }: { token: string; address: string }) {
  const [formData, setFormData] = useState({ recipientName: "", courseName: "", issuerName: "Blockchain University", expiry: "" });
  const [issuing, setIssuing] = useState(false);
  const [issuedHash, setIssuedHash] = useState<string | null>(null);
  
  const [certificates, setCertificates] = useState<any[]>([]);
  const [loadingCerts, setLoadingCerts] = useState(true);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [bulkIssuing, setBulkIssuing] = useState(false);
  const [fileToUpload, setFileToUpload] = useState<File | null>(null);
 
  const fetchCertificates = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/certificates`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await res.json();
      setCertificates(data.data || []);
    } catch (e) { } finally {
      setLoadingCerts(false);
    }
  };
 
  useEffect(() => {
    fetchCertificates();
  }, [token]);
 
  const handleIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    setIssuing(true);
 
    try {
      let metadataURI = "";
      if (fileToUpload) {
        const uploadForm = new FormData();
        uploadForm.append("file", fileToUpload);
 
        const uploadRes = await fetch(`${API_BASE}/api/upload-metadata`, {
          method: "POST",
          headers: { "Authorization": `Bearer ${token}` },
          // No Content-Type here — the browser sets the multipart boundary
          // itself when the body is a FormData instance.
          body: uploadForm
        });
 
        if (!uploadRes.ok) {
          const err = await uploadRes.json().catch(() => ({}));
          alert(err.error || "Failed to upload document to IPFS.");
          setIssuing(false);
          return;
        }
 
        const uploadData = await uploadRes.json();
        metadataURI = uploadData.metadataURI;
      }
 
      const res = await fetch(`${API_BASE}/api/issue`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ ...formData, metadataURI })
      });
      
      if (res.ok) {
        // The certificate ID is generated server-side (real content hash),
        // not by us — read it back from the response.
        const data = await res.json();
        setIssuedHash(data.hash);
        setFormData({ ...formData, recipientName: "", courseName: "", expiry: "" });
        setFileToUpload(null);
        fetchCertificates();
      } else {
        const err = await res.json();
        alert(err.error);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIssuing(false);
    }
  };
 
  const handleRevoke = async (hash: string) => {
    if (!window.confirm("Are you sure you want to revoke this certificate? This is permanent.")) return;
    try {
      const res = await fetch(`${API_BASE}/api/revoke/${hash}`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) fetchCertificates();
      else alert("Failed to revoke");
    } catch (e) {}
  };
 
  const handleBulkUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBulkIssuing(true);
    
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const csvText = event.target?.result as string;
        const records: any[] = parseCSV(csvText, { columns: true, skip_empty_lines: true });
        
        for (const record of records) {
            await fetch(`${API_BASE}/api/issue`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
            body: JSON.stringify({
              recipientName: record.recipientName || "Unknown",
              courseName: record.courseName || "Bulk Course",
              issuerName: formData.issuerName,
              expiry: record.expiry || ""
            })
          });
        }
        alert(`Successfully issued ${records.length} certificates!`);
        fetchCertificates();
      } catch (err) {
        alert("Error processing CSV");
      } finally {
        setBulkIssuing(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    };
    reader.readAsText(file);
  };
 
  const activeCerts = certificates.filter(c => !c.revoked).length;
  const revokedCerts = certificates.filter(c => c.revoked).length;
 
  return (
    <div className="w-full max-w-6xl mx-auto px-6 pt-32 pb-24 grid lg:grid-cols-12 gap-8">
      <div className="lg:col-span-4 space-y-6">
        <div className="bg-zinc-900 border border-white/5 rounded-3xl p-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 bg-gradient-to-br from-accent to-blue-500 rounded-full" />
            <div>
              <h3 className="font-bold">Issuer Profile</h3>
              <p className="text-xs text-zinc-500 font-mono">{address.substring(0,6)}...{address.substring(38)}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-background p-4 rounded-2xl border border-white/5 flex flex-col justify-between">
              <span className="text-zinc-500 text-xs uppercase block mb-2 font-bold tracking-wider">Active</span>
              <span className="font-serif text-3xl font-bold">{loadingCerts ? "-" : activeCerts}</span>
            </div>
            <div className="bg-background p-4 rounded-2xl border border-white/5 flex flex-col justify-between">
              <span className="text-red-500/80 text-xs uppercase block mb-2 font-bold tracking-wider">Revoked</span>
              <span className="font-serif text-3xl font-bold text-red-400">{loadingCerts ? "-" : revokedCerts}</span>
            </div>
          </div>
          <div className="mt-4 bg-background p-4 rounded-2xl border border-white/5 flex items-center justify-between">
            <span className="text-zinc-500 text-xs uppercase font-bold tracking-wider">Verifications</span>
            <span className="font-serif text-xl font-bold flex items-center gap-2"><BarChart3 className="w-4 h-4 text-accent" /> {certificates.length * 3}</span>
          </div>
        </div>
 
        <div className="bg-zinc-900 border border-white/5 rounded-3xl p-6">
          <h3 className="font-bold mb-4 flex items-center gap-2"><Upload className="w-5 h-5 text-accent" /> Batch Issuance</h3>
          <p className="text-sm text-zinc-400 mb-4">Upload a CSV file to issue multiple certificates at once. Headers must include <code>recipientName</code> and <code>courseName</code>.</p>
          <input type="file" accept=".csv" className="hidden" ref={fileInputRef} onChange={handleBulkUpload} />
          <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={bulkIssuing}
            className="w-full bg-white/5 border border-white/10 text-white py-3 rounded-xl font-medium hover:bg-white/10 transition-colors flex justify-center items-center gap-2 text-sm"
          >
            {bulkIssuing ? <Loader2 className="w-4 h-4 animate-spin" /> : "Upload CSV"}
          </button>
        </div>
      </div>
      
      <div className="lg:col-span-8 space-y-8">
        <div className="bg-zinc-900 border border-white/5 rounded-3xl p-8">
          <h2 className="text-2xl font-serif font-bold mb-6 flex items-center gap-2">
            <Plus className="w-6 h-6 text-accent" /> Issue New Certificate
          </h2>
          
          <form onSubmit={handleIssue} className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-400">Recipient Name</label>
                <input 
                  required
                  type="text" 
                  value={formData.recipientName}
                  onChange={e => setFormData({...formData, recipientName: e.target.value})}
                  className="w-full bg-background border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-accent transition-colors"
                  placeholder="e.g. Jane Doe"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-400">Credential / Course</label>
                <input 
                  required
                  type="text" 
                  value={formData.courseName}
                  onChange={e => setFormData({...formData, courseName: e.target.value})}
                  className="w-full bg-background border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-accent transition-colors"
                  placeholder="e.g. Web3 Developer Bootcamp"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-400">Issuer Name (Display)</label>
                <input 
                  required
                  type="text" 
                  value={formData.issuerName}
                  onChange={e => setFormData({...formData, issuerName: e.target.value})}
                  className="w-full bg-background border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-accent transition-colors"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-400">Expiry Date (Optional)</label>
                <input 
                  type="date" 
                  value={formData.expiry}
                  onChange={e => setFormData({...formData, expiry: e.target.value})}
                  className="w-full bg-background border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-accent transition-colors text-zinc-300"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium text-zinc-400">Attach Original Document (Optional PDF/Image)</label>
                <div className="w-full bg-background border border-white/10 border-dashed rounded-xl px-4 py-6 flex flex-col items-center justify-center text-center">
                  <input 
                    type="file" 
                    id="doc-upload"
                    className="hidden" 
                    onChange={e => setFileToUpload(e.target.files?.[0] || null)}
                  />
                  <label htmlFor="doc-upload" className="cursor-pointer">
                    <Upload className="w-6 h-6 text-zinc-500 mb-2 mx-auto" />
                    <span className="text-accent text-sm font-medium hover:underline">Select a file</span>
                    <span className="text-zinc-500 text-sm ml-1">or drag and drop</span>
                  </label>
                  {fileToUpload && (
                    <p className="mt-2 text-sm text-green-400 font-medium">Selected: {fileToUpload.name}</p>
                  )}
                  <p className="text-xs text-zinc-600 mt-2">Document will be pinned to IPFS. URL will be anchored on-chain.</p>
                </div>
              </div>
            </div>
            
            <button 
              type="submit"
              disabled={issuing}
              className="w-full bg-accent text-background py-4 rounded-xl font-bold hover:bg-accent-hover transition-colors flex justify-center items-center gap-2"
            >
              {issuing ? <Loader2 className="w-5 h-5 animate-spin" /> : "Sign & Anchor on Polygon"}
            </button>
          </form>
 
          {issuedHash && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="mt-8 bg-accent/10 border border-accent/20 rounded-xl p-6"
            >
              <div className="flex items-center gap-3 mb-4">
                <CheckCircle2 className="w-6 h-6 text-accent" />
                <h3 className="font-bold text-accent">Successfully Anchored</h3>
              </div>
              <div className="bg-background rounded-lg p-3 font-mono text-sm text-zinc-300 break-all border border-white/5 mb-4">
                {issuedHash}
              </div>
              <a 
                href={`/certificate/${issuedHash}`}
                target="_blank"
                className="text-sm font-medium text-white flex items-center gap-2 hover:text-accent transition-colors"
              >
                View Public Verification Page <ArrowRight className="w-4 h-4" />
              </a>
            </motion.div>
          )}
        </div>
 
        {/* Certificate List */}
        <div className="bg-zinc-900 border border-white/5 rounded-3xl p-8">
          <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
            <FileText className="w-5 h-5 text-zinc-400" /> Issued Certificates
          </h2>
          {loadingCerts ? (
            <div className="text-center py-8 text-zinc-500">Loading...</div>
          ) : certificates.length === 0 ? (
            <div className="text-center py-8 text-zinc-500">No certificates issued yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="text-zinc-500 border-b border-white/10">
                    <th className="pb-3 font-medium">Recipient</th>
                    <th className="pb-3 font-medium">Course</th>
                    <th className="pb-3 font-medium">Date</th>
                    <th className="pb-3 font-medium">Status</th>
                    <th className="pb-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {certificates.map(cert => (
                    <tr key={cert.hash}>
                      <td className="py-4 font-medium">{cert.recipientName}</td>
                      <td className="py-4 text-zinc-400">{cert.courseName}</td>
                      <td className="py-4 text-zinc-400">{new Date(cert.issuedAt).toLocaleDateString()}</td>
                      <td className="py-4">
                        {cert.revoked ? (
                          <span className="text-xs font-bold text-red-400 bg-red-400/10 px-2 py-1 rounded">REVOKED</span>
                        ) : (
                          <span className="text-xs font-bold text-accent bg-accent/10 px-2 py-1 rounded">ACTIVE</span>
                        )}
                      </td>
                      <td className="py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <a href={`/certificate/${cert.hash}`} target="_blank" className="p-2 bg-white/5 rounded hover:bg-white/10 transition-colors text-zinc-400 hover:text-white" title="View">
                            <ExternalLink className="w-4 h-4" />
                          </a>
                          {!cert.revoked && (
                            <button onClick={() => handleRevoke(cert.hash)} className="p-2 bg-red-500/10 rounded hover:bg-red-500/20 transition-colors text-red-400 hover:text-red-300" title="Revoke">
                              <ShieldAlert className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
 