const hre = require("hardhat");
async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Account:", deployer.address);
  console.log("Balance:", hre.ethers.formatEther(balance), "POL");
}
main();
