import { Link } from "react-router-dom";
import { ShieldCheck } from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-zinc-950 border-t border-white/5 pt-20 pb-10">
      <div className="max-w-7xl mx-auto px-6 md:px-12 grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
        <div className="md:col-span-1">
          <Link to="/" className="flex items-center gap-2 group mb-4">
            <ShieldCheck className="w-8 h-8 text-accent" />
            <span className="text-xl font-serif font-bold tracking-wide">ReputeChain</span>
          </Link>
          <p className="text-zinc-500 text-sm leading-relaxed">
            Industry-grade blockchain certificate verification platform. Trustless, instant, and permanent.
          </p>
        </div>
        <div>
          <h4 className="font-semibold text-zinc-100 mb-6">Product</h4>
          <ul className="space-y-4 text-sm text-zinc-500">
            <li><Link to="/verify" className="hover:text-accent transition-colors">Verify Certificate</Link></li>
            <li><Link to="/issuer" className="hover:text-accent transition-colors">Issuer Portal</Link></li>
            <li><Link to="/docs" className="hover:text-accent transition-colors">Developer API</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="font-semibold text-zinc-100 mb-6">Resources</h4>
          <ul className="space-y-4 text-sm text-zinc-500">
            <li><Link to="/docs" className="hover:text-accent transition-colors">Documentation</Link></li>
            <li><a href="https://amoy.polygonscan.com/" target="_blank" rel="noopener noreferrer" className="hover:text-accent transition-colors">Smart Contract</a></li>
            <li><a href="mailto:akshattiwari2141@gmail.com" className="hover:text-accent transition-colors">Support</a></li>
          </ul>
        </div>
        <div>
          <h4 className="font-semibold text-zinc-100 mb-6">Legal</h4>
          <ul className="space-y-4 text-sm text-zinc-500">
            <li><Link to="/privacy" className="hover:text-accent transition-colors">Privacy Policy</Link></li>
            <li><Link to="/terms" className="hover:text-accent transition-colors">Terms of Service</Link></li>
          </ul>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-6 md:px-12 border-t border-white/5 pt-8 flex flex-col md:flex-row justify-between items-center text-xs text-zinc-600">
        <p>© {new Date().getFullYear()} ReputeChain. All rights reserved.</p>
        <p className="mt-2 md:mt-0">Deployed on Polygon Amoy Testnet</p>
      </div>
    </footer>
  );
}
