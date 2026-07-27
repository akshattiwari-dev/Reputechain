const hre = require("hardhat");

async function main() {
  const ReputeChain = await hre.ethers.getContractFactory("ReputeChain");
  const reputeChain = await ReputeChain.deploy();

  await reputeChain.waitForDeployment();

  console.log(`ReputeChain deployed to ${await reputeChain.getAddress()}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
