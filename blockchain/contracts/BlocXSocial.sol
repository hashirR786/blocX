// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./BlocXToken.sol";
import "./BlocXProfile.sol";

contract BlocXSocial {
    BlocXToken public tokenContract;
    BlocXProfile public profileContract;

    uint256 public constant REWARD_PER_LIKE = 10 * 10**18; // 10 BLOCX tokens
    uint256 public constant LIKE_THRESHOLD = 5;

    struct Post {
        uint256 id;
        address author;
        string contentHash; // IPFS CID
        uint256 likeCount;
        uint256 commentCount;
        uint256 rewardMilestone;
        uint256 timestamp;
    }

    struct Comment {
        uint256 id;
        uint256 postId;
        address author;
        string contentHash; // IPFS CID
        uint256 timestamp;
    }

    uint256 private _nextPostId;
    uint256 private _nextCommentId;

    mapping(uint256 => Post) public posts;
    mapping(uint256 => mapping(address => bool)) public hasLiked;

    // postId => array of Comment
    mapping(uint256 => Comment[]) private _postComments;

    event PostCreated(uint256 indexed postId, address indexed author, string contentHash, uint256 timestamp);
    event PostLiked(uint256 indexed postId, address indexed liker, uint256 newLikeCount);
    event RewardIssued(uint256 indexed postId, address indexed author, uint256 amount);
    event CommentCreated(uint256 indexed commentId, uint256 indexed postId, address indexed author, string contentHash, uint256 timestamp);

    constructor(address _tokenContract, address _profileContract) {
        tokenContract = BlocXToken(_tokenContract);
        profileContract = BlocXProfile(_profileContract);
        _nextPostId = 1;
        _nextCommentId = 1;
    }

    function createPost(string memory _contentHash) external {
        require(profileContract.hasProfile(msg.sender), "Must have a profile to post");

        uint256 postId = _nextPostId++;

        posts[postId] = Post({
            id: postId,
            author: msg.sender,
            contentHash: _contentHash,
            likeCount: 0,
            commentCount: 0,
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

        if (post.likeCount % LIKE_THRESHOLD == 0) {
            uint256 newMilestone = post.likeCount / LIKE_THRESHOLD;
            if (newMilestone > post.rewardMilestone) {
                post.rewardMilestone = newMilestone;
                tokenContract.mint(post.author, REWARD_PER_LIKE);
                emit RewardIssued(_postId, post.author, REWARD_PER_LIKE);
            }
        }
    }

    function createComment(uint256 _postId, string memory _contentHash) external {
        require(profileContract.hasProfile(msg.sender), "Must have a profile to comment");
        require(_postId < _nextPostId && _postId > 0, "Post does not exist");

        uint256 commentId = _nextCommentId++;

        _postComments[_postId].push(Comment({
            id: commentId,
            postId: _postId,
            author: msg.sender,
            contentHash: _contentHash,
            timestamp: block.timestamp
        }));

        posts[_postId].commentCount++;

        emit CommentCreated(commentId, _postId, msg.sender, _contentHash, block.timestamp);
    }

    function editPost(uint256 _postId, string memory _newContentHash) external {
        require(profileContract.hasProfile(msg.sender), "Must have a profile to edit");
        require(_postId < _nextPostId && _postId > 0, "Post does not exist");
        require(posts[_postId].author == msg.sender, "Only author can edit");
        
        posts[_postId].contentHash = _newContentHash;
    }

    function deletePost(uint256 _postId) external {
        require(profileContract.hasProfile(msg.sender), "Must have a profile to delete");
        require(_postId < _nextPostId && _postId > 0, "Post does not exist");
        require(posts[_postId].author == msg.sender, "Only author can delete");
        
        // Setting contentHash to a specific flag keeps the struct intact but tells the frontend to hide it
        posts[_postId].contentHash = "DELETED";
    }

    function getCommentCount(uint256 _postId) external view returns (uint256) {
        return _postComments[_postId].length;
    }

    function getComment(uint256 _postId, uint256 _index) external view returns (Comment memory) {
        require(_index < _postComments[_postId].length, "Comment index out of range");
        return _postComments[_postId][_index];
    }
}
