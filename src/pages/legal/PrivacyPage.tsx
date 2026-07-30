import { motion } from "motion/react";
import { ShieldCheck } from "lucide-react";

export function PrivacyPage() {
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
            <h1 className="text-3xl font-serif font-bold text-black">Privacy Policy</h1>
          </div>
          
          <div className="prose prose-zinc max-w-none text-zinc-600 space-y-6">
            <p>
              Last updated: {new Date().toLocaleDateString("en-US", { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>

            <h2 className="text-xl font-bold text-black mt-8 mb-4">1. Information We Collect</h2>
            <p>
              We collect information to provide better services to our users. This includes:
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>Wallet Addresses:</strong> Collected when you authenticate using Sign-In with Ethereum (SIWE).</li>
              <li><strong>Verification Data:</strong> Data you choose to provide for verification (e.g., GitHub handles, mock IDs). Note that sensitive hashes may be stored on-chain.</li>
              <li><strong>Usage Data:</strong> Basic technical information to improve our services and prevent abuse, including IP addresses used for rate-limiting.</li>
            </ul>

            <h2 className="text-xl font-bold text-black mt-8 mb-4">2. How We Use Your Information</h2>
            <p>
              We use the information we collect to:
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>Provide, maintain, and improve ReputeChain.</li>
              <li>Mint and verify on-chain credentials on the Polygon Amoy testnet.</li>
              <li>Calculate and manage user reputation scores.</li>
              <li>Respond to your support requests.</li>
            </ul>

            <h2 className="text-xl font-bold text-black mt-8 mb-4">3. Blockchain Data</h2>
            <p>
              Please be aware that any data or hashes published to the blockchain (such as certificate hashes or wallet addresses) are public, permanent, and cannot be deleted or altered by us. Do not include unencrypted personal information in on-chain metadata.
            </p>

            <h2 className="text-xl font-bold text-black mt-8 mb-4">4. Third-Party Services</h2>
            <p>
              We may integrate with third-party services (e.g., GitHub, Digilocker) for credential verification. Your interactions with these services are governed by their respective privacy policies.
            </p>

            <h2 className="text-xl font-bold text-black mt-8 mb-4">5. Contact Us</h2>
            <p>
              If you have any questions or concerns about this Privacy Policy, please contact us at: <a href="mailto:akshattiwari2141@gmail.com" className="text-[#00a859] hover:underline font-medium">akshattiwari2141@gmail.com</a>.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
