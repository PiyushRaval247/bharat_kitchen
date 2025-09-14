const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const os = require('os');

const vendorsRouter = require('./routes/vendors');
const purchasesRouter = require('./routes/purchases');
const productsRouter = require('./routes/products');
const billsRouter = require('./routes/bills');
const customersRouter = require('./routes/customers');
const printerRouter = require('./routes/printer');
const usersRouter = require('./routes/users'); // Added users router
const { startPriceSync } = require('./utils/sync');


function ensureDirectories() {
  // Use a user-writable data directory to be safe in production
  const userDataDir = path.join(os.homedir(), '.mall-pos', 'db');
  const candidates = [
    userDataDir,
    path.join(process.cwd(), 'backend', 'db'),
    path.join(__dirname, 'db'),
  ];
  for (const dir of candidates) {
    try {
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      const qrDir = path.join(dir, 'qrcodes');
      const barDir = path.join(dir, 'barcodes');
      if (!fs.existsSync(qrDir)) fs.mkdirSync(qrDir, { recursive: true });
      if (!fs.existsSync(barDir)) fs.mkdirSync(barDir, { recursive: true });
      return dir;
    } catch (e) {
      console.warn('Failed to prepare data dir', dir, e.message);
    }
  }
  // ultimate fallback: temp
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mall-pos-'));
  fs.mkdirSync(path.join(tmp, 'qrcodes'), { recursive: true });
  fs.mkdirSync(path.join(tmp, 'barcodes'), { recursive: true });
  return tmp;
}

function createApp() {
  const app = express();
  
  // CORS configuration for production HTTPS hosting
  const corsOptions = {
    origin: process.env.FRONTEND_URL || process.env.VITE_API_URL || 'http://localhost:5173',
    credentials: true,
    optionsSuccessStatus: 200
  };
  app.use(cors(corsOptions));
  app.use(express.json());

  const dbDir = ensureDirectories();

  // Provide static access to QR/barcode images
  app.use('/static/qrcodes', express.static(path.join(dbDir, 'qrcodes')));
  app.use('/static/barcodes', express.static(path.join(dbDir, 'barcodes')));

  // Attach only paths to request for routers (no db)
  app.use((req, res, next) => {
    req.context = {
      paths: {
        dbDir,
        qrcodesDir: path.join(dbDir, 'qrcodes'),
        barcodesDir: path.join(dbDir, 'barcodes'),
      },
    };
    next();
  });

  app.use('/api/vendors', vendorsRouter);
  app.use('/api/purchases', purchasesRouter);
  app.use('/api/products', productsRouter);
  app.use('/api/bills', billsRouter);
  app.use('/api/printer', printerRouter);
  app.use('/api/users', usersRouter); // Added users route
  
  // Customer routes - debug
  console.log('Registering customer routes at /api/customers');
  app.use('/api/customers', customersRouter);

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  // Optional: background price sync from remote catalog
  const catalogUrl = process.env.REMOTE_CATALOG_URL;
  if (catalogUrl) {
    startPriceSync({ catalogUrl, intervalMs: Number(process.env.PRICE_SYNC_MS || 900000) });
  }

  return app;
}

function startServer(port = 3001) {
  const app = createApp();
  const server = app.listen(port, '0.0.0.0', () => {
    console.log(`API listening on http://0.0.0.0:${port}`);
    console.log(`Mobile access: http://${getLocalIP()}:${port}`);
  });
  return server;
}

function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

if (require.main === module) {
  const port = process.env.PORT || 3001;
  startServer(Number(port));
}

module.exports = { createApp, startServer };