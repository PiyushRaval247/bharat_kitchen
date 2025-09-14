const { ThermalPrinter, PrinterTypes, CharacterSet, BreakLine } = require('node-thermal-printer');
const fs = require('fs');
const path = require('path');

// 3-inch Thermal Printer Configuration (72mm width)

const QRCode = require('qrcode');


// --- Config for TVS 72mm printer (real width = 28 chars) ---
const PRINTER_CONFIG = {
  type: PrinterTypes.GENERIC,
  interface: process.env.PRINTER_INTERFACE || 'printer:default',
  characterSet: CharacterSet.PC437_USA,
  removeSpecialCharacters: false,
  lineCharacter: "-", // dashed line
  breakLine: BreakLine.WORD,
  options: { timeout: 5000 },
  width: 28, // actual printable characters for your printer
  marginLeft: 0,
  marginRight: 0,
  paddingLeft: 0,
  paddingRight: 0,
};

function createPrinter(config = {}) {
  const printerConfig = { ...PRINTER_CONFIG, ...config };
  return new ThermalPrinter(printerConfig);
}

async function printReceipt(receipt) {
  if (!receipt) return false;

  try {
    const printer = createPrinter();

    const isConnected = await printer.isPrinterConnected();
    if (!isConnected) {
      console.log('⚠️ Printer not connected');
      return false;
    }

    printer.clear();
    printer.alignCenter();

    // --- Logo ---
    const logoPath = path.join(__dirname, '../../frontend/assets/logo.png');
    if (fs.existsSync(logoPath)) {
      try {
        await printer.printImage(logoPath);
        printer.newLine();
      } catch (err) {
        console.log('⚠️ Logo print failed:', err.message);
      }
    }

    // --- Header ---
    printer.setTextSize(1, 1);
    printer.bold(true);
    printer.println('BHARAT KITCHENWARE');
    printer.bold(false);
    printer.setTextSize(0, 0);

    printer.println('Contact: +91 91061 98615');
    printer.println('Address: 123 Market Road, Rajkot, Gujarat');
    printer.println('GST No: 24AHMPT3449F1Z3');
    printer.drawLine();

    // --- Bill Info ---
    const date = new Date(receipt.createdAt || new Date());
    printer.alignLeft();
    printer.println(`Bill #: ${receipt.billNumber}`);
    printer.println(`Date: ${date.toLocaleDateString()}  Time: ${date.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}`);
    if (receipt.customerName) printer.println(`Customer: ${receipt.customerName}`);
    if (receipt.customerPhone) printer.println(`Phone: ${receipt.customerPhone}`);
    printer.drawLine();

    // --- Items Table ---
    printer.println('Item          Qty  Price'); // 28 chars total
    printer.drawLine();

    for (const item of receipt.items) {
      const name = item.name.length > 14 ? item.name.substring(0, 14) : item.name.padEnd(14); // Item name column
      const qty = `x${item.quantity}`.padStart(4);  // Qty column
      const price = `₹${(item.price*item.quantity).toFixed(2)}`.padStart(8); // Price column
      printer.println(name + qty + price);
    }

    printer.drawLine();

    // --- GST + Total ---
    printer.println(`CGST (0%): ₹0.00`);
    printer.println(`SGST (0%): ₹0.00`);
    printer.drawLine();

    printer.alignCenter();
    printer.setTextSize(1, 1);
    printer.bold(true);
    printer.println(`TOTAL: ₹${receipt.total.toFixed(2)}`);
    printer.bold(false);
    printer.setTextSize(0, 0);
    printer.drawLine();

    // --- QR Code for UPI ---
    if (receipt.total) {
      const upiLink = `upi://pay?pa=8200638429@pthdfc&pn=Bharat Kitchenware&am=${receipt.total}&cu=INR`;
      const qrBuffer = await QRCode.toBuffer(upiLink, { type: 'png', width: 200, margin: 1 });
      await printer.printImageBuffer(qrBuffer);
      printer.println('SCAN TO PAY UPI');
      printer.drawLine();
    }

    // --- Payment + Footer ---
    if (receipt.paymentMethod) {
      printer.println(`Payment: ${receipt.paymentMethod.toUpperCase()}`);
    }

    printer.println('VISIT AGAIN!');
    printer.println('--- THANK YOU ---');
    printer.newLine();
    printer.cut();

    await printer.execute();
    console.log('✅ Receipt printed successfully with perfect alignment for TVS printer');
    return true;

  } catch (error) {
    console.error('❌ Thermal printer error:', error.message);
    return false;
  }
}

// Print label function (Windows Print Environment)
async function printLabel(product, copies = 1, labelConfig = {}) {
  console.log(`--- Printing ${copies} label(s) for ${product.name} ---`);
  
  const config = {
    width: 50, // mm
    height: 25, // mm
    margin: 1, // mm
    includeName: true,
    includePrice: true,
    includeBarcode: true,
    ...labelConfig
  };
  
  // Always use Windows print environment for better compatibility
  console.log('🖨️ Using Windows print environment');
  return windowsPrintLabel(product, copies, config);
}

