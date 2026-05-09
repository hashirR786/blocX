import { expect } from "chai";
import { ethers } from "hardhat";
import { BlocXToken, BlocXProfile, BlocXSocial } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("BlocX Smart Contracts", function () {
  let token: BlocXToken;
  let profile: BlocXProfile;
  let social: BlocXSocial;
  let owner: HardhatEthersSigner;
  let addr1: HardhatEthersSigner;
  let addr2: HardhatEthersSigner;

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();

    const Token = await ethers.getContractFactory("BlocXToken");
    token = await Token.deploy() as BlocXToken;

    const Profile = await ethers.getContractFactory("BlocXProfile");
    profile = await Profile.deploy() as BlocXProfile;

    const Social = await ethers.getContractFactory("BlocXSocial");
    social = await Social.deploy(await token.getAddress(), await profile.getAddress()) as BlocXSocial;

    // Authorize Social contract to mint tokens
    await token.setSocialContract(await social.getAddress());
  });

  describe("Profiles", function () {
    it("Should allow a user to create a profile", async function () {
      await profile.connect(addr1).createProfile("ipfs://mock-profile-cid");
      expect(await profile.hasProfile(addr1.address)).to.be.true;
    });

    it("Should not allow creating multiple profiles", async function () {
      await profile.connect(addr1).createProfile("ipfs://mock-profile-cid");
      await expect(
        profile.connect(addr1).createProfile("ipfs://another-cid")
      ).to.be.revertedWith("Wallet already has a profile");
    });
  });

  describe("Social interactions & Tokenomics", function () {
    beforeEach(async function () {
      await profile.connect(addr1).createProfile("ipfs://alice-profile");
      await profile.connect(addr2).createProfile("ipfs://bob-profile");
      await social.connect(addr1).createPost("ipfs://post-cid");
    });

    it("Should create a post", async function () {
      const post = await social.posts(1);
      expect(post.author).to.equal(addr1.address);
      expect(post.contentHash).to.equal("ipfs://post-cid");
      expect(post.likeCount).to.equal(0);
    });

    it("Should allow liking a post", async function () {
      await social.connect(addr2).likePost(1);
      const post = await social.posts(1);
      expect(post.likeCount).to.equal(1);
      expect(await social.hasLiked(1, addr2.address)).to.be.true;
    });

    it("Should not allow double liking", async function () {
      await social.connect(addr2).likePost(1);
      await expect(
        social.connect(addr2).likePost(1)
      ).to.be.revertedWith("Already liked this post");
    });

    it("Should issue tokens when likes hit threshold", async function () {
      // Create 4 more signers to hit the 5 likes threshold
      const signers = await ethers.getSigners();
      
      for (let i = 3; i <= 7; i++) {
        await profile.connect(signers[i]).createProfile(`ipfs://user-${i}`);
        await social.connect(signers[i]).likePost(1);
      }

      const post = await social.posts(1);
      expect(post.likeCount).to.equal(5);

      // addr1 should have received 10 BLOCX tokens (10 * 10^18)
      const balance = await token.balanceOf(addr1.address);
      expect(balance).to.equal(ethers.parseEther("10"));
    });
  });
});
