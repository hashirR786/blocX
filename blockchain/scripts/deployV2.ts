import { ethers } from "hardhat";
import { parseUnits } from "ethers";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "MATIC");

  const gasOpts = {
    maxPriorityFeePerGas: parseUnits("30", "gwei"),
    maxFeePerGas: parseUnits("50", "gwei"),
    gasLimit: 3_000_000, // Bypass estimateGas — Amoy's EIP-7623 breaks gas estimation
  };

  // 1. Deploy BlocXToken
  console.log("\n1. Deploying BlocXToken...");
  const Token = await ethers.getContractFactory("BlocXToken");
  const token = await Token.deploy(gasOpts);
  await token.waitForDeployment();
  const tokenAddress = await token.getAddress();
  console.log("   BlocXToken deployed to:", tokenAddress);

  // 2. Deploy BlocXProfile
  console.log("\n2. Deploying BlocXProfile...");
  const Profile = await ethers.getContractFactory("BlocXProfile");
  const profile = await Profile.deploy(gasOpts);
  await profile.waitForDeployment();
  const profileAddress = await profile.getAddress();
  console.log("   BlocXProfile deployed to:", profileAddress);

  // 3. Deploy BlocXSocial (V2 with comments)
  console.log("\n3. Deploying BlocXSocial (V2 with comments)...");
  const Social = await ethers.getContractFactory("BlocXSocial");
  const social = await Social.deploy(tokenAddress, profileAddress, gasOpts);
  await social.waitForDeployment();
  const socialAddress = await social.getAddress();
  console.log("   BlocXSocial deployed to:", socialAddress);

  // 4. Authorize Social contract to mint tokens
  console.log("\n4. Setting social contract in token...");
  const tx = await token.setSocialContract(socialAddress, gasOpts);
  await tx.wait();
  console.log("   Done.");

  console.log("\n✅ All contracts deployed successfully!\n");
  console.log("=== UPDATE src/config/contracts.ts WITH THESE ADDRESSES ===");
  console.log(`social:  "${socialAddress}",`);
  console.log(`profile: "${profileAddress}",`);
  console.log(`token:   "${tokenAddress}"`);
  console.log("============================================================");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
