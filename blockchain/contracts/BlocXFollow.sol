// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title BlocXFollow — On-chain follow graph for the BlocX platform.
/// @notice Any wallet can follow / unfollow any other wallet.
///         Follower lists are reconstructed off-chain from events.
contract BlocXFollow {
    /// @dev follower => followed => currently following?
    mapping(address => mapping(address => bool)) public following;

    event Followed(address indexed follower, address indexed followed);
    event Unfollowed(address indexed follower, address indexed unfollowed);

    function follow(address target) external {
        require(target != msg.sender,           "Cannot follow yourself");
        require(!following[msg.sender][target], "Already following");
        following[msg.sender][target] = true;
        emit Followed(msg.sender, target);
    }

    function unfollow(address target) external {
        require(following[msg.sender][target], "Not following");
        following[msg.sender][target] = false;
        emit Unfollowed(msg.sender, target);
    }
}
