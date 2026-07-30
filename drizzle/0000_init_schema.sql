CREATE TABLE "api_keys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key_hash" text NOT NULL,
	"issuer_address" varchar(42) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "certificates" (
	"hash" varchar(255) PRIMARY KEY NOT NULL,
	"recipient_name" text NOT NULL,
	"course_name" text NOT NULL,
	"issuer_name" text NOT NULL,
	"issuer_address" varchar(42) NOT NULL,
	"subject_address" varchar(42),
	"category" varchar(50),
	"issued_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp,
	"revoked" boolean DEFAULT false NOT NULL,
	"metadata_uri" text,
	"identity_hash" varchar(64),
	"masked_id" varchar(20),
	"verification_method" varchar(20)
);
--> statement-breakpoint
CREATE TABLE "verification_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"certificate_hash" varchar(255) NOT NULL,
	"checked_at" timestamp DEFAULT now() NOT NULL,
	"success" boolean NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "certificates_identity_hash_unique" ON "certificates" USING btree ("identity_hash");