
import { pgTable, text, timestamp, boolean, uuid, varchar, uniqueIndex } from "drizzle-orm/pg-core";
 
export const certificates = pgTable("certificates", {
  hash: varchar("hash", { length: 255 }).primaryKey(),
  recipientName: text("recipient_name").notNull(),
  courseName: text("course_name").notNull(),
  issuerName: text("issuer_name").notNull(),
  issuerAddress: varchar("issuer_address", { length: 42 }).notNull(),
  subjectAddress: varchar("subject_address", { length: 42 }),
  category: varchar("category", { length: 50 }),
  issuedAt: timestamp("issued_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at"),
  revoked: boolean("revoked").default(false).notNull(),
  metadataURI: text("metadata_uri"),
 
  // --- Identity verification fields (Aadhaar / gov ID etc.) ---
  // We NEVER store the raw ID number. `identityHash` is a salted HMAC hash
  // used to detect the same ID being used to verify more than one wallet.
  // `maskedId` is the display-safe form (e.g. "XXXX-XXXX-1234").
  identityHash: varchar("identity_hash", { length: 64 }),
  maskedId: varchar("masked_id", { length: 20 }),
 
  // 'format'         -> manual number entry, Verhoeff checksum only (weak)
  // 'qr_signature'   -> QR code from e-Aadhaar, UIDAI digital signature verified (strong)
  verificationMethod: varchar("verification_method", { length: 20 }),
}, (table) => ({
  // DB-level enforcement (not just an app-level check-then-insert) so two
  // concurrent requests with the same Aadhaar can't both slip through.
  // Postgres treats multiple NULLs as distinct, so non-identity badges
  // (identityHash = null) are unaffected.
  identityHashUnique: uniqueIndex("certificates_identity_hash_unique").on(table.identityHash),
}));
 
export const apiKeys = pgTable("api_keys", {
  id: uuid("id").defaultRandom().primaryKey(),
  keyHash: text("key_hash").notNull(),
  issuerAddress: varchar("issuer_address", { length: 42 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
 
export const verificationLogs = pgTable("verification_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  certificateHash: varchar("certificate_hash", { length: 255 }).notNull(),
  checkedAt: timestamp("checked_at").defaultNow().notNull(),
  success: boolean("success").notNull(),
});