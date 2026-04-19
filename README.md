# Nusrat Corporation – Inventory Manager & Reports Generator

A full-featured desktop inventory management system built with **React + Vite** and packaged as a native desktop application using **Electron**. Designed for real-world business use, it handles stock tracking, inward/outward passes, transfers, and generates 5 types of operational reports.

---

## Features

- **Analytics Dashboard** — Visual overview of inventory status and activity
- **Inventory Manager** — Add, update, and track stock items in real time
- **Inward Pass (Receipt Note)** — Log incoming stock with full item details
- **Outward Pass (Issue Note)** — Record stock issued or dispatched
- **Stock Transfer** — Move stock between locations or departments
- **5 Report Types** — Generate detailed reports for auditing and operations
- **Vertical Navigation** — Persistent sidebar for fast page switching
- **Electron Packaging** — Runs as a standalone desktop app on Windows/macOS/Linux

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| UI Framework | React 18 + Vite |
| Routing | React Router (HashRouter) |
| Desktop Runtime | Electron |
| Styling | CSS Modules |

> HashRouter is used specifically for Electron compatibility, since Electron serves files from the local filesystem rather than a web server.

---

## Project Structure

```
src/
├── components/
│   ├── Analytics.jsx
│   ├── main_page_inventory.jsx
│   ├── IssueNote.jsx
│   ├── InwardNote.jsx
│   ├── Report.jsx
│   ├── Transfer.jsx
│   ├── VerticalNavbar.jsx
│   └── ...
├── App.jsx
├── App.css
└── main.jsx
```

---

## Getting Started

### Prerequisites

- Node.js v16 or higher
- npm

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/usman-7455/nusrat-corporation.git
cd nusrat-corporation

# 2. Install dependencies
npm install

# 3. Run in browser (dev mode)
npm run dev

# 4. Run as Electron desktop app
npm run electron
```

---

## Building for Desktop

```bash
# Build the React app first
npm run build

# Package as Electron desktop app
npm run electron:build
```

This generates a platform-specific installer (`.exe` on Windows, `.dmg` on macOS).

---

## Screenshots

> Analytics dashboard, inventory table, inward/outward pass forms, and report views.

---

## License

MIT
