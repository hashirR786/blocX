import BlocXSocialAbi from './abi/BlocXSocial.json';
import BlocXProfileAbi from './abi/BlocXProfile.json';
import BlocXTokenAbi from './abi/BlocXToken.json';

export const CONTRACT_ADDRESSES = {
  // Deployed to Polygon Amoy Testnet
  social: "0x38273A6280F2038A4337D87E9A6f39679533f086",
  profile: "0xFC650F9Ac19780A20c0Cfa64f157aF7Bb2e03E9F",
  token: "0xC2acE7119682Ee0DBAc5350f28D7e9E47260126A"
};

export const ABIs = {
  social: BlocXSocialAbi.abi,
  profile: BlocXProfileAbi.abi,
  token: BlocXTokenAbi.abi
};
