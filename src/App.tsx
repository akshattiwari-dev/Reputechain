import { Routes, Route, BrowserRouter } from "react-router-dom";
import { MotionConfig } from "motion/react";
import { Navbar } from "./components/Navbar";
import { Footer } from "./components/Footer";
import { WalletProvider } from "./contexts/WalletContext";

// Public Pages
import { LandingPage } from "./pages/public/LandingPage";
import { DocsPage } from "./pages/public/DocsPage";

// Issuer Pages
import { IssuerDashboard } from "./pages/issuer/IssuerDashboard";
import { ProfilePage } from "./pages/issuer/ProfilePage";
import { DocumentWalletPage } from "./pages/issuer/DocumentWalletPage";

// Verifier / Wallet / Profile Pages
import { VerifyPage } from "./pages/verifier/VerifyPage";
import { CertificatePage } from "./pages/verifier/CertificatePage";
import { RecruiterPortal } from "./pages/verifier/RecruiterPortal";

// Legal Pages
import { TermsPage } from "./pages/legal/TermsPage";
import { PrivacyPage } from "./pages/legal/PrivacyPage";

export default function App() {
  return (
    <BrowserRouter>
      <WalletProvider>
        <MotionConfig reducedMotion="user">
          <div className="min-h-screen flex flex-col bg-background text-foreground font-sans selection:bg-accent selection:text-black">
            <Navbar />
            <main className="flex-1 flex flex-col">
              <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/wallet" element={<DocumentWalletPage />} />
                <Route path="/verify" element={<VerifyPage />} />
                <Route path="/verify/:hash" element={<VerifyPage />} />
                <Route path="/issuer" element={<IssuerDashboard />} />
                <Route path="/docs" element={<DocsPage />} />
                <Route path="/certificate/:id" element={<CertificatePage />} />
                <Route path="/recruiter" element={<RecruiterPortal />} />
                <Route path="/terms" element={<TermsPage />} />
                <Route path="/privacy" element={<PrivacyPage />} />
              </Routes>
            </main>
            <Footer />
          </div>
        </MotionConfig>
      </WalletProvider>
    </BrowserRouter>
  );
}