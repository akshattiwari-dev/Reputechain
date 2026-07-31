
 
 
import express from "express";
import path from "path";
import fs from "fs";
import cors from "cors";
import helmet from "helmet";
import crypto from "crypto";
import multer from "multer";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import { createServer as createViteServer } from "vite";
import "dotenv/config";
import { generateNonce, SiweMessage } from "siwe";
import jwt from "jsonwebtoken";
import { ethers } from "ethers";
import { db, testDbConnection } from "./src/db/index";
import { certificates as certificatesTable } from "./src/db/schema";
import { eq, desc } from "drizzle-orm";
import { validateAadhaar, maskAadhaar, normalizeAadhaar } from "./src/lib/utils";
import { decodeQrFromImage, verifyAadhaarQrPayload } from "./src/lib/aadhaarQr";
 
const app = express();
app.set("trust proxy", 1);
const PORT = Number(process.env.PORT) || 3000;
const IS_PROD = process.env.NODE_ENV === "production";
 
const JWT_SECRET = process.env.JWT_SECRET || "super-secret-key-reputechain";
const ID_HASH_SALT = process.env.ID_HASH_SALT || "dev-only-insecure-salt-change-me";
const RPC_URL = process.env.RPC_URL || "https://rpc-amoy.polygon.technology";
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS || "0x1111111111111111111111111111111111111111";
const CONTRACT_CONFIGURED = CONTRACT_ADDRESS !== "0x1111111111111111111111111111111111111111";
 
// --- Off-chain issuer allowlist -------------------------------------------
// This is the REAL gatekeeping mechanism for who can authenticate as an
// issuer. It exists independently of the on-chain contract so that:
//   (a) issuer auth still works (fails CLOSED, not open) if the RPC call
//       to isVerifiedIssuer() times out or errors, and
//   (b) the app can gate issuers even before/without a deployed contract.
// Format: comma-separated list of addresses, e.g.
//   ISSUER_ALLOWLIST=0xAbC123...,0xDef456...
// Comparison is case-insensitive (addresses are normalized to lowercase).
const ISSUER_ALLOWLIST = new Set(
  (process.env.ISSUER_ALLOWLIST || "")
    .split(",")
    .map((a) => a.trim().toLowerCase())
    .filter(Boolean)
);
 
/**
 * Decides whether `address` is allowed to authenticate as an issuer.
 *
 * Fails CLOSED, not open:
 *  - If the contract is configured, it is the source of truth. A failed RPC
 *    call is treated as "not verified" (never silently true).
 *  - The off-chain allowlist is checked in addition to the contract, so an
 *    address can be granted issuer rights even if it isn't on-chain yet,
 *    and so you have a working gate even before a contract is deployed.
 *  - If NEITHER the contract nor the allowlist is configured, every address
 *    is rejected. There is no "default true" path.
 */
async function isVerifiedIssuer(address: string): Promise<boolean> {
  const normalized = address.toLowerCase();
 
  if (ISSUER_ALLOWLIST.has(normalized)) return true;
 
  if (CONTRACT_CONFIGURED) {
    try {
      return await contract.isVerifiedIssuer(address);
    } catch (e) {
      console.error(`Issuer verification RPC call failed for ${address}; denying (fail-closed).`, e);
      return false;
    }
  }
 
  // No contract configured and address isn't on the allowlist: deny.
  return false;
}
 
// --- Fail fast on insecure defaults in production. Silent insecure config
// is worse than a crash at startup: better to know immediately. ---
if (IS_PROD) {
  const problems: string[] = [];
  if (JWT_SECRET === "super-secret-key-reputechain") problems.push("JWT_SECRET is using the default dev value.");
  if (ID_HASH_SALT === "dev-only-insecure-salt-change-me") problems.push("ID_HASH_SALT is using the default dev value.");
  if (!CONTRACT_CONFIGURED) problems.push("CONTRACT_ADDRESS is still the placeholder — no real contract configured.");
  if (!CONTRACT_CONFIGURED && ISSUER_ALLOWLIST.size === 0) problems.push("No issuer gatekeeping configured — set CONTRACT_ADDRESS to a real deployed contract and/or ISSUER_ALLOWLIST to a comma-separated list of trusted addresses.");
  if (problems.length > 0) {
    console.error("\n🚨 Refusing to start in production with insecure config:\n" + problems.map(p => " - " + p).join("\n") + "\n");
    process.exit(1);
  }
}
 
