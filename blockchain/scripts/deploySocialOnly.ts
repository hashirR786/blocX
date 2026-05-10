import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);
  
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "POL");

  const TOKEN_ADDRESS = "0xC2acE7119682Ee0DBAc5350f28D7e9E47260126A";
  const PROFILE_ADDRESS = "0xFC650F9Ac19780A20c0Cfa64f157aF7Bb2e03E9F";

  console.log("Deploying BlocXSocial...");
  const Social = await ethers.getContractFactory("BlocXSocial");
  const social = await Social.deploy(TOKEN_ADDRESS, PROFILE_ADDRESS);
  await social.waitForDeployment();
  const socialAddress = await social.getAddress();
  
  console.log("BlocXSocial deployed to:", socialAddress);

  console.log("Updating token authorization...");
  const token = await ethers.getContractAt("BlocXToken", TOKEN_ADDRESS);
  const tx = await token.setSocialContract(socialAddress);
  await tx.wait();
  console.log("Token authorization updated successfully!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
