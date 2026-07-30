import { motion } from "motion/react";
import { ShieldCheck } from "lucide-react";

export function TermsPage() {
  return (
    <div className="flex-1 w-full bg-zinc-50 pt-24 pb-20">
      <div className="max-w-3xl mx-auto px-6 md:px-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white border border-gray-200 rounded-3xl p-8 md:p-12 shadow-sm"
        >
          <div className="flex items-center gap-3 mb-8">
            <ShieldCheck className="w-8 h-8 text-[#00a859]" />
            <h1 className="text-3xl font-serif font-bold text-black">Terms of Service</h1>
          </div>
          
          <div className="prose prose-zinc max-w-none text-zinc-600 space-y-6">
            <p>
              Last updated: {new Date().toLocaleDateString("en-US", { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>

            <h2 className="text-xl font-bold text-black mt-8 mb-4">1. Acceptance of Terms</h2>
            <p>
              By accessing and using ReputeChain ("we", "our", or "us"), you agree to be bound by these Terms of Service. If you disagree with any part of these terms, you may not use our service.
            </p>

            <h2 className="text-xl font-bold text-black mt-8 mb-4">2. Description of Service</h2>
            <p>
              ReputeChain provides a blockchain-based credential issuance and verification platform on the Polygon Amoy testnet. Users can connect their wallets, verify identities, and issue or receive verifiable credentials.
            </p>

            <h2 className="text-xl font-bold text-black mt-8 mb-4">3. User Responsibilities</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>You are responsible for safeguarding the credentials and private keys associated with your wallet.</li>
              <li>You agree not to upload, issue, or verify fraudulent, malicious, or illegal documents.</li>
              <li>You understand that transactions on the blockchain are immutable and cannot be undone once confirmed.</li>
            </ul>

            <h2 className="text-xl font-bold text-black mt-8 mb-4">4. Limitation of Liability</h2>
            <p>
              The service is provided "as is" without warranties of any kind. We shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including loss of profits, data, or use, arising from your use of the platform.
            </p>

            <h2 className="text-xl font-bold text-black mt-8 mb-4">5. Contact Support</h2>
            <p>
              If you have any questions about these terms, please contact us at: <a href="mailto:akshattiwari2141@gmail.com" className="text-[#00a859] hover:underline font-medium">akshattiwari2141@gmail.com</a>.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