const UIDAI_CERT_PATH = process.env.UIDAI_CERT_PATH || path.join(process.cwd(), "certs", "uidai-public-cert.pem");
let uidaiCertPem: string | null = null;
try {
  uidaiCertPem = fs.readFileSync(UIDAI_CERT_PATH, "utf-8");
} catch (e) {
  console.warn(`⚠️  UIDAI public certificate not found at ${UIDAI_CERT_PATH}. QR verification route will reject all requests until this is added.`);
}
 
// Only accept actual image files, and cap size well below the 5MB the UI
// advertises so a malicious payload can't wedge the QR decoder.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 4 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => {
    const allowed = ["image/png", "image/jpeg", "image/webp"];
    if (!allowed.includes(file.mimetype)) {
      return cb(new Error("Only PNG, JPG, or WEBP images are accepted for QR upload."));
    }
    cb(null, true);
  },
});
 
// Separate multer instance for certificate attachments (the PDF/image an
// issuer attaches to a credential, pinned to IPFS). Wider mimetype list and
// a bigger size cap than the QR uploader above, since these are legitimate
// documents rather than a single QR frame.
const documentUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => {
    const allowed = ["image/png", "image/jpeg", "image/webp", "application/pdf"];
    if (!allowed.includes(file.mimetype)) {
      return cb(new Error("Only PNG, JPG, WEBP, or PDF files are accepted."));
    }
    cb(null, true);
  },
});
 
// Pinata (https://pinata.cloud) pins the file to IPFS for us. Get a JWT
// from Pinata's dashboard (API Keys -> New Key) and set it as PINATA_JWT.
// Uploads are rejected with a clear error if this isn't configured, rather
// than silently falling back to a fake URI.
const PINATA_JWT = process.env.PINATA_JWT;
if (!PINATA_JWT) {
  console.warn("⚠️  PINATA_JWT not set. Certificate attachment uploads will be rejected until this is configured.");
}
 
const CONTRACT_ABI = [
  "function verifyCertificate(string certificateId) external view returns (address issuer, address subject, string dataHash, string metadataURI, uint256 issuedAt, uint256 expiresAt, bool isRevoked, bool isValid, uint8 category)",
  "function issueCertificate(string certificateId, address subject, string dataHash, string metadataURI, uint256 expiresAt, uint8 category, uint256 reputationBoost) external",
  "function revokeCertificate(string certificateId) external",
  "function isVerifiedIssuer(address) external view returns (bool)",
  "function reputationScore(address) external view returns (uint256)"
];
 
const provider = new ethers.JsonRpcProvider(RPC_URL);
let contract: ethers.Contract;
let signer: ethers.Wallet | undefined;
 
if (process.env.ISSUER_PRIVATE_KEY) {
  signer = new ethers.Wallet(process.env.ISSUER_PRIVATE_KEY, provider);
  contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
} else {
  contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
}
 
const nonces = new Map<string, string>();
 
function hashIdentityNumber(normalized: string): string {
  return crypto.createHmac("sha256", ID_HASH_SALT).update(normalized).digest("hex");
}
 
/** True if this is a Postgres "unique_violation" (code 23505) — used to catch
 *  race conditions where two requests slip past the pre-check simultaneously. */
function isUniqueViolation(e: any): boolean {
  return e?.code === "23505" || e?.cause?.code === "23505";
}
 
/** True if the table/column doesn't exist — the classic "schema.ts was
 *  updated but `drizzle-kit push` was never run against this DB" symptom.
 *  Postgres codes: 42P01 = relation (table) does not exist,
 *  42703 = column does not exist. */
