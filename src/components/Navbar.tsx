import { Link, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { motion, useScroll, useMotionValueEvent } from "motion/react";
import { Menu, X, Loader2, LogOut, Search, ShieldCheck } from "lucide-react";
import { cn } from "../lib/utils";
import { useWallet } from "../contexts/WalletContext";

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const { address, isConnecting, connect, disconnect } = useWallet();

  return (
    <header className="fixed top-0 inset-x-0 z-50 bg-white text-black shadow-md font-sans">
      <div className="max-w-[1400px] mx-auto px-4 flex items-center justify-between h-[72px]">
        
        {/* Left Side: Menu + Logo */}
        <div className="flex items-center h-full">
          <button 
            className="flex items-center gap-2 text-sm font-bold tracking-wider hover:text-gray-600 transition-colors"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            MENU
          </button>
          
          <div className="hidden sm:flex items-center border-l border-gray-300 pl-4 ml-4 h-10 gap-3">
            <Link to="/" className="flex items-center gap-2 group">
              <ShieldCheck className="w-8 h-8 text-[#00a859] transition-colors" />
              <span className="text-xl font-serif font-bold tracking-wide text-black">ReputeChain</span>
            </Link>
          </div>
        </div>

        {/* Desktop Nav Actions */}
        <nav className="hidden lg:flex items-center h-full gap-4">
          <Link to="/docs" className="text-[10px] font-bold uppercase text-[#00a859] flex flex-col items-center leading-[1.2] hover:text-[#008f4c] px-2">
            <span>Developer</span>
            <span>API Docs</span>
          </Link>
          
          <div className="w-px h-10 bg-gray-200" />
          
          {address && (
            <>
              <Link to="/wallet" className="text-[10px] font-bold uppercase text-[#00a859] flex flex-col items-center leading-[1.2] hover:text-[#008f4c] px-2">
                <span>Digital</span>
                <span>Vault</span>
              </Link>
              <div className="w-px h-10 bg-gray-200" />
              <Link to="/profile" className="text-[10px] font-bold uppercase text-[#00a859] flex flex-col items-center leading-[1.2] hover:text-[#008f4c] px-2">
                <span>My</span>
                <span>Profile</span>
              </Link>
              <div className="w-px h-10 bg-gray-200" />
            </>
          )}

          <div className="flex items-center gap-2 px-2">
            <Search className="w-5 h-5 text-gray-400" />
            <input 
              type="text" 
              placeholder="Enter Certificate Hash" 
              className="text-xs border-b border-gray-300 pb-1 outline-none w-48 placeholder:text-gray-400 focus:border-[#00a859] transition-colors bg-transparent text-black" 
            />
          </div>
          
          <div className="w-px h-10 bg-gray-200" />
          
          {address ? (
            <button onClick={disconnect} className="text-[10px] font-bold uppercase text-center leading-[1.2] hover:text-[#00a859] transition-colors px-2">
              Disconnect<br/><span className="text-gray-500 font-mono tracking-tighter">{address.slice(0,6)}...</span>
            </button>
          ) : (
            <button onClick={connect} disabled={isConnecting} className="text-[10px] font-bold uppercase text-center leading-[1.2] hover:text-[#00a859] transition-colors px-2 flex flex-col items-center justify-center h-full">
              {isConnecting ? <Loader2 className="w-4 h-4 animate-spin text-[#00a859]" /> : (
                <>
                  <span>Connect</span>
                  <span>Wallet</span>
                </>
              )}
            </button>
          )}
        </nav>
      </div>

      {/* Green Sub-banner */}
      <div className="bg-[#00a859] text-white text-[13px] px-4 py-1.5 font-medium shadow-inner">
        <div className="max-w-[1400px] mx-auto flex items-center">
          Securely issue, verify, and manage blockchain credentials on ReputeChain.
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileOpen && (
        <div className="absolute top-full left-0 right-0 bg-white border-b border-gray-200 shadow-xl flex flex-col text-black">
          <Link to="/verify" onClick={() => setMobileOpen(false)} className="px-6 py-4 border-b border-gray-100 font-bold hover:bg-gray-50 text-sm">Verify</Link>
          <Link to="/issuer" onClick={() => setMobileOpen(false)} className="px-6 py-4 border-b border-gray-100 font-bold hover:bg-gray-50 text-sm">Issuers</Link>
          <Link to="/recruiter" onClick={() => setMobileOpen(false)} className="px-6 py-4 border-b border-gray-100 font-bold hover:bg-gray-50 text-sm">Recruiters</Link>
          <Link to="/docs" onClick={() => setMobileOpen(false)} className="px-6 py-4 border-b border-gray-100 font-bold hover:bg-gray-50 text-sm">Developers API</Link>
          {address && (
            <>
              <Link to="/wallet" onClick={() => setMobileOpen(false)} className="px-6 py-4 border-b border-gray-100 font-bold hover:bg-gray-50 text-sm text-[#00a859]">Digital Vault</Link>
              <Link to="/profile" onClick={() => setMobileOpen(false)} className="px-6 py-4 border-b border-gray-100 font-bold hover:bg-gray-50 text-sm text-[#00a859]">My Profile</Link>
            </>
          )}
          {address ? (
            <button onClick={() => { disconnect(); setMobileOpen(false); }} className="px-6 py-4 font-bold hover:bg-gray-50 text-left text-sm text-red-600 lg:hidden">
              Disconnect ({address.slice(0, 6)}...)
            </button>
          ) : (
            <button onClick={() => { connect(); setMobileOpen(false); }} className="px-6 py-4 font-bold hover:bg-gray-50 text-left text-sm text-[#00a859] lg:hidden">
              Connect Wallet
            </button>
          )}
        </div>
      )}
    </header>
  );
}
