// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title ReputeChain
 * @dev Industry-grade contract for issuing and verifying certificate hashes on-chain.
 */
contract ReputeChain {
    address public owner;

    enum Category { Academic, Identity, Github, Work, Other }

    struct Certificate {
        address issuer;
        address subject;
        string dataHash;
        string metadataURI;
        uint256 issuedAt;
        uint256 expiresAt; // 0 means never expires
        bool revoked;
        Category category;
    }

    // Mapping from verified issuers to authorization status
    mapping(address => bool) public isVerifiedIssuer;

    // Mapping from unique certificate ID (often identical to dataHash) to Certificate data
    mapping(string => Certificate) public certificates;

    // Reputation Score per user
    mapping(address => uint256) public reputationScore;

    event IssuerAdded(address indexed issuer);
    event IssuerRemoved(address indexed issuer);
    event CertificateIssued(string indexed certificateId, address indexed issuer, address indexed subject, string dataHash, Category category);
    event CertificateRevoked(string indexed certificateId, address indexed issuer);
    event ReputationBoosted(address indexed user, uint256 amount);

    modifier onlyOwner() {
        require(msg.sender == owner, "ReputeChain: caller is not the owner");
        _;
    }

    modifier onlyIssuer() {
        require(isVerifiedIssuer[msg.sender], "ReputeChain: caller is not a verified issuer");
        _;
    }

    constructor() {
        owner = msg.sender;
        // The deployer is automatically a verified issuer for simplicity
        isVerifiedIssuer[msg.sender] = true;
    }

    function addIssuer(address _issuer) external onlyOwner {
        isVerifiedIssuer[_issuer] = true;
        emit IssuerAdded(_issuer);
    }

    function removeIssuer(address _issuer) external onlyOwner {
        isVerifiedIssuer[_issuer] = false;
        emit IssuerRemoved(_issuer);
    }

    function issueCertificate(
        string memory certificateId,
        address subject,
        string memory dataHash,
        string memory metadataURI,
        uint256 expiresAt,
        Category category,
        uint256 reputationBoost
    ) external onlyIssuer {
        require(certificates[certificateId].issuer == address(0), "ReputeChain: certificate already exists");

        certificates[certificateId] = Certificate({
            issuer: msg.sender,
            subject: subject,
            dataHash: dataHash,
            metadataURI: metadataURI,
            issuedAt: block.timestamp,
            expiresAt: expiresAt,
            revoked: false,
            category: category
        });

        if (subject != address(0) && reputationBoost > 0) {
            reputationScore[subject] += reputationBoost;
            emit ReputationBoosted(subject, reputationBoost);
        }

        emit CertificateIssued(certificateId, msg.sender, subject, dataHash, category);
    }

    function revokeCertificate(string memory certificateId) external {
        Certificate storage cert = certificates[certificateId];
        require(cert.issuer != address(0), "ReputeChain: certificate does not exist");
        require(cert.issuer == msg.sender, "ReputeChain: only the issuer can revoke");
        require(!cert.revoked, "ReputeChain: already revoked");

        cert.revoked = true;

        emit CertificateRevoked(certificateId, msg.sender);
    }

    function verifyCertificate(string memory certificateId) external view returns (
        address issuer,
        address subject,
        string memory dataHash,
        string memory metadataURI,
        uint256 issuedAt,
        uint256 expiresAt,
        bool isRevoked,
        bool isValid,
        Category category
    ) {
        Certificate memory cert = certificates[certificateId];
        require(cert.issuer != address(0), "ReputeChain: certificate not found");

        bool expired = cert.expiresAt > 0 && block.timestamp > cert.expiresAt;
        bool valid = !cert.revoked && !expired;

        return (
            cert.issuer,
            cert.subject,
            cert.dataHash,
            cert.metadataURI,
            cert.issuedAt,
            cert.expiresAt,
            cert.revoked,
            valid,
            cert.category
        );
    }
}
