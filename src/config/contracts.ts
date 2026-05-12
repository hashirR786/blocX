import BlocXSocialAbi from './abi/BlocXSocial.json';
import BlocXProfileAbi from './abi/BlocXProfile.json';
import BlocXTokenAbi from './abi/BlocXToken.json';

export const CONTRACT_ADDRESSES = {
  // Deployed to Polygon Amoy Testnet
  social: "0xE19cd757CF7BE074C661F1AFc80602aBd8556b38",
  profile: "0xEd8b630d4DD1faDF72082B2dA582614BB524F4dF",
  token: "0x2cbE463A6Dd671861e38eD6b485bAEa0a0761173"
};

export const ABIs = {
  social: BlocXSocialAbi.abi,
  profile: BlocXProfileAbi.abi,
  token: BlocXTokenAbi.abi
};
