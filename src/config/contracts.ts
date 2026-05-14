import BlocXSocialAbi from './abi/BlocXSocial.json';
import BlocXProfileAbi from './abi/BlocXProfile.json';
import BlocXTokenAbi from './abi/BlocXToken.json';
import BlocXGovernanceAbi from './abi/BlocXGovernance.json';
import BlocXFollowAbi from './abi/BlocXFollow.json';

export const CONTRACT_ADDRESSES = {
  // Deployed to Polygon Amoy Testnet
  social:     "0xe1462aaAF1fD544dAEdC4352D0ea6E98aA398498",
  profile:    "0xD6CD52B08637BB55ea80c6252Fa3d829f0148b6A",
  token:      "0x8a3747AF8bbE557411bB6cfC3e5734D023e04412",
  governance: "0x22f41337973508495B17E6F0F5796d28EFF78Db7",
  follow:     "0x031128B8e3C1E9ed367070C91C0aF0E22ea5872e"
};

export const ABIs = {
  social:     BlocXSocialAbi.abi,
  profile:    BlocXProfileAbi.abi,
  token:      BlocXTokenAbi.abi,
  governance: BlocXGovernanceAbi.abi,
  follow:     BlocXFollowAbi.abi
};
