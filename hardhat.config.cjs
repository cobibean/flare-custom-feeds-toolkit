require("@nomicfoundation/hardhat-ethers");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.19",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    // Flare Mainnet
    flare: {
      url: process.env.FLARE_RPC_URL || "https://flare-api.flare.network/ext/bc/C/rpc",
      chainId: 14,
      accounts: process.env.DEPLOYER_PRIVATE_KEY ? [process.env.DEPLOYER_PRIVATE_KEY] : [],
      gasPrice: 25000000000, // 25 gwei
    },
    // Flare Testnet (Coston2)
    coston2: {
      url: process.env.COSTON2_RPC_URL || "https://coston2-api.flare.network/ext/bc/C/rpc",
      chainId: 114,
      accounts: process.env.DEPLOYER_PRIVATE_KEY ? [process.env.DEPLOYER_PRIVATE_KEY] : [],
      gasPrice: 25000000000, // 25 gwei
    },
    // Local Hardhat network
    hardhat: {
      chainId: 31337,
    },
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
  etherscan: {
    apiKey: {
      flare: "flare", // FlareScan doesn't require API key
      coston2: "coston2",
    },
    customChains: [
      {
        network: "flare",
        chainId: 14,
        urls: {
          apiURL: "https://flare-explorer.flare.network/api",
          browserURL: "https://flare-explorer.flare.network",
        },
      },
      {
        network: "coston2",
        chainId: 114,
        urls: {
          apiURL: "https://coston2-explorer.flare.network/api",
          browserURL: "https://coston2-explorer.flare.network",
        },
      },
    ],
  },
};

