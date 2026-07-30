<div align="center">

 🔗 ReputeChain

Tamper-proof credential verification, built on trust you can actually audit.

A decentralized platform where issuers mint verifiable credentials, holders own their documents in a personal wallet, and verifiers confirm authenticity in seconds — no phone calls, no PDFs, no blind trust.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Solidity](https://img.shields.io/badge/Solidity-Hardhat-363636?logo=solidity&logoColor=white)](https://hardhat.org/)
[![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)

</div>

---

## Why I built this

I've spent the last three years writing production TypeScript and shipping full-stack systems, and one problem kept resurfacing across every domain I touched: **verifying that a credential is real is still needlessly manual.** Degrees, certifications, background checks — most of it still comes down to a phone call, an emailed PDF, or blind trust in a logo.

ReputeChain is my answer to that: a system where the *issuer* signs a credential once, the *holder* carries it in a self-custodied wallet, and any *verifier* can confirm authenticity instantly and cryptographically — without ever needing to contact the issuer directly.

This isn't a tutorial clone. It's a project I designed end-to-end — smart contract, database layer, auth, and three distinct user-facing portals — because I wanted to prove to myself (and now to you) that I can take a hard trust problem and turn it into working software.

---

## What it does

| Role | What they can do |
|---|---|
| **Issuer** | Mint and sign verifiable credentials (certificates, degrees, badges) tied to a recipient's wallet address |
| **Holder** | Store, manage, and share their credentials from a personal document wallet |
| **Verifier / Recruiter** | Instantly verify a credential's authenticity via hash, QR code, or direct lookup — with zero crypto knowledge required |

---

## Tech stack

**Frontend**
- React 19 + TypeScript, Vite for build tooling
- React Router for multi-portal navigation (issuer / verifier / holder / public)
- Tailwind CSS for styling, Motion for animation
- `viem` + `ethers` + `siwe` for wallet connection and Sign-In-With-Ethereum auth

**Backend**
- Express + TypeScript API layer
- Drizzle ORM over PostgreSQL for off-chain metadata and indexing
- JWT-based session handling, `helmet` + `express-rate-limit` for hardening

**Blockchain**
- Solidity smart contract (`ReputeChain.sol`) deployed and tested via Hardhat
- On-chain credential hashing for tamper-evidence, with off-chain storage for the human-readable payload

**Other**
- QR-code generation and scanning (`html5-qrcode`, `jsqr`) for physical/portable credential sharing
- `bun` as the package manager and script runner

---

## Architecture at a glance

```
┌─────────────┐      mint credential       ┌──────────────────┐
│   Issuer    │ ─────────────────────────▶ │  Smart Contract    │
│   Portal    │                            │  (hash + metadata)  │
└─────────────┘                            └──────────────────┘
                                                     │
                                                     ▼
┌─────────────┐      holds & shares        ┌──────────────────┐
│   Holder    │ ◀───────────────────────── │   Postgres index   │
│   Wallet    │                            │  (Drizzle ORM)      │
└─────────────┘                            └──────────────────┘
                                                     │
                                                     ▼
┌─────────────┐      instant lookup        ┌──────────────────┐
│  Verifier   │ ─────────────────────────▶ │   /api/verify      │
│  / Recruiter│                            │   (hash-based)      │
└─────────────┘                            └──────────────────┘
```

> Note on design tradeoffs: the current build indexes credential metadata off-chain in Postgres for fast lookups, while the credential hash itself is anchored on-chain as the source of truth for tamper-evidence. This is a deliberate MVP tradeoff — a fully on-chain read path is on the roadmap (see below).

---

## Getting started

Prerequisites: Node.js 18+, [Bun](https://bun.sh/), PostgreSQL

```bash
# 1. Clone and install
git clone https://github.com/<your-username>/reputechain.git
cd reputechain
bun install

# 2. Configure environment
cp .env.example .env
# fill in DATABASE_URL, JWT_SECRET, and your RPC provider key

# 3. Set up the database
bun run drizzle-kit push

# 4. (Optional) Deploy contracts locally
bun run hardhat node
bun run hardhat run scripts/deploy.cjs --network localhost

# 5. Run the app
bun run dev
```

---

## Project structure

```
src/
├── components/       # Shared UI (Navbar, Footer)
├── contexts/         # Wallet connection state
├── db/                # Drizzle schema + client
├── lib/               # Shared utilities, QR handling
├── pages/
│   ├── public/        # Landing, docs
│   ├── issuer/         # Issuer dashboard, profile, document wallet
│   ├── verifier/        # Verify, certificate view, recruiter portal
│   └── legal/           # Terms, privacy
contracts/
└── ReputeChain.sol    # On-chain credential contract
```

---

## Roadmap

- [ ] Move credential reads fully on-chain to remove the Postgres trust dependency
- [ ] Add rate limiting + auth to the public verification endpoint
- [ ] Multi-chain support (currently single EVM chain)
- [ ] Issuer revocation flow with on-chain event emission
- [ ] Aadhaar-based identity verification, brought fully into compliance with UIDAI data-handling requirements

---

## About me

I'm a software engineer with **3 years of experience** building production web applications, focused on TypeScript across the stack — from React frontends to Node/Express APIs to, increasingly, the smart contract layer. I like problems where trust, data integrity, or verification are the hard part, not just the CRUD.

This project is where I'm teaching myself Web3 properly — not just token swaps, but using blockchain for what it's actually good at: making a claim tamper-evident and independently verifiable.


---

<div align="center">

*Built with a lot of coffee and a stubborn refusal to trust unverifiable PDFs.*

</div>