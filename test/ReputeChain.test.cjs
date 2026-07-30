const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ReputeChain", function () {
  let reputeChain, owner, issuer, other;

  beforeEach(async function () {
    [owner, issuer, other] = await ethers.getSigners();
    const ReputeChain = await ethers.getContractFactory("ReputeChain");
    reputeChain = await ReputeChain.deploy();
    await reputeChain.waitForDeployment();
    await reputeChain.addIssuer(issuer.address);
  });

  it("Should allow a verified issuer to issue a certificate", async function () {
    const certId = "cert123";
    const dataHash = "0xabc...";
    const uri = "ipfs://Qm...";
    const expiry = 0;

    await expect(reputeChain.connect(issuer).issueCertificate(certId, dataHash, uri, expiry))
      .to.emit(reputeChain, "CertificateIssued")
      .withArgs(certId, issuer.address, dataHash);

    const cert = await reputeChain.verifyCertificate(certId);
    expect(cert.issuer).to.equal(issuer.address);
    expect(cert.dataHash).to.equal(dataHash);
    expect(cert.isValid).to.equal(true);
  });

  it("Should reject duplicate certificate IDs", async function () {
    await reputeChain.connect(issuer).issueCertificate("cert1", "hash1", "uri1", 0);
    await expect(
      reputeChain.connect(issuer).issueCertificate("cert1", "hash2", "uri2", 0)
    ).to.be.revertedWith("ReputeChain: certificate already exists");
  });

  it("Should allow issuer to revoke their certificate", async function () {
    await reputeChain.connect(issuer).issueCertificate("cert1", "hash1", "uri1", 0);
    await expect(reputeChain.connect(issuer).revokeCertificate("cert1"))
      .to.emit(reputeChain, "CertificateRevoked")
      .withArgs("cert1", issuer.address);

    const cert = await reputeChain.verifyCertificate("cert1");
    expect(cert.isRevoked).to.equal(true);
    expect(cert.isValid).to.equal(false);
  });

  it("Should revert revocation by non-issuer", async function () {
    await reputeChain.connect(issuer).issueCertificate("cert1", "hash1", "uri1", 0);
    await expect(
      reputeChain.connect(other).revokeCertificate("cert1")
    ).to.be.revertedWith("ReputeChain: only the issuer can revoke");
  });

  it("Should handle expiry correctly", async function () {
    const expiry = Math.floor(Date.now() / 1000) - 3600; // 1 hour ago
    await reputeChain.connect(issuer).issueCertificate("certExpired", "hash", "uri", expiry);

    const cert = await reputeChain.verifyCertificate("certExpired");
    expect(cert.isValid).to.equal(false);
  });
});
