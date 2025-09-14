const { app, BrowserWindow, Menu, shell, dialog, ipcMain } = require('electron');
const path = require('path');
const isDev = require('electron-is-dev');
const fs = require('fs');
const os = require('os');

let mainWindow = null;
let backendStarted = false;

// Store window state
let windowState = {
  width: 1400,
  height: 900,
  x: undefined,
  y: undefined,
  maximized: false
};

// Load window state
function loadWindowState() {
  try {
    const stateFile = path.join(os.homedir(), '.mall-pos', 'window-state.json');
    if (fs.existsSync(stateFile)) {
      const state = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
      Object.assign(windowState, state);
    }
  } catch (error) {
    console.log('Could not load window state:', error.message);
  }
}

// Save window state
function saveWindowState() {
  if (!mainWindow) return;
  
  try {
    const bounds = mainWindow.getBounds();
    windowState.x = bounds.x;
    windowState.y = bounds.y;
    windowState.width = bounds.width;
    windowState.height = bounds.height;
    windowState.maximized = mainWindow.isMaximized();
    
    const stateDir = path.join(os.homedir(), '.mall-pos');
    if (!fs.existsSync(stateDir)) {
      fs.mkdirSync(stateDir, { recursive: true });
    }
    
    const stateFile = path.join(stateDir, 'window-state.json');
    fs.writeFileSync(stateFile, JSON.stringify(windowState, null, 2));
  } catch (error) {
    console.log('Could not save window state:', error.message);
  }
}

function startBackend() {
  if (backendStarted) return;
  backendStarted = true;
  try {
    // Prefer requiring the server directly so it works packaged
    const { startServer } = require(path.join(__dirname, 'backend', 'server.js'));
    const port = process.env.PORT || 3001;
    startServer(Number(port));
    // eslint-disable-next-line no-console
    console.log(`Backend server started on port ${port}`);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Failed to start backend from Electron main process:', err);
  }
}

