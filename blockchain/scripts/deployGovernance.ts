import { ethers } from "hardhat";
import { parseUnits } from "ethers";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "MATIC");

  const gasOpts = {
    maxPriorityFeePerGas: parseUnits("30", "gwei"),
    maxFeePerGas:         parseUnits("50", "gwei"),
    gasLimit:             2_000_000,
  };

  // Existing token address — governance needs it to read BLOCX balances
  const TOKEN_ADDRESS = "0x8a3747AF8bbE557411bB6cfC3e5734D023e04412";

  console.log("\nDeploying BlocXGovernance...");
  const Governance = await ethers.getContractFactory("BlocXGovernance");
  const governance = await Governance.deploy(TOKEN_ADDRESS, gasOpts);
  await governance.waitForDeployment();
  const govAddress = await governance.getAddress();
  console.log("BlocXGovernance deployed to:", govAddress);

  // Auto-copy ABI to src/config/abi/ so the frontend picks it up immediately
  const artifactPath = path.join(
    __dirname,
    "../artifacts/contracts/BlocXGovernance.sol/BlocXGovernance.json"
  );
  const destPath = path.join(__dirname, "../../src/config/abi/BlocXGovernance.json");

  if (fs.existsSync(artifactPath)) {
    fs.copyFileSync(artifactPath, destPath);
    console.log("ABI copied to src/config/abi/BlocXGovernance.json");
  } else {
    console.warn("Artifact not found — run `npx hardhat compile` first.");
  }

  console.log("\n✅ BlocXGovernance deployed!\n");
  console.log("=== UPDATE src/config/contracts.ts ===");
  console.log(`governance: "${govAddress}",`);
  console.log("======================================");
  console.log("\nAdmin (proposal creator) wallet:", deployer.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
