// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./BlocXToken.sol";

/// @title BlocXGovernance — DAO-style proposal voting for the BlocX platform.
/// @notice Admin creates time-limited proposals; any wallet casts one vote each.
///         After the deadline the result is permanently readable on-chain.
contract BlocXGovernance {
    BlocXToken public tokenContract;
    address public admin;

    uint256 private _nextProposalId;

    // Vote choices (stored as uint8 on-chain)
    // 0 = None (not voted), 1 = Yes, 2 = No, 3 = Abstain
    uint8 public constant VOTE_NONE    = 0;
    uint8 public constant VOTE_YES     = 1;
    uint8 public constant VOTE_NO      = 2;
    uint8 public constant VOTE_ABSTAIN = 3;

    struct Proposal {
        uint256 id;
        string  title;
        string  description;
        uint256 startTime;
        uint256 endTime;
        uint256 yesVotes;
        uint256 noVotes;
        uint256 abstainVotes;
    }

    mapping(uint256 => Proposal)                     public proposals;
    mapping(uint256 => mapping(address => uint8))    public votes;

    event ProposalCreated(uint256 indexed proposalId, string title, uint256 endTime);
    event VoteCast(uint256 indexed proposalId, address indexed voter, uint8 choice);

    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin");
        _;
    }

    constructor(address _tokenContract) {
        tokenContract   = BlocXToken(_tokenContract);
        admin           = msg.sender;
        _nextProposalId = 1;
    }

    // ── Admin ─────────────────────────────────────────────────────────────────

    /// @param _durationSeconds  How long the poll stays open (e.g. 86400 = 1 day).
    function createProposal(
        string memory _title,
        string memory _description,
        uint256       _durationSeconds
    ) external onlyAdmin {
        require(bytes(_title).length > 0,  "Title required");
        require(_durationSeconds > 0,       "Duration must be > 0");

        uint256 id      = _nextProposalId++;
        uint256 endTime = block.timestamp + _durationSeconds;

        proposals[id] = Proposal({
            id:           id,
            title:        _title,
            description:  _description,
            startTime:    block.timestamp,
            endTime:      endTime,
            yesVotes:     0,
            noVotes:      0,
            abstainVotes: 0
        });

        emit ProposalCreated(id, _title, endTime);
    }

    // ── Voting ────────────────────────────────────────────────────────────────

    /// @param _choice  1 = Yes, 2 = No, 3 = Abstain
    function castVote(uint256 _proposalId, uint8 _choice) external {
        require(_proposalId > 0 && _proposalId < _nextProposalId, "Proposal does not exist");
        require(_choice >= VOTE_YES && _choice <= VOTE_ABSTAIN,   "Invalid choice");

        Proposal storage p = proposals[_proposalId];
        require(block.timestamp < p.endTime,                       "Voting period ended");
        require(votes[_proposalId][msg.sender] == VOTE_NONE,       "Already voted");

        votes[_proposalId][msg.sender] = _choice;

        if      (_choice == VOTE_YES)     p.yesVotes++;
        else if (_choice == VOTE_NO)      p.noVotes++;
        else                              p.abstainVotes++;

        emit VoteCast(_proposalId, msg.sender, _choice);
    }

    // ── Views ─────────────────────────────────────────────────────────────────

    function getProposalCount() external view returns (uint256) {
        return _nextProposalId - 1;
    }

    function getProposal(uint256 _proposalId) external view returns (Proposal memory) {
        require(_proposalId > 0 && _proposalId < _nextProposalId, "Proposal does not exist");
        return proposals[_proposalId];
    }

    function getVote(uint256 _proposalId, address _voter) external view returns (uint8) {
        return votes[_proposalId][_voter];
    }

    /// @return  0 = active, 1 = passed, 2 = failed, 3 = tied
    function getResult(uint256 _proposalId) external view returns (uint8) {
        require(_proposalId > 0 && _proposalId < _nextProposalId, "Proposal does not exist");
        Proposal storage p = proposals[_proposalId];
        if (block.timestamp < p.endTime) return 0;
        if (p.yesVotes  > p.noVotes)     return 1;
        if (p.noVotes   > p.yesVotes)    return 2;
        return 3;
    }
}