// Handle print receipt IPC call
ipcMain.handle('print-receipt', async (event, receipt) => {
  try {
    if (!receipt) return { success: false, error: 'No receipt data provided' };

    // Use qrcode module - try multiple possible locations
    let QRCode;
    try {
      // Try to load from backend node_modules first
      QRCode = require(path.join(__dirname, 'backend', 'node_modules', 'qrcode'));
    } catch (e1) {
      try {
        // Fallback to root node_modules
        QRCode = require('qrcode');
      } catch (e2) {
        // If all else fails, we'll generate a simpler receipt without QR code
        console.error('Failed to load qrcode module:', e1, e2);
        QRCode = null;
      }
    }

    let qrCodeDataUrl = '';
    if (QRCode) {
      try {
        // Generate QR Code Data URL
        const upiLink = `upi://pay?pa=8200638429@pthdfc&pn=Bharat%20Kitchenware&am=${receipt.total}&cu=INR`;
        qrCodeDataUrl = await QRCode.toDataURL(upiLink);
      } catch (qrError) {
        console.error('Failed to generate QR code:', qrError);
        qrCodeDataUrl = ''; // Continue without QR code
      }
    }

    // Create the exact same HTML as the web version
    const html = `
<html>
  <head>
    <title>${receipt.billNumber}</title>
    <style>
      @media print {
        @page {
          size: 72mm auto;
          margin: 0 !important;
        }
        body {
         margin: 0 !important;
         padding: 0;
        }
      }
      body {
        font-family: 'Courier New', monospace;
        font-size: 13px;
        margin: 0;
        padding: 0;
        width: 72mm;
        color: #000;
        background: #fff;
        line-height: 1.5;
        font-weight: bold;

        /* ✅ Center the content horizontally */
        display: flex;
        justify-content: center;
      }
      .receipt {
        width: 70mm; /* ✅ Slightly less than paper width */
        margin: 0 auto;
        padding: 0;
        text-align: center;
      }
      .logo {
        display: block;
        width: 110px; /* ✅ Increased size */
        height: 110px;
        object-fit: contain;
        margin: 15px auto 4px auto;
      }
      .title {
        font-size: 20px;
        text-align: center;
        margin: 0;
      }
      .business-info {
        font-size: 12px;
        margin: 5px 0 12px 0;
        line-height: 1.3;
        text-align: center;
      }
      .section-line {
        border-top: 2px dashed #000;
        margin: 10px 0;
      }
      .items-header {
        font-size: 13px;
        border-bottom: 2px dashed #000;
        padding-bottom: 4px;
        margin-bottom: 6px;
      }
      .item {
        display: grid;
        grid-template-columns: 1fr auto auto;
        font-size: 12px;
        margin: 3px 0;
        text-align: left;
        column-gap: 6px;
      }
      .item div:nth-child(2),
      .item div:nth-child(3) {
        text-align: right;
      }
      .gst-line {
        display: flex;
        justify-content: space-between;
        font-size: 12px;
        margin: 3px 0;
        padding: 0 4px;
      }
      .total {
        border-top: 2px dashed #000;
        border-bottom: 2px dashed #000;
        font-size: 15px;
        margin: 12px 0 6px 0;
        padding: 8px 0;
        text-align: center;
      }
      .qr-section {
        text-align: center;
        margin: 18px 0 12px 0;
      }
      .qr-title {
        font-size: 13px;
        margin-bottom: 6px;
      }
      .qr-code {
        width: 140px;
        height: 140px;
        margin: 0 auto;
        display: block;
        background: #fff;
      }
      .footer {
        margin: 12px 0 6px 0;
        text-align: center;
        font-size: 12px;
      }
    </style>
  </head>
  <body>
    <div class="receipt">

      <!-- Logo + Business -->
      <img src="file://${path.join(__dirname, 'frontend', 'assets', 'logo.png').replace(/\\/g, '/')}" class="logo" alt="Logo" onerror="this.style.display='none'"/>
      <h2 class="title">Bharat Kitchenware</h2>
      <div class="business-info">
        Contact: +91 91061 98615<br/>
        Bill No: ${receipt.billNumber}<br/>
        Date: ${new Date().toLocaleDateString()} 
        &nbsp; | &nbsp; 
        Time: ${new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}<br/>
        Address: 123 Market Road, Rajkot, Gujarat<br/>
        GST No: 24AHMPT3449F1Z3

      </div>

      <div class="section-line"></div>

      <!-- Items -->
      <div class="items-header">
        <div class="item">
          <div>ITEM</div>
          <div>QTY</div>
          <div>PRICE</div>
        </div>
      </div>

      ${receipt.items.map(it => `
        <div class="item">
          <div>${it.name.length > 18 ? it.name.substring(0,18) : it.name}</div>
          <div>x${it.quantity}</div>
          <div>₹${(it.price*it.quantity).toFixed(2)}</div>
        </div>
      `).join('')}

      <!-- GST Lines -->
      <div class="gst-line">
        <div>CGST (0%)</div>
        <div>₹0.00</div>
      </div>
      <div class="gst-line">
        <div>SGST (0%)</div>
        <div>₹0.00</div>
      </div>

      <!-- Total -->
      <div class="total">
        TOTAL: ₹${receipt.total.toFixed(2)}
      </div>

      <!-- QR -->
      ${qrCodeDataUrl ? `
      <div class="qr-section">
        <div class="qr-title">SCAN & PAY WITH UPI</div>
        <img src="${qrCodeDataUrl}" class="qr-code" alt="QR Code"/>
      </div>
      ` : ''}

      <div class="footer">
        VISIT AGAIN!<br/>--- THANK YOU ---
      </div>
    </div>
  </body>
</html>
`;

    // Create a new browser window that mimics window.open() behavior
    const printWindow = new BrowserWindow({
      width: 280,
      height: 700,
      show: false, // Don't show the window - print silently
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
        webSecurity: false // Needed to load local resources
      }
    });

    // Wait for window to be ready and print silently without showing dialog
    printWindow.webContents.once('did-finish-load', () => {
      // Print silently without showing dialog - this is the key fix!
      printWindow.webContents.print({ silent: true, printBackground: true }, (success, errorType) => {
        if (!success) {
          console.error('Silent print failed:', errorType);
        } else {
          console.log('✅ Receipt printed silently via F9');
        }
        printWindow.destroy(); // Close the window after printing
      });
    });

    // Load the HTML content
    printWindow.loadURL(`data:text/html;charset=UTF-8,${encodeURIComponent(html)}`);
    
    return { success: true };
  } catch (error) {
    console.error('Print error:', error);
    return { success: false, error: error.message };
  }
});