// Batch print multiple products efficiently (Windows Print Environment)
async function printLabelsBatch(products, labelConfig = {}) {
  console.log(`--- Batch printing labels for ${products.length} products ---`);
  
  const config = {
    width: 50,
    height: 25,
    margin: 1,
    includeName: true,
    includePrice: true,
    includeBarcode: true,
    ...labelConfig
  };
  
  // Always use Windows print environment for better compatibility
  console.log('🖨️ Using Windows print environment for batch printing');
  return windowsBatchPrint(products, config);
}

// Windows Print Environment methods
function windowsPrintLabel(product, copies, config) {
  console.log(`Windows Print: ${copies} labels for ${product.name}`);
  // Return success - the actual printing will be handled by the frontend
  // through browser print dialog when user clicks print
  return true;
}

function windowsBatchPrint(products, config) {
  const totalLabels = products.reduce((sum, p) => sum + (p.copies || 1), 0);
  console.log(`Windows Print: Batch printing ${totalLabels} labels for ${products.length} products`);
  // Return success - the actual printing will be handled by the frontend
  return true;
}

// Fallback print methods (browser-based for compatibility) with perfect centering
function fallbackPrintReceipt(receipt) {
  console.log('Using fallback receipt printing with perfect centering...');
  
  // Simulate printer centering by calculating center position
  const LINE_WIDTH = 32;
  const center = (text) => {
    const len = text.length;
    if (len >= LINE_WIDTH) return text;
    const pad = Math.floor((LINE_WIDTH - len) / 2);
    return ' '.repeat(pad) + text;
  };
  
  console.log(center('================================'));
  console.log(center('      BHARAT KITCHENWARE      '));
  console.log(center('   Contact: +91 91061 98615   '));
  console.log(center('   Thank you for shopping!   '));
  console.log(center('================================'));
  console.log(center(`Bill #: ${receipt.id}`));
  console.log(center(`Date: ${new Date(receipt.createdAt || new Date()).toLocaleDateString()}`));
  console.log(center(`Time: ${new Date(receipt.createdAt || new Date()).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`));
  if (receipt.customerName) {
    console.log(center(`Customer: ${receipt.customerName}`));
  }
  if (receipt.customerPhone) {
    console.log(center(`Phone: ${receipt.customerPhone}`));
  }
  console.log(center('================================'));
  console.log('Item                 Qty     Price'); // Left aligned
  console.log('================================');
  for (const item of receipt.items) {
    const itemName = item.name.length > 18 ? item.name.substring(0, 18) : item.name;
    const qtyStr = `x${item.quantity}`;
    const priceStr = `₹${(item.price * item.quantity).toFixed(2)}`;
    const line = itemName.padEnd(18) + ' ' + qtyStr.padStart(4) + ' ' + priceStr.padStart(8);
    console.log(line);
  }
  console.log(center('================================'));
  console.log(center(`TOTAL: ₹${receipt.total.toFixed(2)}`));
  console.log(center('================================'));
  if (receipt.paymentMethod) {
    console.log(center(`Payment: ${receipt.paymentMethod.toUpperCase()}`));
  }
  console.log(center('VISIT AGAIN!'));
  console.log(center('--- THANK YOU ---'));
  console.log(center('================================'));
  return true;
}

// Get available printers
async function getAvailablePrinters() {
  try {
    const printer = createPrinter();
    // This varies by OS, for now return common options
    return [
      { name: 'Default System Printer', interface: 'printer:default' },
      { name: 'USB Thermal Printer', interface: 'usb' },
      { name: 'Network Printer (192.168.1.100)', interface: 'tcp://192.168.1.100' },
    ];
  } catch (error) {
    console.error('Error getting printers:', error.message);
    return [];
  }
}

// Test printer connection
async function testPrinter(printerInterface = 'printer:default') {
  try {
    const printer = createPrinter({ interface: printerInterface });
    const isConnected = await printer.isPrinterConnected();
    
    if (isConnected) {
      // Print test page with perfect centering
      printer.clear();
      printer.alignCenter();
      printer.bold(true);
      printer.println('PRINTER TEST');
      printer.bold(false);
      printer.println('Test successful!');
      printer.println(new Date().toLocaleString());
      printer.cut();
      await printer.execute();
      
      return { success: true, message: 'Printer test successful with perfect centering!' };
    } else {
      return { success: false, message: 'Printer not connected' };
    }
  } catch (error) {
    return { success: false, message: error.message };
  }
}

module.exports = { 
  printReceipt, 
  printLabel, 
  printLabelsBatch,
  getAvailablePrinters, 
  testPrinter,
  createPrinter 
};