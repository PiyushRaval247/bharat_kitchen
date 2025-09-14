# Mall POS (Electron + React + Node + SQLite)

A desktop Point of Sale application running fully offline with local SQLite storage.

## Tech Stack
- Electron
- React + Vite
- Node.js + Express
- better-sqlite3 (SQLite)
- qrcode, jsbarcode (with canvas)

## Features
- Product CRUD with auto QR and barcode generation
- Billing screen with code scan (text input for now), total, remove items
- Save bills and items to local SQLite
- Static serving of generated QR/barcode images
- Printer integration placeholder via `backend/utils/printer.js`

## Project Structure
```
project-root/
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── styles/
│   │   ├── App.jsx
│   │   ├── index.jsx
│   │   └── api.js
│   ├── package.json
├── backend/
│   ├── db/
│   │   └── database.sqlite (auto-created on first run)
│   ├── models/
│   │   └── Product.js
│   ├── routes/
│   │   ├── products.js
│   │   └── bills.js
│   ├── utils/
│   │   └── printer.js
│   ├── db/setup.js
│   ├── server.js
│   ├── package.json
├── main.js
├── package.json
└── README.md
```

Notes:
- Database and generated images are stored under a user-writable directory: `%USERPROFILE%/.mall-pos/db` on Windows. Dev mode also works from `backend/db/`.
- Sample products are seeded on first run.

## Getting Started (Development)

Prerequisites: Node.js 18+

1. Install dependencies at root and frontend/backend:
```bash
npm install
npm --prefix backend install
npm --prefix frontend install
```

2. Start backend + frontend + Electron in dev:
```bash
# In one terminal, start backend
npm run dev:backend

# In another terminal, start frontend
npm run dev:frontend

# In a third terminal, start Electron (waits for 3001 and 5173)
npm run dev:electron
```

Alternatively, start them all together (Windows PowerShell friendly):
```bash
npx concurrently -k "npm:dev:*"
```

Open the Electron window; it loads the Vite dev server.

## Build

1. Build frontend and create installer:
```bash
npm run build
```
The output installer (.exe) will be in `dist/` (electron-builder standard).

2. Run packaged app during development without building installer:
```bash
npm run start
```

## Configuration
- API base URL is `http://localhost:3001/api`. Electron launches the app UI; backend is started separately in dev.
- In production, Electron main process starts the backend automatically.

## Printer Integration
- Implement your printer logic in `backend/utils/printer.js` inside `printReceipt()`.
- Ensure `BillsAPI.create()` path triggers printing at checkout.

## Troubleshooting
- Canvas build issues: on Windows, the `canvas` package is prebuilt for most Node versions. If build tools are required, install Windows Build Tools and Python.
- Port conflicts: change `PORT` for backend or `vite.config.js` port for frontend.
- Database location: check `%USERPROFILE%/.mall-pos/db` or the console logs from backend.

## Security & Packaging Notes
- All data is local. No internet required.
- The `extraResources` in root `package.json` ensures db folder ships with the app; runtime uses a user data dir for read/write safety.


