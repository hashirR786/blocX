import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("BlocXV2Deployment", (m) => {
  // Deploy the Token contract
  const token = m.contract("BlocXToken");

  // Deploy the Profile contract
  const profile = m.contract("BlocXProfile");

  // Deploy the upgraded Social contract (with comments support)
  const social = m.contract("BlocXSocial", [token, profile]);

  // Authorize the Social contract to mint tokens
  m.call(token, "setSocialContract", [social]);

  return { token, profile, social };
});
