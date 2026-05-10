import { ethers } from "hardhat";
import { parseUnits } from "ethers";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  
  const gasOpts = {
    maxPriorityFeePerGas: parseUnits("30", "gwei"),
    maxFeePerGas: parseUnits("50", "gwei"),
    gasLimit: 3_000_000, 
  };

  // Hardcoded addresses from previous deployment
  const profileAddress = "0xFC650F9Ac19780A20c0Cfa64f157aF7Bb2e03E9F";
  const tokenAddress = "0xC2acE7119682Ee0DBAc5350f28D7e9E47260126A";

  console.log("Reusing Token:", tokenAddress);
  console.log("Reusing Profile:", profileAddress);

  console.log("\n1. Deploying NEW BlocXSocial (V3 with edit/delete)...");
  const Social = await ethers.getContractFactory("BlocXSocial");
  const social = await Social.deploy(tokenAddress, profileAddress, gasOpts);
  await social.waitForDeployment();
  const socialAddress = await social.getAddress();
  console.log("   BlocXSocial deployed to:", socialAddress);

  console.log("\n2. Re-authorizing new Social contract to mint tokens...");
  const token = await ethers.getContractAt("BlocXToken", tokenAddress);
  const tx = await token.setSocialContract(socialAddress, gasOpts);
  await tx.wait();
  console.log("   Done.");

  console.log("\n✅ Social contract upgraded successfully!\n");
  console.log("=== UPDATE src/config/contracts.ts WITH NEW SOCIAL ADDRESS ===");
  console.log(`social:  "${socialAddress}",`);
  console.log("==============================================================");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
