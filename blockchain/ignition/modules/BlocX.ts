import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("BlocXDeployment", (m) => {
  // Deploy the Token contract
  const token = m.contract("BlocXToken");

  // Deploy the Profile contract
  const profile = m.contract("BlocXProfile");

  // Deploy the Social contract, passing in the addresses of Token and Profile
  const social = m.contract("BlocXSocial", [token, profile]);

  // Authorize the Social contract to mint tokens in the Token contract
  m.call(token, "setSocialContract", [social]);

  return { token, profile, social };
});