function isSchemaError(e: any): boolean {
  const code = e?.code || e?.cause?.code;
  return code === "42P01" || code === "42703";
}
 
/** True if the error looks like a lost/refused/auth-failed DB connection
 *  (wrong password, host unreachable, Neon project paused/suspended, etc.)
 *  rather than a problem with the request data itself. */
function isDbConnectionError(e: any): boolean {
  const code = e?.code || e?.cause?.code;
  const connectionCodes = ["ECONNREFUSED", "ENOTFOUND", "ETIMEDOUT", "28P01", "3D000", "57P03"];
  if (connectionCodes.includes(code)) return true;
  const msg = String(e?.message || "").toLowerCase();
  return msg.includes("password authentication failed")
    || msg.includes("connection terminated")
    || msg.includes("timeout expired")
    || msg.includes("connect econnrefused");
}
 
async function issueIdentityBadge(opts: {
  userAddress: string;
  category: number;
  boost: number;
  courseName: string;
  identityHash: string | null;
  maskedId: string | null;
  verificationMethod: "format" | "qr_signature";
}): Promise<{ hash: string; txHash: string }> {
  const hash = ethers.id(`${opts.courseName}-${opts.userAddress}-${Date.now()}`);
 
  // Aadhaar self-verification is intentionally OFF-CHAIN ONLY — it never
  // calls the contract, so it never needs gas/MATIC in the issuer wallet.
  // This is different from issuer-issued certificates (see handleIssue /
  // /api/issue), which still mint on-chain as before. Self-verification is
  // just proving "this wallet passed a format/signature check," which
  // doesn't need blockchain permanence the way an issued credential does.
  if (db) {
    await db.insert(certificatesTable).values({
      hash,
      recipientName: "Self Verified",
      courseName: opts.courseName,
      issuerName: "ReputeChain System",
      issuerAddress: CONTRACT_ADDRESS,
      subjectAddress: opts.userAddress,
      category: opts.category.toString(),
      metadataURI: "",
      identityHash: opts.identityHash,
      maskedId: opts.maskedId,
      verificationMethod: opts.verificationMethod,
    });
    // Note: no try/catch swallow here on purpose — a unique-violation must
    // propagate to the caller so it can be turned into a 409, not silently
    // dropped.
  }
 
  return { hash, txHash: "off-chain" };
}
 
async function checkDuplicateIdentity(identityHash: string, userAddress: string): Promise<string | null> {
  if (!db) return null;
  try {
    const existing = await db
      .select()
      .from(certificatesTable)
      .where(eq(certificatesTable.identityHash, identityHash))
      .limit(1);
 
    if (existing.length > 0 && existing[0].subjectAddress !== userAddress) {
      return "This Aadhaar is already linked to another wallet.";
    }
    if (existing.length > 0 && existing[0].subjectAddress === userAddress) {
      return "You have already verified this Aadhaar.";
    }
  } catch (e) {
    console.warn("Could not check for duplicate identity hash", e);
  }
  return null;
}
 