// Handle single print label IPC call - Direct printing functionality
ipcMain.handle('print-label', async (event, product, copies = 1, labelConfig) => {
  try {
    if (!product) {
      return { success: false, error: 'No product provided for printing' };
    }

    const config = {
      width: labelConfig?.width || 50,
      height: labelConfig?.height || 25,
      margin: labelConfig?.margin || 1,
      includeName: labelConfig?.includeName !== false,
      includePrice: labelConfig?.includePrice !== false,
      includeBarcode: labelConfig?.includeBarcode !== false,
      includeBorder: labelConfig?.includeBorder || false,
      alignment: labelConfig?.alignment || 'center'
    };

    console.log('Single print labelConfig received:', labelConfig);
    console.log('Single print config processed:', config);

    // Generate HTML for single product label printing - Match web version exactly
    const html = `
<html>
  <head>
    <title>Print Labels - ${product.name}</title>
    <style>
      body { font-family: Arial; margin: 0; }
      .page { width: 108mm; margin: 0 auto; }
      .label-row { display: flex; gap: 2mm; margin-bottom: 2mm; justify-content: space-between; }
      .label { 
        border: none; 
        padding: 0; 
        width: ${labelConfig?.layout === '2up' ? '53mm' : '104mm'};
        height: ${config.height}mm;
        text-align: center !important;
        font-size: ${labelConfig?.layout === '2up' ? '14px' : '16px'};
        box-sizing: border-box;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        gap: 8px;
        page-break-inside: avoid;
        flex-shrink: 0;
      }
      .barcode { font-family: monospace; font-size: ${labelConfig?.layout === '2up' ? '12px' : '14px'}; margin: 0; text-align: center !important; }
      .barcode-image { max-width: ${labelConfig?.layout === '2up' ? '45mm' : '85mm'}; height: auto; margin: 0; display: block; margin-left: auto; margin-right: auto; }
      .name { font-weight: bold; margin: 0; font-size: ${labelConfig?.layout === '2up' ? '16px' : '20px'}; line-height: 1.2; text-align: center !important; }
      .price { color: #000; font-size: ${labelConfig?.layout === '2up' ? '18px' : '24px'}; font-weight: bold; margin: 0; text-align: center !important; }
      @media print {
        @page {
          size: 108mm auto;
          margin: 0 !important;
        }
        body { 
          margin: 0 !important;
          padding: 0;
          display: flex;
          justify-content: center;
        }
        .page { 
          width: 108mm; 
          margin: 0 auto;
        }
        .label { border: none; }
        .label-row { page-break-inside: avoid; }
      }
    </style>
  </head>
  <body>
    <div class="page">
      ${labelConfig?.layout === '2up' ? 
        // 2-up layout: arrange labels in pairs
        Array.from({length: Math.ceil(copies / 2)}, (_, rowIndex) => {
          const labelsInRow = Math.min(2, copies - (rowIndex * 2));
          return `
            <div class="label-row">
              ${Array.from({length: labelsInRow}, (_, colIndex) => `
                <div class="label">
                  ${config.includeName ? `<div class="name">${product.name}</div>` : ''}
                  ${config.includePrice ? `<div class="price">₹${product.price}</div>` : ''}
                  ${config.includeBarcode ? (product.barcode_path ? `<img src="${process.env.VITE_API_URL || 'http://localhost:3001'}${product.barcode_path}" class="barcode-image" alt="Barcode" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';" /><div class="barcode" style="display:none;">${product.barcode || 'No barcode'}</div>` : '<div class="barcode">No barcode</div>') : ''}
                </div>
              `).join('')}
            </div>
          `;
        }).join('') :
        // Single layout: one label per row
        Array.from({length: copies}, (_, i) => `
          <div class="label-row">
            <div class="label">
              ${config.includeName ? `<div class="name">${product.name}</div>` : ''}
              ${config.includePrice ? `<div class="price">₹${product.price}</div>` : ''}
              ${config.includePrice && product.wholesale_price ? `<div class="price">W: ₹${product.wholesale_price}</div>` : ''}
              ${config.includeBarcode ? (product.barcode ? `
                <div class="barcode">${product.barcode}</div>
                ${product.barcode_path ? `<img src="${process.env.VITE_API_URL || 'http://localhost:3001'}${product.barcode_path}" class="barcode-image" alt="Barcode" onerror="this.style.display='none';" />` : ''}
              ` : '<div class="barcode">No barcode</div>') : ''}
            </div>
          </div>
        `).join('')
      }
    </div>
    <script>
      // Printing is handled by Electron's silent print API
      console.log('Single product label content loaded and ready for printing');
    </script>
  </body>
</html>
    `;
    
    // Debug: Log the generated HTML
    console.log('=== BATCH PRINT HTML DEBUG ===');
    console.log(html);
    console.log('=== END HTML DEBUG ===');
    
    // Create print window (temporarily visible for debugging)
    const printWindow = new BrowserWindow({
      width: 800,
      height: 800,
      show: true, // Make visible for debugging
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
        webSecurity: false
      }
    });
    
    printWindow.webContents.once('did-finish-load', () => {
      // Add a small delay to ensure content is fully rendered
      setTimeout(() => {
        printWindow.webContents.print({
          silent: false,
          printBackground: true,
          margins: {
            marginType: 'none'
          }
        }, (success, failureReason) => {
          if (success) {
            console.log(`${copies} label(s) for ${product.name} printed successfully`);
          } else {
            console.error('Single label print failed:', failureReason);
          }
          printWindow.destroy();
        });
      }, 500);
    });
    
    // Add error handling for failed page loads
    printWindow.webContents.once('did-fail-load', (event, errorCode, errorDescription) => {
      console.error('Single label print window failed to load:', errorDescription);
      printWindow.destroy();
    });
    
    printWindow.loadURL(`data:text/html;charset=UTF-8,${encodeURIComponent(html)}`);
    
    return { success: true };
  } catch (error) {
    console.error('Single label print error:', error);
    return { success: false, error: error.message };
  }
});

// Handle batch print labels IPC call - Direct printing functionality
ipcMain.handle('print-labels-batch', async (event, products, labelConfig) => {
  try {
    if (!products || products.length === 0) {
      return { success: false, error: 'No products provided for batch printing' };
    }

    const config = {
      width: labelConfig?.width || 50,
      height: labelConfig?.height || 25,
      layout: labelConfig?.layout || '2up',
      includeName: labelConfig?.includeName !== false,
      includePrice: labelConfig?.includePrice !== false,
      includeBarcode: labelConfig?.includeBarcode !== false,
      ...labelConfig
    };

    console.log('Batch print labelConfig received:', labelConfig);
    console.log('Batch print config processed:', config);

    // Calculate total copies for all products
    const totalCopies = products.reduce((sum, product) => sum + (product.copies || 1), 0);
    
    // Generate HTML for batch printing - Match web version exactly
    const html = `
<html>
  <head>
    <title>Batch Print Labels</title>
    <style>
      body { font-family: Arial; margin: 0; }
      .page { width: 108mm; margin: 0 auto; }
      .label-row { display: flex; gap: 2mm; margin-bottom: 2mm; justify-content: space-between; }
      .label { 
        border: none; 
        padding: 0; 
        width: ${config.layout === '2up' ? '53mm' : '104mm'};
        height: ${config.height}mm;
        text-align: center !important;
        font-size: ${config.layout === '2up' ? '14px' : '16px'};
        box-sizing: border-box;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        gap: 8px;
        page-break-inside: avoid;
        flex-shrink: 0;
      }
      .barcode { font-family: monospace; font-size: ${config.layout === '2up' ? '12px' : '14px'}; margin: 0; text-align: center !important; }
      .barcode-image { max-width: ${config.layout === '2up' ? '45mm' : '85mm'}; height: auto; margin: 0; display: block; margin-left: auto; margin-right: auto; }
      .name { font-weight: bold; margin: 0; font-size: ${config.layout === '2up' ? '16px' : '20px'}; line-height: 1.2; text-align: center !important; }
      .price { color: #000; font-size: ${config.layout === '2up' ? '18px' : '24px'}; font-weight: bold; margin: 0; text-align: center !important; }
      @media print {
        @page {
          size: 108mm auto;
          margin: 0 !important;
        }
        body { 
          margin: 0 !important;
          padding: 0;
          display: flex;
          justify-content: center;
        }
        .page { 
          width: 108mm; 
          margin: 0 auto;
        }
        .label { border: none; }
        .label-row { page-break-inside: avoid; }
      }
    </style>
  </head>
  <body>
    <div class="page">
      ${config.layout === '2up' ? 
        // 2-up layout: arrange all labels in pairs
        (() => {
          const allLabels = products.flatMap(product => 
            Array.from({length: product.copies || 1}, () => product)
          );
          return Array.from({length: Math.ceil(allLabels.length / 2)}, (_, rowIndex) => {
            const labelsInRow = allLabels.slice(rowIndex * 2, (rowIndex * 2) + 2);
            return `
              <div class="label-row">
                ${labelsInRow.map(product => `
                  <div class="label">
                    <div class="name">${product.name}</div>
                    <div class="price">₹${product.price}</div>
                    ${product.barcode_path ? `<img src="${process.env.VITE_API_URL || 'http://localhost:3001'}${product.barcode_path}" class="barcode-image" alt="Barcode" />` : ''}
                  </div>
                `).join('')}
              </div>
            `;
          }).join('');
        })() :
        // Single layout: one label per row, all copies
        products.map(product => 
          Array.from({length: product.copies || 1}, (_, i) => `
            <div class="label-row">
              <div class="label">
                <div class="name">${product.name}</div>
                <div class="price">₹${product.price}</div>
                ${product.barcode_path ? `<img src="${process.env.VITE_API_URL || 'http://localhost:3001'}${product.barcode_path}" class="barcode-image" alt="Barcode" />` : ''}
              </div>
            </div>
          `).join('')
        ).join('')
      }
    </div>
    <script>
      // Printing is handled by Electron's silent print API
      console.log('Label content loaded and ready for printing');
    </script>
  </body>
</html>
    `;
    
    // Create print window
    const printWindow = new BrowserWindow({
      width: 400,
      height: 600,
      show: false,
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
        webSecurity: false
      }
    });
    
    printWindow.webContents.once('did-finish-load', () => {
      // Add a small delay to ensure images are loaded
      setTimeout(() => {
        printWindow.webContents.print({
          silent: false,
          printBackground: true,
          margins: {
            marginType: 'none'
          }
        }, (success, failureReason) => {
          if (success) {
            console.log(`Batch labels printed successfully for ${products.length} products`);
          } else {
            console.error('Batch label print failed:', failureReason);
          }
          printWindow.destroy();
        });
      }, 1000);
    });
    
    // Add error handling for failed page loads
    printWindow.webContents.once('did-fail-load', (event, errorCode, errorDescription) => {
      console.error('Print window failed to load:', errorDescription);
      printWindow.destroy();
    });
    
    printWindow.loadURL(`data:text/html;charset=UTF-8,${encodeURIComponent(html)}`);
    
    return { success: true };
  } catch (error) {
    console.error('Batch print error:', error);
    return { success: false, error: error.message };
  }
});

// Handle print custom label IPC call
ipcMain.handle('print-custom-label', async (event, leftLabel, rightLabel, customConfig, commonSettings) => {
  try {
    // Generate HTML for custom label printing
    const getFontSize = (sizeKey) => {
      return {
        small: { line: '10px' },
        medium: { line: '12px' },
        large: { line: '14px' },
        xlarge: { line: '16px' },
        xxlarge: { line: '18px' },
        xxxlarge: { line: '20px' }
      }[sizeKey];
    };

    const generateLabelContent = (labelData, position) => {
      if (!labelData.line1 && !labelData.line2 && !labelData.line3 && !labelData.line4) {
        return `
          <div class="label empty-label">
            <div class="empty-text">Empty ${position} Label</div>
          </div>
        `;
      }
      
      return `
        <div class="label">
          ${labelData.line1 ? `<div class="line1" style="font-size: ${getFontSize(labelData.fontSize1).line};">${labelData.line1}</div>` : ''}
          ${labelData.line2 ? `<div class="line2" style="font-size: ${getFontSize(labelData.fontSize2).line};">${labelData.line2}</div>` : ''}
          ${labelData.line3 ? `<div class="line3" style="font-size: ${getFontSize(labelData.fontSize3).line};">${labelData.line3}</div>` : ''}
          ${labelData.line4 ? `<div class="line4" style="font-size: ${getFontSize(labelData.fontSize4).line};">${labelData.line4}</div>` : ''}
        </div>
      `;
    };

    const html = `
<html>
  <head>
    <title>Print Custom Labels</title>
    <style>
      body { font-family: Arial; margin: 0; }
      .page { width: 108mm; margin: 0 auto; }
      .label-row { display: flex; gap: 2mm; margin-bottom: 2mm; }
      .label { 
        ${commonSettings.includeBorder ? 'border: 1px solid #000;' : ''}
        padding: 8px; 
        width: ${customConfig.layout === '2up' ? '52mm' : '104mm'}; 
        height: ${customConfig.height}mm;
        text-align: ${commonSettings.alignment};
        box-sizing: border-box;
        display: flex;
        flex-direction: column;
        justify-content: center;
        gap: 3px;
      }
      .empty-label {
        ${commonSettings.includeBorder ? 'border: 1px dashed #ccc !important;' : ''}
        background-color: #f9f9f9;
      }
      .empty-text {
        color: #999;
        font-style: italic;
        font-size: 10px;
      }
      .line1, .line2 { 
        line-height: 1.2; 
        margin: 1px 0;
        word-wrap: break-word;
        font-weight: bold;
        font-size: 1.1em;
      }
      .line3, .line4 { 
        line-height: 1.2; 
        margin: 1px 0;
        word-wrap: break-word;
        font-size: 1em;
      }
      @media print {
        @page {
          size: 108mm auto;
          margin: 0 !important;
        }
        body { 
          margin: 0 !important;
          padding: 0;
          display: flex;
          justify-content: center;
        }
        .page { 
          width: 108mm; 
          margin: 0 auto;
        }
        .label { ${commonSettings.includeBorder ? 'border: 1px solid #000;' : ''} page-break-inside: avoid; }
        .empty-label { display: none; }
        .label-row { page-break-inside: avoid; }
      }
    </style>
  </head>
  <body>
    <div class="page">
      ${customConfig.layout === '2up' ? 
        // 2-up layout: arrange different left and right labels
        Array.from({length: customConfig.copies}, (_, i) => `
          <div class="label-row">
            ${generateLabelContent(leftLabel, 'Left')}
            ${generateLabelContent(rightLabel, 'Right')}
          </div>
        `).join('') :
        // Single layout: use left label data only
        Array.from({length: customConfig.copies}, (_, i) => `
          <div class="label-row">
            ${generateLabelContent(leftLabel, 'Single')}
          </div>
        `).join('')
      }
    </div>
    <script>
      // Printing is handled by Electron's silent print API
      console.log('Custom label content loaded and ready for printing');
    </script>
  </body>
</html>
`;

    // Create a new browser window that mimics window.open() behavior
    const printWindow = new BrowserWindow({
      width: 500,
      height: 700,
      show: false, // Don't show the window - print silently
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
        webSecurity: false // Needed to load local resources
      }
    });

    // Wait for window to be ready, then print
    printWindow.webContents.once('did-finish-load', () => {
      // Add a small delay to ensure content is fully rendered
      setTimeout(() => {
        printWindow.webContents.print({
          silent: false,
          printBackground: true,
          margins: {
            marginType: 'none'
          }
        }, (success, failureReason) => {
          if (success) {
            console.log(`Custom labels printed successfully (${customConfig.copies} copies)`);
          } else {
            console.error('Custom label print failed:', failureReason);
          }
          printWindow.destroy();
        });
      }, 500);
    });
    
    // Add error handling for failed page loads
    printWindow.webContents.once('did-fail-load', (event, errorCode, errorDescription) => {
      console.error('Custom label print window failed to load:', errorDescription);
      printWindow.destroy();
    });

    // Load the HTML content
    printWindow.loadURL(`data:text/html;charset=UTF-8,${encodeURIComponent(html)}`);
    
    return { success: true };
  } catch (error) {
    console.error('Custom label print error:', error);
    return { success: false, error: error.message };
  }
});

function createWindow() {
  // Load previous window state
  loadWindowState();
  
  mainWindow = new BrowserWindow({
    width: windowState.width,
    height: windowState.height,
    x: windowState.x,
    y: windowState.y,
    minWidth: 1200,
    minHeight: 800,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true,
    },
    show: false,
    icon: path.join(__dirname, 'assets', 'icon.png'), // Add app icon
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    backgroundColor: '#ffffff',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.js') // We'll create this
    }
  });

  // Restore maximized state
  if (windowState.maximized) {
    mainWindow.maximize();
  }

  // Save window state on resize and move
  mainWindow.on('resize', saveWindowState);
  mainWindow.on('move', saveWindowState);
  mainWindow.on('maximize', () => {
    windowState.maximized = true;
    saveWindowState();
  });
  mainWindow.on('unmaximize', () => {
    windowState.maximized = false;
    saveWindowState();
  });

  if (!isDev) {
    startBackend();
  }

  const devURL = 'http://localhost:5173';
  const prodIndex = path.join(__dirname, 'frontend', 'dist', 'index.html');

  if (isDev) {
    mainWindow.loadURL(devURL);
    // DevTools removed - no longer opens automatically
  } else {
    mainWindow.loadFile(prodIndex);
  }

  // Enhanced window ready handling
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    
    // Focus window on creation
    if (process.platform === 'darwin') {
      mainWindow.focus();
    }
    
    // Set window title
    mainWindow.setTitle('Mall POS - Bharat Kitchenware');
  });

  // Handle external links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Create native application menu
function createMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'New Sale',
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send('navigate-to', '/pos');
            }
          }
        },
        {
          label: 'Products',
          accelerator: 'CmdOrCtrl+P',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send('navigate-to', '/products');
            }
          }
        },
        { type: 'separator' },
        {
          label: 'Export Data',
          click: async () => {
            const result = await dialog.showSaveDialog(mainWindow, {
              title: 'Export Data',
              defaultPath: `mall-pos-backup-${new Date().toISOString().split('T')[0]}.json`,
              filters: [
                { name: 'JSON Files', extensions: ['json'] },
                { name: 'All Files', extensions: ['*'] }
              ]
            });
            
            if (!result.canceled && result.filePath) {
              mainWindow.webContents.send('export-data', result.filePath);
            }
          }
        },
        { type: 'separator' },
        {
          label: 'Exit',
          accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
          click: () => {
            app.quit();
          }
        }
      ]
    },
    {
      label: 'View',
      submenu: [
        {
          label: 'Dashboard',
          accelerator: 'CmdOrCtrl+D',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send('navigate-to', '/sales-history');
            }
          }
        },
        {
          label: 'Customers',
          accelerator: 'CmdOrCtrl+U',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send('navigate-to', '/customers');
            }
          }
        },
        { type: 'separator' },
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'close' },
        ...(process.platform === 'darwin' ? [
          { type: 'separator' },
          { role: 'front' },
          { type: 'separator' },
          { role: 'window' }
        ] : [])
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About Mall POS',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'About Mall POS',
              message: 'Mall POS - Bharat Kitchenware',
              detail: `Version: 1.0.0\nElectron: ${process.versions.electron}\nNode: ${process.versions.node}\nChrome: ${process.versions.chrome}`,
              buttons: ['OK']
            });
          }
        },
        {
          label: 'Keyboard Shortcuts',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'Keyboard Shortcuts',
              message: 'Keyboard Shortcuts',
              detail: 'Ctrl+N: New Sale\nCtrl+P: Products\nCtrl+D: Dashboard\nCtrl+U: Customers\nF11: Toggle Fullscreen\nCtrl+R: Reload\nF12: Developer Tools',
              buttons: ['OK']
            });
          }
        },
        { type: 'separator' },
        {
          label: 'Visit Website',
          click: () => {
            shell.openExternal('https://your-website.com');
          }
        }
      ]
    }
  ];

  // macOS specific menu adjustments
  if (process.platform === 'darwin') {
    template.unshift({
      label: app.getName(),
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideothers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    });
  }

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

app.whenReady().then(() => {
  createMenu();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});