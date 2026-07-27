require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.20",
  networks: {
    hardhat: {},
    amoy: {
      url: process.env.RPC_URL || "https://rpc-amoy.polygon.technology",
      accounts: process.env.ISSUER_PRIVATE_KEY ? [process.env.ISSUER_PRIVATE_KEY] : []
    }
  }
};
