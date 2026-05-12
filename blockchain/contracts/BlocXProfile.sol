// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract BlocXProfile is ERC721URIStorage, Ownable {
    uint256 private _nextTokenId;

    // Mapping from wallet address to Profile ID to enforce 1 profile per wallet
    mapping(address => uint256) public addressToProfileId;
    mapping(address => bool) public hasProfile;

    constructor() ERC721("BlocX Profile", "BXP") Ownable(msg.sender) {
        _nextTokenId = 1; // Profile IDs start at 1
    }

    function createProfile(string memory profileURI) external returns (uint256) {
        require(!hasProfile[msg.sender], "Wallet already has a profile");

        uint256 tokenId = _nextTokenId++;

        hasProfile[msg.sender] = true;
        addressToProfileId[msg.sender] = tokenId;

        _safeMint(msg.sender, tokenId);
        _setTokenURI(tokenId, profileURI);

        return tokenId;
    }

    function updateProfile(string memory newProfileURI) external {
        require(hasProfile[msg.sender], "No profile exists");
        uint256 tokenId = addressToProfileId[msg.sender];
        _setTokenURI(tokenId, newProfileURI);
    }
}
