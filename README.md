# BlocX — Blockchain-Based Social Media Application

BlocX is a decentralized blockchain-powered social media platform that combines Web3 technologies, AI moderation, smart contracts, decentralized storage, and governance voting into a modern social networking ecosystem.

The project aims to address common issues in traditional social media platforms such as:
- Centralized control
- Privacy concerns
- Data manipulation
- Fake accounts
- Lack of transparency
- Content ownership problems

BlocX integrates blockchain technology with AI-powered moderation and decentralized governance to create a secure and transparent platform for users.

---

# Features

## Authentication & User Management
- MetaMask wallet-based authentication
- Secure cryptographic signature verification
- Wallet connect/disconnect support
- User profile management

---

## Social Media Features
- Create, edit, and delete posts
- View personalized feed
- Like, comment, and share posts
- Multimedia content support

---

## Decentralized Storage
- Media files stored using IPFS
- Blockchain stores immutable IPFS hashes
- Decentralized ownership tracking

---

## Blockchain Integration
- Smart contract-based transaction recording
- Immutable blockchain records
- Transparent activity tracking
- Ownership verification

---

## AI Features
- AI-based content moderation
- Spam and harmful content detection
- Fake account detection
- Personalized recommendation system

---

## Governance System
- DAO-style governance voting
- Community proposal management
- Transparent vote tracking
- Blockchain-inspired voting logic

---

## Reward System
- Token reward distribution
- Engagement-based incentives
- Blockchain reward transactions

---

# Tech Stack

## Frontend
- React.js
- Next.js
- Tailwind CSS

## Backend
- Node.js
- Express.js

## Blockchain
- Solidity
- Ethereum / Polygon
- Ethers.js

## Storage
- IPFS

## AI/ML
- TensorFlow
- PyTorch

## Wallet Integration
- MetaMask

---

# System Architecture

```text
User
   ↓
Frontend (React / Next.js)
   ↓
Backend APIs (Node.js / Express)
   ↓
Blockchain Smart Contracts
   ↓
IPFS Storage + AI Moderation System
```

---

# Core Modules

## 1. Wallet Authentication
Users authenticate securely using MetaMask instead of traditional username/password systems.

---

## 2. Post Management
Users can:
- Create posts
- Upload media
- Interact with content
- Manage posts

---

## 3. AI Moderation
AI models analyze content to:
- Detect spam
- Filter harmful posts
- Identify fake accounts
- Improve platform quality

---

## 4. Blockchain Layer
Smart contracts handle:
- Transaction recording
- Token rewards
- Governance voting
- Ownership tracking

---

## 5. Governance Voting
Users participate in decentralized governance through proposal voting mechanisms inspired by DAO systems.

---

# Project Structure

```text
blocX/
│
├── frontend/              # React / Next.js frontend
├── backend/               # Node.js backend
├── smart-contracts/       # Solidity smart contracts
├── ai-module/             # AI moderation & recommendation
├── ipfs/                  # IPFS integration
├── docs/                  # SRS, DDS, UML diagrams
└── README.md
```
# MetaMask Setup

1. Install MetaMask Extension
2. Create Wallet
3. Connect to Sepolia/Polygon Testnet
4. Get Test ETH from Faucet
5. Connect wallet to application

---

# UML & Documentation

The project includes:
- Use Case Diagram
- Activity Diagram
- Level-0 DFD
- Level-1 DFD
- Level-2 DFD
- Class Diagram
- SRS Document
- DDS Document

---

# Testing

## Types of Testing Performed
- Functional Testing
- Monkey Testing
- UI Testing
- Blockchain Transaction Testing
- AI Moderation Testing

### Example Monkey Testing
Random and harmful inputs were provided during post creation to test the robustness of the AI moderation system and ensure application stability.

---

# Future Enhancements
- Cross-Chain Support
- Advanced Recommendation Engine
- Token Marketplace

---

# Contributors

- Muhammad Rashid R
- Muhammad Hashir R
- Nirranjan Naarayan M R

---

# References

- Ethereum Documentation
- Polygon Documentation
- MetaMask Documentation
- Solidity Documentation
- IPFS Documentation
- React.js Documentation
- TensorFlow Documentation

---

# License

This project is developed for academic and educational purposes.