async function startServer() {
  app.use(express.json());
  app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
  app.use(cors());
 
  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: "Too many requests from this IP",
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
      const forwarded = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim();
      return ipKeyGenerator(forwarded || req.ip || "unknown");
    },
  });
  app.use("/api/", apiLimiter);
 
  // Tighter limiter specifically for identity verification — these are
  // higher-value targets for abuse (checksum brute forcing, QR spam) than
  // ordinary reads, so they get a much smaller allowance.
  const identityLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 10,
    message: "Too many identity verification attempts. Try again later.",
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
      const forwarded = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim();
      return ipKeyGenerator(forwarded || req.ip || "unknown");
    },
  });
 
  app.get("/api/health", async (req, res) => {
    const dbStatus = await testDbConnection();
    res.json({ status: "ok", db: dbStatus });
  });
 
  app.get("/api/auth/nonce", (req, res) => {
    const nonce = generateNonce();
    const id = req.ip || "unknown";
    nonces.set(id, nonce);
    res.json({ nonce });
  });
 
  app.post("/api/auth/verify", async (req, res) => {
    try {
      const { message, signature } = req.body;
      const siweMessage = new SiweMessage(message);
      const id = req.ip || "unknown";
      const expectedNonce = nonces.get(id);
 
      const fields = await siweMessage.verify({ signature, nonce: expectedNonce });
      nonces.delete(id);
 
      // Login is open to any wallet that can sign a valid SIWE message —
      // it just proves address ownership. Whether this address is allowed
      // to issue certificates is a separate, per-route authorization check
      // (see requireIssuer below), not a login gate.
      const token = jwt.sign({ address: fields.data.address }, JWT_SECRET, { expiresIn: '1d' });
      res.json({ success: true, token, address: fields.data.address });
    } catch (e) {
      res.status(400).json({ error: "Invalid signature" });
    }
  });
 
  const requireAuth = (req: any, res: any, next: any) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: "No token provided" });
    const token = authHeader.split(" ")[1];
    try {
      req.user = jwt.verify(token, JWT_SECRET) as { address: string };
      next();
    } catch (e) {
      res.status(401).json({ error: "Invalid token" });
    }
  };
 
  // Issuer-only gate: use on top of requireAuth for actions that must be
  // restricted to verified issuers (issuing/revoking certificates, uploading
  // attachments) — NOT on login or on read-only holder routes like
  // /api/my-badges or /api/profile.
  const requireIssuer = async (req: any, res: any, next: any) => {
    try {
      const isIssuer = await isVerifiedIssuer(req.user.address);
      if (!isIssuer) return res.status(403).json({ error: "Address is not a verified issuer." });
      next();
    } catch (e) {
      res.status(500).json({ error: "Issuer check failed." });
    }
  };
 
  // Used by the Issuer Dashboard right after login to decide whether this
  // address should even be let into the portal. Login itself stays open to
  // any wallet (see /api/auth/verify) — this is a page-level gate, not a
  // login gate, so Digital Vault / Profile keep working for non-issuers.
  app.get("/api/auth/is-issuer", requireAuth, async (req: any, res: any) => {
    try {
      const isIssuer = await isVerifiedIssuer(req.user.address);
      res.json({ isIssuer });
    } catch (e) {
      res.status(500).json({ error: "Issuer check failed." });
    }
  });
 
  app.get("/api/verify/:hash", async (req, res) => {
    try {
      const hash = req.params.hash;
      let onChainData;
      let onChainReverted = false;
      try {
        if (CONTRACT_ADDRESS !== "0x1111111111111111111111111111111111111111") {
          onChainData = await contract.verifyCertificate(hash);
        }
      } catch (e: any) {
        // Don't bail out here — a revert just means this certificate isn't
        // on-chain (e.g. it was only saved off-chain, or the on-chain write
        // hadn't been configured yet at issue time). Fall through and check
        // the database before giving up.
        onChainReverted = true;
      }
 
      let metadata = null;
      if (db) {
        try {
          const result = await db.select().from(certificatesTable).where(eq(certificatesTable.hash, hash)).limit(1);
          if (result.length > 0) metadata = result[0];
        } catch (e) {}
      }
 
      if (!onChainData) {
        if (metadata) {
          return res.json({
            verified: true,
            onChain: false,
            data: {
              hash: metadata.hash,
              recipientName: metadata.recipientName,
              courseName: metadata.courseName,
              issuerName: metadata.issuerName,
              issuedAt: metadata.issuedAt,
              revoked: metadata.revoked,
              verificationMethod: metadata.verificationMethod,
              maskedId: metadata.maskedId,
            }
          });
        }
        return res.status(404).json({ verified: false, error: "Certificate not found." });
      }
 
      res.json({
        verified: true,
        onChain: true,
        data: {
          hash: onChainData.dataHash,
          issuerAddress: onChainData.issuer,
          issuedAt: new Date(Number(onChainData.issuedAt) * 1000).toISOString(),
          revoked: onChainData.isRevoked,
          isValid: onChainData.isValid,
          ...metadata
        }
      });
    } catch (e) {
      res.status(500).json({ error: "Server error" });
    }
  });
 
  // Pins an issuer's certificate attachment (PDF/image) to IPFS via Pinata
  // and hands back an ipfs:// URI to store as the certificate's metadataURI.
  // This replaces what used to be a fake setTimeout + random string.
  app.post(
    "/api/upload-metadata",
    requireAuth,
    requireIssuer,
    (req, res, next) => {
      documentUpload.single("file")(req, res, (err) => {
        if (err) return res.status(400).json({ error: err.message || "Upload rejected." });
        next();
      });
    },
    async (req: any, res: any) => {
      try {
        if (!PINATA_JWT) {
          return res.status(503).json({ error: "File uploads are temporarily unavailable." });
        }
        if (!req.file) {
          return res.status(400).json({ error: "No file uploaded (field name: file)." });
        }
 
        const form = new FormData();
        form.append("file", new Blob([req.file.buffer], { type: req.file.mimetype }), req.file.originalname);
        form.append("pinataMetadata", JSON.stringify({ name: req.file.originalname }));
 
        const pinataRes = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
          method: "POST",
          headers: { Authorization: `Bearer ${PINATA_JWT}` },
          body: form,
        });
 
        if (!pinataRes.ok) {
          const errText = await pinataRes.text().catch(() => "");
          console.error("Pinata upload failed:", pinataRes.status, errText);
          return res.status(502).json({ error: "Failed to pin file to IPFS." });
        }
 
        const pinataData = await pinataRes.json();
        const cid = pinataData.IpfsHash;
        if (!cid) {
          return res.status(502).json({ error: "IPFS pinning service returned an unexpected response." });
        }
 
        res.json({ success: true, metadataURI: `ipfs://${cid}`, cid });
      } catch (e: any) {
        console.error("upload-metadata error:", e);
        res.status(500).json({ error: "Failed to upload file." });
      }
    }
  );
 
  app.post("/api/issue", requireAuth, requireIssuer, async (req: any, res: any) => {
    try {
      const { recipientName, courseName, issuerName, expiry, metadataURI, subjectAddress } = req.body;
      if (!recipientName) return res.status(400).json({ error: "Missing required fields" });
 
      const expiresAt = expiry ? Math.floor(new Date(expiry).getTime() / 1000) : 0;
      const uri = metadataURI || "";
      const subject = subjectAddress || ethers.ZeroAddress;
 
      // Certificate ID is derived server-side from the actual credential
      // content, not accepted from the client. crypto.randomUUID() is mixed
      // in purely to guarantee uniqueness if the exact same credential is
      // re-issued (e.g. re-run of a bulk CSV) — it does not make the hash
      // "random"; every other field is real credential data.
      const hash = ethers.id(
        `${recipientName}|${courseName || ""}|${issuerName || ""}|${req.user.address}|${subject}|${Date.now()}|${crypto.randomUUID()}`
      );
 
      let txHash = "mock-tx-hash";
      if (signer && CONTRACT_ADDRESS !== "0x1111111111111111111111111111111111111111") {
        const tx = await contract.issueCertificate(hash, subject, hash, uri, expiresAt, 0, 10);
        const receipt = await tx.wait();
        txHash = receipt.hash;
      }
 
      if (db) {
        try {
          await db.insert(certificatesTable).values({
            hash, recipientName, courseName, issuerName,
            issuerAddress: req.user.address,
            subjectAddress: subject,
            expiresAt: expiry ? new Date(expiry) : null,
            metadataURI: uri
          });
        } catch (e) {
          console.warn("DB insert failed, skipping off-chain metadata");
        }
      }
 
      res.json({ success: true, hash, txHash });
    } catch (e: any) {
      res.status(500).json({ error: "Failed to issue certificate." });
    }
  });
 
  // --- Option 1: manual masked-number entry (Verhoeff checksum only — weak) ---
  app.post("/api/verify-identity", requireAuth, identityLimiter, async (req: any, res: any) => {
    try {
      const { type, idNumber } = req.body;
      const userAddress = req.user.address;
 
      let category = 1;
      let boost = 0;
      switch (type) {
        case "aadhaar": boost = 50; category = 1; break;
        case "gov": boost = 30; category = 1; break;
        case "github": boost = 80; category = 2; break;
        case "work": boost = 40; category = 3; break;
        default: return res.status(400).json({ error: "Invalid verification type" });
      }
 
      let identityHash: string | null = null;
      let maskedId: string | null = null;
 
      if (type === "aadhaar") {
        if (!idNumber || typeof idNumber !== "string") {
          return res.status(400).json({ error: "Aadhaar number is required." });
        }
        const result = validateAadhaar(idNumber);
        if (!result.valid) return res.status(400).json({ error: result.reason || "Invalid Aadhaar number." });
 
        const normalized = normalizeAadhaar(idNumber);
        identityHash = hashIdentityNumber(normalized);
        maskedId = maskAadhaar(normalized);
 
        const dupError = await checkDuplicateIdentity(identityHash, userAddress);
        if (dupError) return res.status(409).json({ error: dupError });
      }
 
      try {
        const { hash, txHash } = await issueIdentityBadge({
          userAddress, category, boost, courseName: type,
          identityHash, maskedId, verificationMethod: "format",
        });
        // hash is the certificate ID — always returned so the client can
        // display it and let the user verify it via GET /api/verify/:hash
        res.json({ success: true, txHash, hash, boost, category, maskedId, verificationMethod: "format" });
      } catch (e: any) {
        if (isUniqueViolation(e)) {
          return res.status(409).json({ error: "This Aadhaar is already linked to a wallet." });
        }
        throw e;
      }
    } catch (e: any) {
      console.error("verify-identity error:", e);
      // Distinguish "your DB/RPC config is broken" from "the request itself
      // was bad" — the old generic message made both look identical and
      // impossible to debug from the client side.
      if (isDbConnectionError(e)) {
        return res.status(503).json({ error: "Database is unreachable right now — check DATABASE_URL / Neon status, then try again." });
      }
      if (isSchemaError(e)) {
        return res.status(503).json({ error: "Database schema is out of date — the certificates table/columns are missing. Run migrations against this database, then try again." });
      }
      res.status(500).json({ error: "Failed to verify identity." });
    }
  });
 
  // --- Option 2: QR code from e-Aadhaar, UIDAI digital signature verified (strong) ---
  app.post(
    "/api/verify-identity/aadhaar-qr",
    requireAuth,
    identityLimiter,
    (req, res, next) => {
      upload.single("qrImage")(req, res, (err) => {
        if (err) return res.status(400).json({ error: err.message || "Upload rejected." });
        next();
      });
    },
    async (req: any, res: any) => {
      try {
        if (!uidaiCertPem) {
          return res.status(503).json({ error: "Identity verification is temporarily unavailable." });
        }
        if (!req.file) {
          return res.status(400).json({ error: "No QR image uploaded (field name: qrImage)." });
        }
 
        const userAddress = req.user.address;
 
        let rawPayload: Buffer;
        try {
          rawPayload = await decodeQrFromImage(req.file.buffer);
        } catch (e: any) {
          return res.status(400).json({ error: "Could not read a valid QR code from that image." });
        }
 
        const verification = verifyAadhaarQrPayload(rawPayload, uidaiCertPem);
 
        if (!verification.signatureValid) {
          // Deliberately generic — don't leak parser internals to the client.
          return res.status(400).json({ error: "Aadhaar signature could not be verified." });
        }
        if (!verification.last4) {
          return res.status(400).json({ error: "Verified signature but could not extract reference data." });
        }
 
        const identitySeed = `${verification.last4}-${verification.fields?.name || ""}`.toLowerCase();
        const identityHash = hashIdentityNumber(identitySeed);
        const maskedId = `XXXX-XXXX-${verification.last4}`;
 
        const dupError = await checkDuplicateIdentity(identityHash, userAddress);
        if (dupError) return res.status(409).json({ error: dupError });
 
        try {
          const { hash, txHash } = await issueIdentityBadge({
            userAddress, category: 1, boost: 70, courseName: "aadhaar",
            identityHash, maskedId, verificationMethod: "qr_signature",
          });
 
          res.json({
            success: true,
            txHash,
            hash, // <-- certificate hash; display this and link to /verify/:hash
            boost: 70,
            category: 1,
            maskedId,
            verificationMethod: "qr_signature",
            verifiedFields: {
              name: verification.fields?.name,
              gender: verification.fields?.gender,
              dob: verification.fields?.dob,
            },
          });
        } catch (e: any) {
          if (isUniqueViolation(e)) {
            return res.status(409).json({ error: "This Aadhaar is already linked to a wallet." });
          }
          throw e;
        }
      } catch (e: any) {
        console.error("aadhaar-qr verification error:", e);
        if (isDbConnectionError(e)) {
          return res.status(503).json({ error: "Database is unreachable right now — check DATABASE_URL / Neon status, then try again." });
        }
        if (isSchemaError(e)) {
          return res.status(503).json({ error: "Database schema is out of date — the certificates table/columns are missing. Run migrations against this database, then try again." });
        }
        res.status(500).json({ error: "Failed to verify Aadhaar QR." });
      }
    }
  );
 
  app.get("/api/my-badges", requireAuth, async (req: any, res: any) => {
    try {
      if (!db) return res.json({ badges: [] });
      const records = await db.select().from(certificatesTable)
        .where(eq(certificatesTable.subjectAddress, req.user.address))
        .orderBy(desc(certificatesTable.issuedAt));
      res.json({ badges: records });
    } catch (e: any) {
      // Previously this silently returned an empty list on ANY error,
      // which made real DB/schema problems look identical to "you just
      // don't have any badges yet." Log it loudly so it's not invisible.
      console.error("my-badges error:", e);
      if (isDbConnectionError(e) || isSchemaError(e)) {
        return res.status(503).json({ error: "Could not load badges — database issue, check server logs.", badges: [] });
      }
      res.json({ badges: [] });
    }
  });
 
  app.get("/api/profile", requireAuth, async (req: any, res: any) => {
    try {
      let score = 150;
      if (CONTRACT_ADDRESS !== "0x1111111111111111111111111111111111111111") {
        try {
          const onChainScore = await contract.reputationScore(req.user.address);
          score += Number(onChainScore);
        } catch (e) {}
      }
      res.json({ score });
    } catch (e) {
      res.status(500).json({ error: "Server error" });
    }
  });
 
  app.post("/api/revoke/:hash", requireAuth, requireIssuer, async (req: any, res: any) => {
    try {
      const hash = req.params.hash;
      if (signer && CONTRACT_ADDRESS !== "0x1111111111111111111111111111111111111111") {
        const tx = await contract.revokeCertificate(hash);
        await tx.wait();
      }
      if (db) {
        try {
          await db.update(certificatesTable).set({ revoked: true }).where(eq(certificatesTable.hash, hash));
        } catch (e) {}
      }
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: "Failed to revoke certificate." });
    }
  });
 
  app.get("/api/certificates", requireAuth, requireIssuer, async (req: any, res: any) => {
    if (!db) return res.json({ data: [] });
    try {
      const records = await db.select().from(certificatesTable).where(eq(certificatesTable.issuerAddress, req.user.address)).orderBy(desc(certificatesTable.issuedAt));
      res.json({ data: records });
    } catch (e) {
      res.json({ data: [] });
    }
  });
 
  if (!IS_PROD) {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => res.sendFile(path.join(distPath, "index.html")));
  }
 
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`\n  ReputeChain server ready\n`);
    console.log(`  ➜  Local:   http://localhost:${PORT}/`);
    console.log(`  ➜  Network: http://0.0.0.0:${PORT}/\n`);
  });
}
 
startServer();