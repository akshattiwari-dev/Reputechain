
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { createWalletClient, custom } from 'viem';
import { polygonAmoy } from 'viem/chains';
import { SiweMessage } from 'siwe';
 
declare global {
  interface Window {
    ethereum?: any;
  }
}
 
interface WalletContextType {
  address: string | null;
  token: string | null;
  isConnecting: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  walletClient: any | null;
}
 
const WalletContext = createContext<WalletContextType | null>(null);
 
// MetaMask (and most wallets) inject window.ethereum asynchronously.
// If it isn't there on the first synchronous check, wait briefly for the
// 'ethereum#initialized' event before giving up and telling the user to
// install it.
function waitForEthereumProvider(timeoutMs = 3000): Promise<any | null> {
  if (typeof window === 'undefined') return Promise.resolve(null);
  if (window.ethereum) return Promise.resolve(window.ethereum);
 
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      window.removeEventListener('ethereum#initialized', onInit);
      resolve(window.ethereum ?? null);
    }, timeoutMs);
 
    const onInit = () => {
      clearTimeout(timer);
      resolve(window.ethereum ?? null);
    };
 
    window.addEventListener('ethereum#initialized', onInit, { once: true });
  });
}
 
export function WalletProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [walletClient, setWalletClient] = useState<any | null>(null);
  const [hasProvider, setHasProvider] = useState<boolean>(
    typeof window !== 'undefined' && !!window.ethereum
  );
 
  // Re-check once on mount in case the extension injects slightly after
  // React first renders.
  useEffect(() => {
    if (hasProvider) return;
    waitForEthereumProvider(3000).then((provider) => {
      if (provider) setHasProvider(true);
    });
  }, [hasProvider]);                        
  const connect = async () => {
    if (!hasProvider || !window.ethereum) {
      alert('Please install MetaMask or another Ethereum wallet to continue.');
      return;
    }
 
    setIsConnecting(true);
    try {
      const client = createWalletClient({
        chain: polygonAmoy,
        transport: custom(window.ethereum),
      });
 
      // eth_requestAccounts only shows MetaMask's account picker the FIRST
      // time a site is authorized — after that it silently returns whatever
      // account was previously granted, even if the user switched accounts
      // in the extension. Requesting eth_accounts permissions first forces
      // the picker to reappear every time, so the user can choose/switch.
      try {
        await window.ethereum.request({
          method: 'wallet_requestPermissions',
          params: [{ eth_accounts: {} }],
        });
      } catch (permErr) {
        // Some wallets (or older MetaMask versions) don't support
        // wallet_requestPermissions — fall back to the normal flow below.
      }
 
      const [account] = await client.requestAddresses();
 
      const nonceRes = await fetch('/api/auth/nonce');
      if (!nonceRes.ok) throw new Error('Failed to fetch nonce');
      const { nonce } = await nonceRes.json();
 
      const siweMessage = new SiweMessage({
        domain: window.location.host,
        address: account,
        statement: 'Sign in to ReputeChain with your Ethereum account.',
        uri: window.location.origin,
        version: '1',
        chainId: polygonAmoy.id,
        nonce,
      });
 
      const messageToSign = siweMessage.prepareMessage();
 
      const signature = await client.signMessage({
        account,
        message: messageToSign,
      });
 
      const verifyRes = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: messageToSign, signature }),
      });
 
      const data = await verifyRes.json();
      if (!verifyRes.ok) throw new Error(data.error || 'Verification failed.');
 
      setAddress(data.address);
      setToken(data.token);
      setWalletClient(client);
    } catch (err: any) {
      console.error('Wallet connection failed:', err);
      const reason = err?.message || 'Unknown error.';
      alert(`Wallet connection failed: ${reason}`);
    } finally {
      setIsConnecting(false);
    }
  };
 
  const disconnect = () => {
    setAddress(null);
    setToken(null);
    setWalletClient(null);
  };
 
 
  return (
    <WalletContext.Provider value={{ address, token, isConnecting, connect, disconnect, walletClient }}>
      {children}
    </WalletContext.Provider>
  );
}
 
export function useWallet() {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within WalletProvider');
  }
  return context;
}