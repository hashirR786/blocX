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
    gasLimit:             1_000_000,
  };

  console.log("\nDeploying BlocXFollow...");
  const Follow = await ethers.getContractFactory("BlocXFollow");
  const follow = await Follow.deploy(gasOpts);
  await follow.waitForDeployment();
  const followAddress = await follow.getAddress();
  console.log("BlocXFollow deployed to:", followAddress);

  // Auto-copy ABI
  const artifactPath = path.join(
    __dirname, "../artifacts/contracts/BlocXFollow.sol/BlocXFollow.json"
  );
  const destPath = path.join(__dirname, "../../src/config/abi/BlocXFollow.json");
  if (fs.existsSync(artifactPath)) {
    fs.copyFileSync(artifactPath, destPath);
    console.log("ABI copied to src/config/abi/BlocXFollow.json");
  }

  console.log("\n✅ BlocXFollow deployed!\n");
  console.log("=== UPDATE src/config/contracts.ts ===");
  console.log(`follow: "${followAddress}",`);
  console.log("======================================");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
