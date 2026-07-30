import { motion } from "motion/react";
import { Terminal, Code, ShieldCheck, Database, Search } from "lucide-react";

export function DocsPage() {
  return (
    <div className="w-full flex-1 flex flex-col pt-32 pb-24 px-6 md:px-12 max-w-4xl mx-auto">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <span className="font-script text-accent text-2xl mb-2 block">Developers</span>
        <h1 className="text-4xl md:text-5xl font-serif font-bold mb-8">API Documentation</h1>
        <p className="text-zinc-400 mb-12 text-lg">
          Integrate ReputeChain's verification engine directly into your ATS, HR software, or university portal using our REST API.
        </p>

        <div className="space-y-12">
          {/* Verify */}
          <section>
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
              <Search className="w-6 h-6 text-accent" /> Verify Endpoint
            </h2>
            <div className="bg-zinc-900 border border-white/10 rounded-2xl overflow-hidden">
              <div className="bg-zinc-950 px-4 py-3 border-b border-white/10 flex items-center gap-3">
                <span className="bg-blue-500/20 text-blue-400 text-xs font-bold px-2 py-1 rounded">GET</span>
                <code className="text-sm text-zinc-300">/api/verify/:hash</code>
              </div>
              <div className="p-6">
                <p className="text-sm text-zinc-400 mb-4">Checks the Polygon Amoy blockchain for the given certificate hash. This endpoint is public.</p>
                <h4 className="text-sm font-semibold mb-2">Response</h4>
                <pre className="bg-background border border-white/5 p-4 rounded-xl text-xs text-zinc-300 overflow-x-auto">
{`{
  "verified": true,
  "data": {
    "hash": "0x4f8...",
    "recipientName": "Jane Doe",
    "courseName": "Advanced Solidity",
    "issuerName": "Blockchain University",
    "issuedAt": "2024-03-12T10:00:00Z",
    "revoked": false
  }
}`}
                </pre>
              </div>
            </div>
          </section>

          {/* Issue */}
          <section>
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
              <Code className="w-6 h-6 text-accent" /> Issue Endpoint
            </h2>
            <div className="bg-zinc-900 border border-white/10 rounded-2xl overflow-hidden">
              <div className="bg-zinc-950 px-4 py-3 border-b border-white/10 flex items-center gap-3">
                <span className="bg-green-500/20 text-green-400 text-xs font-bold px-2 py-1 rounded">POST</span>
                <code className="text-sm text-zinc-300">/api/issue</code>
              </div>
              <div className="p-6">
                <p className="text-sm text-zinc-400 mb-4">Issues a new certificate. Requires Issuer Authentication token.</p>
                <h4 className="text-sm font-semibold mb-2">Payload</h4>
                <pre className="bg-background border border-white/5 p-4 rounded-xl text-xs text-zinc-300 overflow-x-auto mb-4">
{`{
  "hash": "0xabc...",
  "recipientName": "Jane Doe",
  "courseName": "Web3 Bootcamp",
  "issuerName": "Blockchain University",
  "expiry": "2025-12-31" // Optional
}`}
                </pre>
                <h4 className="text-sm font-semibold mb-2">Response</h4>
                <pre className="bg-background border border-white/5 p-4 rounded-xl text-xs text-zinc-300 overflow-x-auto">
{`{
  "success": true,
  "hash": "0xabc...",
  "txHash": "0x123..."
}`}
                </pre>
              </div>
            </div>
          </section>

          {/* Revoke */}
          <section>
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
              <ShieldCheck className="w-6 h-6 text-accent" /> Revoke Endpoint
            </h2>
            <div className="bg-zinc-900 border border-white/10 rounded-2xl overflow-hidden">
              <div className="bg-zinc-950 px-4 py-3 border-b border-white/10 flex items-center gap-3">
                <span className="bg-red-500/20 text-red-400 text-xs font-bold px-2 py-1 rounded">POST</span>
                <code className="text-sm text-zinc-300">/api/revoke/:hash</code>
              </div>
              <div className="p-6">
                <p className="text-sm text-zinc-400 mb-4">Revokes a certificate permanently. Can only be called by the original issuer.</p>
                <h4 className="text-sm font-semibold mb-2">Response</h4>
                <pre className="bg-background border border-white/5 p-4 rounded-xl text-xs text-zinc-300 overflow-x-auto">
{`{
  "success": true
}`}
                </pre>
              </div>
            </div>
          </section>
        </div>
      </motion.div>
    </div>
  );
}
