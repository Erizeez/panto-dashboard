# Panto Dashboard

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Deploy to GitHub Pages](https://github.com/Erizeez/panto-dashboard/actions/workflows/deploy-pages.yml/badge.svg)](https://github.com/Erizeez/panto-dashboard/actions/workflows/deploy-pages.yml)

The modern, reactive Web Dashboard for **Panto** (Programmable Adaptive Network Tunnel Orchestrator).

Built with **React 19**, **Vite**, **Tailwind CSS**, and fully powered by the official [`@erizeez/panto-api`](https://github.com/Erizeez/panto-api) Client SDK.

---

## ✨ Features

- 🌐 **Real-time Directed Topology Graph**: Interactive SVG node flow with MTU overhead visualization powered by `@xyflow/react` and `@dagrejs/dagre`.
- ⚡ **Global Concurrent Site Latency Prober**: Live SSE-based stream testing across global regions without UI freeze.
- 🔀 **Routing Strategy & Group Switching**: Quick manual switching across `select`, `url-test`, and `fallback` node groups.
- 🛡️ **Tailscale Magic IP Conflict Resolution**: Interactive modal to resolve and persist duplicate device IP conflicts across multiple tailnets.
- 🌍 **Dual-Language Ready**: Instant Chinese / English localization toggle.
- 🔌 **Standalone Portability**: Decoupled from the backend core; configure any target Panto instance URL dynamically from the UI.

---

## 🚀 Development & Build

### Prerequisites

- Node.js >= 20.x
- npm / pnpm

### Getting Started

```bash
# 1. Install dependencies
npm install

# 2. Start local Vite development server
npm run dev

# 3. Build optimized production assets
npm run build
```

The production output will be located in the `dist/` directory.

---

## 🌐 Deploy to GitHub Pages

This repository includes a GitHub Actions workflow [`.github/workflows/deploy-pages.yml`](.github/workflows/deploy-pages.yml). Pushing to the `main` branch automatically triggers compilation and deployment to GitHub Pages.

---

## 📄 License

This repository is licensed under the [MIT License](LICENSE).
