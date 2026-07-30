import { motion } from "motion/react";
import CountUp from "react-countup";
import { Link } from "react-router-dom";
import { ArrowRight, CheckCircle2, Shield, Zap, Search, Fingerprint, Database, Link as LinkIcon, Users, BarChart3, Code, LayoutDashboard } from "lucide-react";
import { cn } from "../../lib/utils";

const FADE_UP_ANIMATION_VARIANTS = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100, damping: 15 } },
};

const STAGGER_CHILDREN_VARIANTS = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
    },
  },
};

export function LandingPage() {
  return (
    <div className="w-full flex flex-col relative">
      {/* FULL WIDTH REPLICA BACKGROUND */}
      <div className="absolute top-0 left-0 w-full h-[100vh] min-h-[850px] z-0 overflow-hidden pointer-events-none">
        {/* Base Photo of Graduates */}
        <div 
          className="absolute inset-0"
          style={{ 
            backgroundImage: 'url("https://images.unsplash.com/photo-1523050854058-8df90110c9f1?q=80&w=2070&auto=format&fit=crop")',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
        
        {/* Base darkening for contrast */}
        <div className="absolute inset-0 bg-zinc-950/60" /> 
        
        {/* Left Green Area */}
        <div className="absolute inset-0 bg-[#00a859]/70 mix-blend-overlay" style={{ clipPath: 'polygon(0 0, 45% 0, 20% 100%, 0 100%)' }} />
        
        {/* Center Yellow Circle */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[#f6a01a]/70 rounded-full mix-blend-color-dodge blur-[20px]" />
        
        {/* Extra dark gradient from left to ensure text readability */}
        <div className="absolute inset-0 bg-gradient-to-r from-zinc-950/90 via-zinc-950/40 to-zinc-950/80" />

        {/* Bottom Fade to blend with next section */}
        <div className="absolute bottom-0 left-0 w-full h-48 bg-gradient-to-t from-zinc-950 via-zinc-950/80 to-transparent" />
      </div>

      {/* HERO SECTION */}
      <section className="relative z-10 w-full max-w-[1400px] mx-auto px-6 md:px-12 pt-32 pb-20 lg:pt-40 lg:pb-28 flex flex-col lg:flex-row items-center gap-16">
        
        <motion.div 
          className="flex-1 text-left"
          variants={STAGGER_CHILDREN_VARIANTS}
          initial="hidden"
          animate="show"
        >
          <motion.div variants={FADE_UP_ANIMATION_VARIANTS} className="mb-4 block">
            <span className="font-script text-accent text-2xl tracking-wide">proof, not promises</span>
          </motion.div>
          
          <motion.h1 
            variants={FADE_UP_ANIMATION_VARIANTS}
            className="text-5xl md:text-7xl lg:text-[5.5rem] font-serif font-bold leading-[1.05] tracking-tight mb-8"
          >
            Certificates you<br />
            can trust, without<br />
            trusting us.
          </motion.h1>
          
          <motion.p 
            variants={FADE_UP_ANIMATION_VARIANTS}
            className="text-lg md:text-xl text-zinc-400 leading-relaxed max-w-2xl mb-10"
          >
            ReputeChain anchors every credential you issue to Polygon. Recipients keep an immutable proof. Employers verify in seconds — directly against the chain, not against us.
          </motion.p>
          
          <motion.div variants={FADE_UP_ANIMATION_VARIANTS} className="flex flex-col sm:flex-row items-center gap-4">
            <Link to="/verify" className="w-full sm:w-auto flex items-center justify-center gap-2 bg-accent text-background px-8 py-4 rounded-full font-semibold hover:bg-accent-hover transition-all hover:scale-105 active:scale-95">
              Verify a credential
            </Link>
            <Link to="/issuer" className="w-full sm:w-auto flex items-center justify-center gap-2 bg-white/5 text-white border border-white/10 px-8 py-4 rounded-full font-semibold hover:bg-white/10 transition-all">
              Become an issuer <ArrowRight className="w-4 h-4 ml-1" />
            </Link>
          </motion.div>
        </motion.div>

        {/* Hero Visual Card */}
        <motion.div 
          className="flex-1 relative w-full max-w-[550px] mx-auto lg:ml-auto"
          initial={{ opacity: 0, scale: 0.95, rotateY: 15 }}
          animate={{ opacity: 1, scale: 1, rotateY: 0 }}
          transition={{ duration: 1, delay: 0.2, type: "spring", bounce: 0.4 }}
          style={{ perspective: "1000px" }}
        >
          <div className="absolute inset-0 bg-gradient-to-tr from-accent/20 to-transparent blur-[80px]" />
          <div 
            className="relative w-full border border-white/10 rounded-[2rem] p-8 shadow-2xl overflow-hidden ring-1 ring-white/5"
            style={{ 
              backgroundImage: 'url("https://i.pinimg.com/originals/c6/3e/76/c63e76434797673b75c27d9b5f0c6a8c.jpg")',
              backgroundSize: 'cover',
              backgroundPosition: 'center'
            }}
          >
            <div className="absolute inset-0 bg-zinc-950/70 backdrop-blur-[2px]" />
            {/* Card inner glow */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-accent/20 rounded-full blur-[60px]" />
            
            <div className="relative z-10">
              <div className="flex justify-between items-start mb-12">
                <div className="text-[10px] font-mono tracking-[0.2em] text-zinc-300 uppercase bg-black/40 px-3 py-1.5 rounded-full border border-white/10 backdrop-blur-md">
                  Verified Credential
                </div>
                <div className="bg-accent/20 backdrop-blur-md text-accent p-2 rounded-xl border border-accent/20 shadow-xl">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
              </div>

              <div className="mb-12">
                <h3 className="font-serif text-3xl md:text-4xl font-bold text-white mb-2 tracking-tight drop-shadow-lg">Advanced Cryptography</h3>
                <p className="text-xl text-accent font-medium mb-4 drop-shadow-md">Amara Okafor</p>
                <p className="text-sm text-zinc-300 font-medium drop-shadow-md">Issued by MIT Media Lab • May 12, 2024</p>
              </div>

              <div className="bg-zinc-900/80 backdrop-blur-xl rounded-2xl p-4 border border-white/10 space-y-3 shadow-2xl">
                <div className="flex items-center gap-3 text-sm">
                  <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center shrink-0 border border-accent/20">
                    <Shield className="w-4 h-4 text-accent" />
                  </div>
                  <div>
                    <div className="text-zinc-200 font-medium">Verified on Polygon Amoy</div>
                    <div className="text-zinc-400 text-xs font-mono">Tx: 0x9f8...2a1b</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center shrink-0 border border-white/10">
                    <LinkIcon className="w-4 h-4 text-zinc-300" />
                  </div>
                  <div>
                    <div className="text-zinc-200 font-medium">Public profile URL</div>
                    <div className="text-zinc-400 text-xs truncate">reputechain.app/certificate/0x...</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* STATS SECTION */}
      <section className="border-y border-white/5 bg-zinc-950/50 backdrop-blur-sm">
        <div className="max-w-[1400px] mx-auto px-6 md:px-12 py-16 grid grid-cols-2 lg:grid-cols-4 gap-8">
          {[
            { label: "Certificates Issued", value: 184000, suffix: "+" },
            { label: "Trusted Issuers", value: 1340, suffix: "+" },
            { label: "Total Verifications", value: 2000000, suffix: "+" },
            { label: "Network Uptime", value: 99.99, suffix: "%", decimals: 2 }
          ].map((stat, i) => (
            <div key={i} className="flex flex-col items-center md:items-start text-center md:text-left">
              <span className="text-4xl md:text-5xl font-bold text-white mb-3 font-serif tracking-tight">
                <CountUp 
                  end={stat.value} 
                  decimals={stat.decimals || 0} 
                  duration={2.5} 
                  separator="," 
                  enableScrollSpy 
                  scrollSpyOnce 
                />
                {stat.suffix}
              </span>
              <span className="text-sm font-medium text-zinc-500 uppercase tracking-widest">{stat.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS (THE FLOW) */}
      <section className="bg-background py-24 lg:py-32">
        <div className="max-w-[1400px] mx-auto px-6 md:px-12">
          <div className="text-left mb-16">
            <span className="font-script text-accent text-2xl mb-4 block">the flow</span>
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-serif font-bold tracking-tight">Three steps. Zero trust required.</h2>
          </div>

          <motion.div 
            className="grid md:grid-cols-3 gap-8"
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-50px" }}
            variants={STAGGER_CHILDREN_VARIANTS}
          >
            {[
              { step: "01", title: "Hash", desc: "Institutions upload documents securely. We instantly generate an irreversible SHA-256 hash." },
              { step: "02", title: "Store", desc: "Hashes are anchored to the Polygon blockchain, guaranteeing permanence and immutability." },
              { step: "03", title: "Verify", desc: "Recipients get a URL. Employers verify authenticity in seconds—directly from the chain." }
            ].map((s, i) => (
              <motion.div 
                key={i}
                variants={FADE_UP_ANIMATION_VARIANTS}
                className="bg-zinc-900/50 border border-white/5 p-8 rounded-[2rem] hover:bg-zinc-900 transition-colors"
              >
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-sm font-bold text-accent font-mono">
                    {s.step}
                  </div>
                  <h3 className="text-2xl font-bold font-serif">{s.title}</h3>
                </div>
                <p className="text-zinc-400 leading-relaxed text-lg">{s.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* FEATURES GRID (END TO END) */}
      <section className="bg-zinc-950 py-24 lg:py-32 border-y border-white/5">
        <div className="max-w-[1400px] mx-auto px-6 md:px-12">
          <div className="mb-16">
            <span className="font-script text-accent text-2xl mb-4 block">end to end</span>
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-serif font-bold tracking-tight">Everything an issuer or verifier needs.</h2>
          </div>
          
          <motion.div 
            className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6"
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-100px" }}
            variants={STAGGER_CHILDREN_VARIANTS}
          >
            {[
              { icon: Zap, title: "Instant verification", desc: "Paste any SHA-256 hash or scan a QR code to verify instantly." },
              { icon: Database, title: "IPFS storage", desc: "Original documents live on IPFS, immutable hashes anchor on-chain." },
              { icon: LinkIcon, title: "Public profile URL", desc: "Shareable public links for candidates to showcase their credentials." },
              { icon: LayoutDashboard, title: "Issuer portal", desc: "Manage, issue, and revoke certificates from a dedicated dashboard." },
              { icon: Users, title: "Batch issuance", desc: "Upload a CSV to issue hundreds of certificates in one transaction." },
              { icon: Shield, title: "Digital signatures", desc: "Sign securely with your Ethereum wallet, no centralized auth." },
              { icon: BarChart3, title: "Issuer analytics", desc: "See verification counts, active vs revoked status in real-time." },
              { icon: Code, title: "Developer API", desc: "Automate your workflow with REST endpoints for your backend." }
            ].map((feat, i) => (
              <motion.div 
                key={i}
                variants={FADE_UP_ANIMATION_VARIANTS}
                className="group p-8 rounded-3xl bg-zinc-900 border border-white/5 hover:border-white/10 transition-colors"
              >
                <feat.icon className="w-8 h-8 text-accent mb-6" />
                <h3 className="text-xl font-bold mb-3">{feat.title}</h3>
                <p className="text-zinc-400 text-sm leading-relaxed">{feat.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* TESTIMONIALS (THE RECEIPTS) */}
      <section className="bg-background py-24 lg:py-32">
        <div className="max-w-[1400px] mx-auto px-6 md:px-12">
          <div className="mb-16">
            <span className="font-script text-accent text-2xl mb-4 block">the receipts</span>
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-serif font-bold tracking-tight">What institutions and recruiters say.</h2>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                quote: "We automated our entire certificate issuance process with the batch upload feature. Everything is anchored instantly on-chain.",
                name: "Marcus Chen",
                title: "Head of Curriculum, CodeCamp Global"
              },
              {
                quote: "ReputeChain eliminated our fraud problem completely. It integrates seamlessly into our HR tech stack via the developer API.",
                name: "Sarah Jenkins",
                title: "Director of Admissions, Tech University"
              },
              {
                quote: "The UI is incredibly intuitive. I can verify a candidate's background in seconds without jumping through hoops or paying external agencies.",
                name: "Alex Rivera",
                title: "Senior Technical Recruiter, FutureTech"
              }
            ].map((t, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ type: "spring", stiffness: 80, damping: 20, delay: i * 0.1 }}
                className="bg-zinc-900/50 border border-white/5 p-8 rounded-[2rem]"
              >
                <div className="text-accent mb-6">
                  {Array.from({length: 5}).map((_, j) => <span key={j} className="inline-block text-xl">★</span>)}
                </div>
                <p className="text-lg text-zinc-300 italic mb-8 leading-relaxed">"{t.quote}"</p>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-zinc-800 rounded-full border border-white/10" />
                  <div>
                    <h4 className="font-bold">{t.name}</h4>
                    <p className="text-sm text-zinc-500">{t.title}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA SECTION */}
      <section className="px-6 pb-24 w-full max-w-[1400px] mx-auto">
        <motion.div 
          className="relative rounded-[3rem] overflow-hidden bg-gradient-to-br from-[#0f4c42] to-[#04241d] border border-accent/20 px-8 py-20 lg:py-24 text-center"
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ type: "spring", stiffness: 100 }}
        >
          {/* Subtle Glow/Pattern inside CTA */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-accent/20 to-transparent opacity-50 mix-blend-screen" />
          
          <span className="relative font-script text-accent text-2xl mb-6 block">ready when you are</span>
          <h2 className="relative text-4xl md:text-5xl lg:text-6xl font-serif font-bold mb-6 tracking-tight text-white max-w-4xl mx-auto leading-tight">
            Start issuing unforgeable credentials today.
          </h2>
          <p className="relative text-lg text-accent/80 max-w-2xl mx-auto mb-10 font-medium">
            Deploy in minutes. Free API tier on Polygon Amoy testnet. Manual migration is one click.
          </p>
          <div className="relative flex flex-col sm:flex-row justify-center items-center gap-4">
            <Link to="/issuer" className="w-full sm:w-auto bg-accent text-background px-8 py-4 rounded-full font-bold hover:bg-accent-hover transition-colors shadow-lg shadow-accent/20">
              Get started for free <ArrowRight className="inline-block w-4 h-4 ml-1" />
            </Link>
            <Link to="/docs" className="w-full sm:w-auto bg-white/5 border border-white/10 text-white px-8 py-4 rounded-full font-bold hover:bg-white/10 transition-colors">
              Read the API docs
            </Link>
          </div>
        </motion.div>
      </section>
    </div>
  );
}

