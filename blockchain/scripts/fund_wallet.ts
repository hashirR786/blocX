import { ethers } from "hardhat";

async function main() {
  const [sender] = await ethers.getSigners();
  console.log("Funding from:", sender.address);
  
  const tx = await sender.sendTransaction({
    to: "0x53ed6a5ef929aFDe8530e389956995fA0f30BC94",
    value: ethers.parseEther("10.0")
  });
  
  await tx.wait();
  console.log("Successfully sent 10 ETH to 0x53ed6a5ef929aFDe8530e389956995fA0f30BC94");
}

main().catch(console.error);
