// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./BlocXToken.sol";
import "./BlocXProfile.sol";

contract BlocXSocial {
    BlocXToken public tokenContract;
    BlocXProfile public profileContract;

    uint256 public constant REWARD_PER_LIKE = 10 * 10**18; // 10 BLOCX tokens
    uint256 public constant LIKE_THRESHOLD = 5; // Reward triggers every 5 likes

    struct Post {
        uint256 id;
        address author;
        string contentHash; // IPFS CID
        uint256 likeCount;
        uint256 rewardMilestone; // Tracks how many times rewards have been paid
        uint256 timestamp;
    }

    uint256 private _nextPostId;
    mapping(uint256 => Post) public posts;
    mapping(uint256 => mapping(address => bool)) public hasLiked;

    event PostCreated(uint256 indexed postId, address indexed author, string contentHash, uint256 timestamp);
    event PostLiked(uint256 indexed postId, address indexed liker, uint256 newLikeCount);
    event RewardIssued(uint256 indexed postId, address indexed author, uint256 amount);

    constructor(address _tokenContract, address _profileContract) {
        tokenContract = BlocXToken(_tokenContract);
        profileContract = BlocXProfile(_profileContract);
        _nextPostId = 1;
    }

    function createPost(string memory _contentHash) external {
        require(profileContract.hasProfile(msg.sender), "Must have a profile to post");

        uint256 postId = _nextPostId++;
        
        posts[postId] = Post({
            id: postId,
            author: msg.sender,
            contentHash: _contentHash,
            likeCount: 0,
            rewardMilestone: 0,
            timestamp: block.timestamp
        });

        emit PostCreated(postId, msg.sender, _contentHash, block.timestamp);
    }

    function likePost(uint256 _postId) external {
        require(profileContract.hasProfile(msg.sender), "Must have a profile to like");
        require(_postId < _nextPostId && _postId > 0, "Post does not exist");
        require(!hasLiked[_postId][msg.sender], "Already liked this post");

        Post storage post = posts[_postId];
        
        hasLiked[_postId][msg.sender] = true;
        post.likeCount++;

        emit PostLiked(_postId, msg.sender, post.likeCount);

        // Tokenomics: Automatic reward when like count hits a multiple of LIKE_THRESHOLD
        if (post.likeCount % LIKE_THRESHOLD == 0) {
            uint256 newMilestone = post.likeCount / LIKE_THRESHOLD;
            if (newMilestone > post.rewardMilestone) {
                post.rewardMilestone = newMilestone;
                tokenContract.mint(post.author, REWARD_PER_LIKE);
                emit RewardIssued(_postId, post.author, REWARD_PER_LIKE);
            }
        }
    }
}
