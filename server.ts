
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
import { db } from "./src/db/index";
import { certificates as certificatesTable } from "./src/db/schema";
import { eq, desc } from "drizzle-orm";
import { validateAadhaar, maskAadhaar, normalizeAadhaar } from "./src/lib/utils";
import { decodeQrFromImage, verifyAadhaarQrPayload } from "./src/lib/aadhaarQr";
 
const app = express();
app.set("trust proxy", 1);
const PORT = 3000;
const IS_PROD = process.env.NODE_ENV === "production";
 
const JWT_SECRET = process.env.JWT_SECRET || "super-secret-key-reputechain";
const ID_HASH_SALT = process.env.ID_HASH_SALT || "dev-only-insecure-salt-change-me";
const RPC_URL = process.env.RPC_URL || "https://rpc-amoy.polygon.technology";
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS || "0x1111111111111111111111111111111111111111";
 
// --- Fail fast on insecure defaults in production. Silent insecure config
// is worse than a crash at startup: better to know immediately. ---
if (IS_PROD) {
  const problems: string[] = [];
  if (JWT_SECRET === "super-secret-key-reputechain") problems.push("JWT_SECRET is using the default dev value.");
  if (ID_HASH_SALT === "dev-only-insecure-salt-change-me") problems.push("ID_HASH_SALT is using the default dev value.");
  if (CONTRACT_ADDRESS === "0x1111111111111111111111111111111111111111") problems.push("CONTRACT_ADDRESS is still the placeholder — no real contract configured.");
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
 
  let txHash = "mock-tx-hash";
  if (signer && CONTRACT_ADDRESS !== "0x1111111111111111111111111111111111111111") {
    const tx = await contract.issueCertificate(hash, opts.userAddress, hash, "", 0, opts.category, opts.boost);
    const receipt = await tx.wait();
    txHash = receipt.hash;
  }
 
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
    // dropped (which would mint an on-chain badge with no off-chain record).
  }
 
  return { hash, txHash };
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
 
  app.get("/api/health", (req, res) => res.json({ status: "ok" }));
 
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
 
      let isIssuer = true;
      if (CONTRACT_ADDRESS !== "0x1111111111111111111111111111111111111111") {
        try {
          isIssuer = await contract.isVerifiedIssuer(fields.data.address);
        } catch (e) {
          console.warn("Could not verify issuer on-chain, defaulting to true for demo");
        }
      }
      if (!isIssuer) return res.status(403).json({ error: "Address is not a verified issuer." });
 
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
 
  app.get("/api/verify/:hash", async (req, res) => {
    try {
      const hash = req.params.hash;
      let onChainData;
      try {
        if (CONTRACT_ADDRESS !== "0x1111111111111111111111111111111111111111") {
          onChainData = await contract.verifyCertificate(hash);
        }
      } catch (e: any) {
        if (e.message?.includes("certificate not found")) {
          return res.status(404).json({ verified: false, error: "Certificate not found on-chain." });
        }
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
 
  app.post("/api/issue", requireAuth, async (req: any, res: any) => {
    try {
      const { hash, recipientName, courseName, issuerName, expiry, metadataURI, subjectAddress } = req.body;
      if (!hash || !recipientName) return res.status(400).json({ error: "Missing required fields" });
 
      const expiresAt = expiry ? Math.floor(new Date(expiry).getTime() / 1000) : 0;
      const uri = metadataURI || "";
      const subject = subjectAddress || ethers.ZeroAddress;
 
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
    } catch (e) {
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
 
  app.post("/api/revoke/:hash", requireAuth, async (req: any, res: any) => {
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
 
  app.get("/api/certificates", requireAuth, async (req: any, res: any) => {
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
 