# KHOJ (खोज) — Minimal Campus Lost & Found MVP

<div align="center">

![KHOJ Banner](https://img.shields.io/badge/KHOJ-V1.5%20Campus%20MVP-6366f1?style=for-the-badge)
![Next.js](https://img.shields.io/badge/Next.js-14%2B%20App%20Router-black?style=for-the-badge&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178c6?style=for-the-badge&logo=typescript)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)

**Lost item ko uske actual owner tak minimum steps mein wapas pahunchana — zero-friction, crafted interface aur algorithmic verification ke saath.**

[Live Demo](#quick-start) • [Documentation Hub](docs/) • [System Architecture](docs/architecture/system-overview.md) • [Matching Algorithm](docs/matching/algorithm-spec.md)

</div>

---

## 📌 What is KHOJ?

**KHOJ** is an intelligent, low-friction campus lost-and-found system designed for college campuses. It bridges the gap between item owners and finders through:

1. **Pre-Loss Item Registration:** Students register valuables with photos and a private *“Unique Identifying Detail”* (e.g., sticker, scratch mark, engraving) before anything is lost.
2. **Zero-Login Finder Flow:** Finders simply upload a photo and tag the campus location without creating accounts, passwords, or entering OTPs.
3. **Multi-Signal Matching Engine:** Matches items in real time using a weighted composite score combining unique detail heuristics (35%), visual similarity (25%), metadata (20%), location & time (10%), and registration precedence (10%).
4. **Blind Ownership Verification:** The owner proves ownership by answering a blind challenge question about their registered unique detail without revealing it to the finder.
5. **Safe Dual-Confirmation Handover:** Verification concludes at designated campus safe spots (Library Desk, Proctor Office) with synchronous dual-confirmation and an optional ₹20 micro-reward.

---

## 🧭 Repository & Documentation Index

All technical and operational specifications are organized in [`/docs`](docs/):

| Category | Document | Description |
| :--- | :--- | :--- |
| **Getting Started** | [**Developer Setup Guide**](docs/guides/developer-setup.md) | Local prerequisites, installation, build verification, and environment configs. |
| **Architecture** | [**System Overview**](docs/architecture/system-overview.md) | Component hierarchy, client/server data synchronization, and Next.js App Router structure. |
| **Architecture** | [**State Machine & Data Models**](docs/architecture/state-machine.md) | Complete schema dictionary, entity relationships, and status transition matrix. |
| **Intelligence** | [**Matching Algorithm Spec**](docs/matching/algorithm-spec.md) | Mathematical formulation of multi-signal scoring, ambiguity detection, and V2.0 roadmap. |
| **Security** | [**Blind Verification Protocol**](docs/security/blind-verification.md) | Anti-fraud zero-knowledge challenge flow and privacy protections for students. |
| **Operations** | [**Campus Administration & SOP**](docs/guides/campus-operations.md) | Standard operating procedures for campus proctors, custody desks, and safe handovers. |
| **Requirements** | [**KHOJ V1.5 PRD**](KHOJ_V1.5_PRD.md) | Canonical Product Requirements Document covering scope, metrics, and user stories. |

---

## ⚡ Quick Start

### 1. Prerequisites
- **Node.js** (v18.17.0 or higher recommended)
- **npm** (v9 or higher)

### 2. Installation
Clone the repository and install dependencies:

```bash
git clone https://github.com/ankit4563564/khoj.git
cd khoj
npm install
```

### 3. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 4. Build for Production
```bash
npm run build
npm start
```

---

## 🏗️ Core Application Sitemap

| Route | Page | Purpose |
| :--- | :--- | :--- |
| `/` | **Landing Page** | Campus recovery metrics, interactive value proposition, and quick-action portals. |
| `/dashboard` | **Owner Dashboard** | Student portal to register valuables, toggle lost status, and view active matches. |
| `/found` | **Frictionless Finder** | Zero-login report form with instant camera capture and campus location tags. |
| `/verify/[id]` | **Blind Verification** | Private challenge question portal for owners to confirm candidate found items. |
| `/recovery/[id]` | **Handover & Settlement** | Safe-spot selection, dual confirmation checks, and optional ₹20 UPI settlement. |
| `/unclaimed` | **Unclaimed Gallery** | Public campus board for unmatched items with manual claim submission. |
| `/admin` | **Proctor Admin** | Campus administration dashboard for dispute resolution, audit logs, and metrics. |
| `/lab` | **Matching Algorithm Lab** | Interactive testbed to simulate multi-signal weights and score distributions. |

---

## 🛠️ Technology Stack

- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript 5.0 (Strict mode)
- **Styling:** Custom Vanilla CSS Design System with dark-mode CSS variables & glassmorphism
- **Persistence:** Local JSON file database (`data/khoj_database.json`) with optimistic client context sync
- **Icons & UI:** Custom SVG iconography, zero third-party bloated UI dependencies

---

## 📄 License
This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
