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
        bool isDeleted;
    }

    struct Comment {
        uint256 id;
        uint256 postId;
        address author;
        string contentHash; // IPFS CID
        uint256 timestamp;
        bool isDeleted;
    }

    uint256 private _nextPostId;
    uint256 private _nextCommentId;

    mapping(uint256 => Post) public posts;
    mapping(uint256 => mapping(address => bool)) public hasLiked;

    // postId => array of Comment
    mapping(uint256 => Comment[]) private _postComments;

    // commentId => postId and array index for O(1) lookup in deleteComment
    mapping(uint256 => uint256) public commentPostId;
    mapping(uint256 => uint256) public commentIndex;

    event PostCreated(uint256 indexed postId, address indexed author, string contentHash, uint256 timestamp);
    event PostEdited(uint256 indexed postId, address indexed author, string newContentHash);
    event PostDeleted(uint256 indexed postId, address indexed author);
    event PostLiked(uint256 indexed postId, address indexed liker, uint256 newLikeCount);
    event RewardIssued(uint256 indexed postId, address indexed author, uint256 amount);
    event CommentCreated(uint256 indexed commentId, uint256 indexed postId, address indexed author, string contentHash, uint256 timestamp);
    event CommentDeleted(uint256 indexed commentId, uint256 indexed postId, address indexed deletedBy);

    constructor(address _tokenContract, address _profileContract) {
        tokenContract = BlocXToken(_tokenContract);
        profileContract = BlocXProfile(_profileContract);
        _nextPostId = 1;
        _nextCommentId = 1;
    }

    modifier postExists(uint256 _postId) {
        require(_postId < _nextPostId && _postId > 0, "Post does not exist");
        require(!posts[_postId].isDeleted, "Post has been deleted");
        _;
    }

    // ── Posts ────────────────────────────────────────────────────────────────

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
            timestamp: block.timestamp,
            isDeleted: false
        });

        emit PostCreated(postId, msg.sender, _contentHash, block.timestamp);
    }

    function editPost(uint256 _postId, string memory _newContentHash) external postExists(_postId) {
        require(posts[_postId].author == msg.sender, "Only author can edit");
        posts[_postId].contentHash = _newContentHash;
        emit PostEdited(_postId, msg.sender, _newContentHash);
    }

    function deletePost(uint256 _postId) external {
        require(_postId < _nextPostId && _postId > 0, "Post does not exist");
        require(!posts[_postId].isDeleted, "Already deleted");
        require(posts[_postId].author == msg.sender, "Only author can delete");
        posts[_postId].isDeleted = true;
        posts[_postId].contentHash = "";
        emit PostDeleted(_postId, msg.sender);
    }

    function likePost(uint256 _postId) external postExists(_postId) {
        require(profileContract.hasProfile(msg.sender), "Must have a profile to like");
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

    // ── Comments ─────────────────────────────────────────────────────────────

    function createComment(uint256 _postId, string memory _contentHash) external postExists(_postId) {
        require(profileContract.hasProfile(msg.sender), "Must have a profile to comment");

        uint256 commentId = _nextCommentId++;
        uint256 idx = _postComments[_postId].length;

        _postComments[_postId].push(Comment({
            id: commentId,
            postId: _postId,
            author: msg.sender,
            contentHash: _contentHash,
            timestamp: block.timestamp,
            isDeleted: false
        }));

        // Store reverse lookup so deleteComment can find it in O(1)
        commentPostId[commentId] = _postId;
        commentIndex[commentId] = idx;

        posts[_postId].commentCount++;

        emit CommentCreated(commentId, _postId, msg.sender, _contentHash, block.timestamp);
    }

    /// @notice Delete a comment.
    ///         Only the comment author OR the post author may call this.
    function deleteComment(uint256 _commentId) external {
        uint256 postId = commentPostId[_commentId];
        require(postId > 0, "Comment does not exist");

        uint256 idx = commentIndex[_commentId];
        Comment storage comment = _postComments[postId][idx];
        require(!comment.isDeleted, "Comment already deleted");

        require(
            msg.sender == comment.author || msg.sender == posts[postId].author,
            "Not authorized to delete this comment"
        );

        comment.isDeleted = true;
        comment.contentHash = "";

        if (posts[postId].commentCount > 0) {
            posts[postId].commentCount--;
        }

        emit CommentDeleted(_commentId, postId, msg.sender);
    }

    // ── Views ─────────────────────────────────────────────────────────────────

    function getCommentCount(uint256 _postId) external view returns (uint256) {
        uint256 count = 0;
        Comment[] storage comments = _postComments[_postId];
        for (uint256 i = 0; i < comments.length; i++) {
            if (!comments[i].isDeleted) count++;
        }
        return count;
    }

    function getComment(uint256 _postId, uint256 _index) external view returns (Comment memory) {
        require(_index < _postComments[_postId].length, "Comment index out of range");
        return _postComments[_postId][_index];
    }

    /// @notice Returns only non-deleted comments for a post.
    function getAllComments(uint256 _postId) external view returns (Comment[] memory) {
        Comment[] storage all = _postComments[_postId];
        uint256 activeCount = 0;
        for (uint256 i = 0; i < all.length; i++) {
            if (!all[i].isDeleted) activeCount++;
        }
        Comment[] memory result = new Comment[](activeCount);
        uint256 j = 0;
        for (uint256 i = 0; i < all.length; i++) {
            if (!all[i].isDeleted) result[j++] = all[i];
        }
        return result;
    }
}
