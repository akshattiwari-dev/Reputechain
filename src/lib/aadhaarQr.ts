
import jsQR from "jsqr";
import Jimp from "jimp";
import zlib from "zlib";
import crypto from "crypto";
 
/**
 * UIDAI "Secure QR Code" verification.
 *
 * Every Aadhaar (printed card, PVC card, and the e-Aadhaar PDF) embeds a QR
 * code whose payload is digitally signed by UIDAI using their private key.
 * We verify that signature against UIDAI's *published* public certificate.
 * This proves the demographic data was genuinely issued by UIDAI and has not
 * been tampered with — it does NOT prove the person submitting it is the
 * same person the Aadhaar belongs to (that requires live OTP/biometric eKYC,
 * which needs an AUA/KUA license, out of scope here).
 *
 * IMPORTANT: You must obtain UIDAI's public certificate yourself from their
 * official resources page and place it at the path below (or point
 * UIDAI_CERT_PATH at it). Do not use a certificate from any other source.
 * See: https://uidai.gov.in -> Resources -> "Aadhaar Paperless Offline e-KYC"
 * or "Secure QR Code" documentation for the current certificate download.
 */
 
const SIGNATURE_LENGTH_BYTES = 256; // RSA-2048 signature
 
export interface AadhaarQrFields {
  referenceId: string; // contains last 4 digits of Aadhaar + a timestamp, per UIDAI spec
  name: string;
  dob: string;
  gender: string;
  pincode?: string;
  state?: string;
  vtc?: string; // village/town/city
}
 
export interface AadhaarQrVerificationResult {
  signatureValid: boolean;
  fields?: AadhaarQrFields;
  last4?: string;
  error?: string;
}
 
/** Decodes a QR code from an image buffer (PNG/JPG) into its raw payload bytes. */
export async function decodeQrFromImage(imageBuffer: Buffer): Promise<Buffer> {
  const image = await Jimp.read(imageBuffer);
  const { width, height, data } = image.bitmap; // data is already RGBA
 
  const result = jsQR(new Uint8ClampedArray(data), width, height);
  if (!result) {
    throw new Error("No QR code detected in the uploaded image.");
  }
 
  // jsQR gives back a string; Aadhaar Secure QR payloads are binary
  // (gzip-compressed), so we need the raw bytes, not the JS string
  // interpretation. jsQR exposes binaryData for this reason.
  if (!result.binaryData || result.binaryData.length === 0) {
    throw new Error("QR code decoded but contained no binary payload.");
  }
 
  return Buffer.from(result.binaryData);
}
 
/** Splits the decompressed payload into UIDAI's delimited fields + trailing signature. */
function parseDecompressedPayload(decompressed: Buffer): {
  signedData: Buffer;
  signature: Buffer;
  fields: AadhaarQrFields;
} {
  if (decompressed.length <= SIGNATURE_LENGTH_BYTES) {
    throw new Error("Payload too short to contain a valid signature.");
  }
 
  const signature = decompressed.subarray(decompressed.length - SIGNATURE_LENGTH_BYTES);
  const signedData = decompressed.subarray(0, decompressed.length - SIGNATURE_LENGTH_BYTES);
 
  // UIDAI delimits demographic text fields with 0xFF within the signed
  // portion, ending before the embedded photo bytes. Field order per the
  // published Secure QR v2 spec:
  // [0] email/mobile bitmask, [1] referenceId, [2] name, [3] dob,
  // [4] gender, [5] careOf, [6] district, [7] landmark, [8] house,
  // [9] location, [10] pincode, [11] postOffice, [12] state, [13] street,
  // [14] subDistrict, [15] vtc, ... [then binary photo bytes]
  //
  // NOTE: UIDAI has revised this format before (v1 vs v2 QR differ), so
  // verify field indices against a real sample from your target users and
  // adjust the indices below if they don't line up.
  const DELIMITER = 0xff;
  const parts: Buffer[] = [];
  let start = 0;
  let fieldsCollected = 0;
  const MAX_TEXT_FIELDS = 16; // stop once we hit the photo binary blob
 
  for (let i = 0; i < signedData.length && fieldsCollected < MAX_TEXT_FIELDS; i++) {
    if (signedData[i] === DELIMITER) {
      parts.push(signedData.subarray(start, i));
      start = i + 1;
      fieldsCollected++;
    }
  }
 
  if (parts.length < 5) {
    throw new Error(
      "Could not parse expected demographic fields from QR payload — this may be an unsupported QR version."
    );
  }
 
  const fields: AadhaarQrFields = {
    referenceId: parts[1]?.toString("utf-8") || "",
    name: parts[2]?.toString("utf-8") || "",
    dob: parts[3]?.toString("utf-8") || "",
    gender: parts[4]?.toString("utf-8") || "",
    pincode: parts[10]?.toString("utf-8"),
    state: parts[12]?.toString("utf-8"),
    vtc: parts[15]?.toString("utf-8"),
  };
 
  return { signedData, signature, fields };
}
 
/**
 * Full pipeline: raw QR binary payload -> gzip decompress -> parse fields ->
 * verify UIDAI's RSA-SHA256 signature against their public certificate.
 */
export function verifyAadhaarQrPayload(
  rawQrPayload: Buffer,
  uidaiPublicCertPem: string
): AadhaarQrVerificationResult {
  try {
    const decompressed = zlib.gunzipSync(rawQrPayload);
    const { signedData, signature, fields } = parseDecompressedPayload(decompressed);
 
    const verifier = crypto.createVerify("RSA-SHA256");
    verifier.update(signedData);
    const signatureValid = verifier.verify(uidaiPublicCertPem, signature);
 
    // The referenceId embeds the last 4 digits of the Aadhaar number as
    // per UIDAI's spec (first 4 chars in the common implementations) —
    // confirm against a real sample and adjust the slice if needed.
    const last4 = fields.referenceId?.slice(0, 4);
 
    return { signatureValid, fields, last4 };
  } catch (e: any) {
    return { signatureValid: false, error: e.message || "Failed to parse/verify QR payload." };
  }
}
 