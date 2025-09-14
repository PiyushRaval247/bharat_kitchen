import React, { useState, useEffect } from "react";
import { PrinterAPI } from "../api";

export default function CustomLabelPage() {
  const [loading, setLoading] = useState(false);
  // Printer settings have been removed as per requirements
  const [printerStatus, setPrinterStatus] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  
  // Custom label configuration
  const [customConfig, setCustomConfig] = useState({
    width: 50,
    height: 38,
    layout: '2up', // 2-up layout for 100mm page
    copies: 1
  });

  // Custom text fields for left and right labels
  const [leftLabel, setLeftLabel] = useState({
    line1: '',
    line2: '',
    line3: '',
    line4: '',
    fontSize1: 'medium',
    fontSize2: 'medium', 
    fontSize3: 'small',
    fontSize4: 'small'
  });

  const [rightLabel, setRightLabel] = useState({
    line1: '',
    line2: '',
    line3: '',
    line4: '',
    fontSize1: 'medium',
    fontSize2: 'medium', 
    fontSize3: 'small',
    fontSize4: 'small'
  });

  // Common settings
  const [commonSettings, setCommonSettings] = useState({
    includeBorder: true,
    alignment: 'center',
    useSameTextForBoth: false // Toggle to use same text for both labels
  });

  // Test printer - simplified as printer selection has been removed
  const testPrinter = async () => {
    try {
      setPrinterStatus('Testing...');
      // Using default printer
      const result = await PrinterAPI.testPrinter('printer:default');
      setPrinterStatus(result.success ? '✅ ' + result.message : '❌ ' + result.message);
    } catch (error) {
      setPrinterStatus('❌ Test failed: ' + error.message);
    }
  };

  // Print custom labels
  const printCustomLabels = async () => {
    try {
      setLoading(true);
      
      // Check if at least one label has content
      const leftHasContent = leftLabel.line1 || leftLabel.line2 || leftLabel.line3 || leftLabel.line4;
      const rightHasContent = rightLabel.line1 || rightLabel.line2 || rightLabel.line3 || rightLabel.line4;
      
      if (!leftHasContent && !rightHasContent) {
        alert('Please enter text for at least one label (left or right)');
        return;
      }

      // Check if running in Electron
      if (window.electronAPI && window.electronAPI.printCustomLabel) {
        // Use Electron IPC printing
        try {
          const result = await window.electronAPI.printCustomLabel(leftLabel, rightLabel, customConfig, commonSettings);
          if (!result.success) {
            console.error('Custom label printing failed:', result.error);
            alert('❌ Custom label printing failed: ' + result.error);
          } else {
            // Show success message
            const toast = document.createElement('div');
            toast.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50';
            toast.textContent = `✅ ${customConfig.copies} custom label(s) sent to printer`;
            document.body.appendChild(toast);
            setTimeout(() => document.body.removeChild(toast), 2000);
          }
        } catch (error) {
          console.error('Custom label printing error:', error);
          alert('❌ Custom label printing error: ' + error.message);
        }
        return;
      }

      if (showPreview) {
        // Open print preview
        const printWindow = window.open('', '_blank', 'width=500,height=700');
        if (!printWindow) {
          alert('Please allow popups for print preview');
          return;
        }
        
        const html = generatePrintHTML(true);
        printWindow.document.write(html);
        printWindow.document.close();
      } else {
        // Direct print
        const printWindow = window.open('', '_blank', 'width=500,height=700');
        if (!printWindow) {
          alert('Please allow popups for printing');
          return;
        }
        
        const html = generatePrintHTML(false);
        printWindow.document.write(html);
        printWindow.document.close();
      }

      // Show success message
      const toast = document.createElement('div');
      toast.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50';
      toast.textContent = `✅ ${customConfig.copies} custom label(s) ${showPreview ? 'previewed' : 'sent to printer'}`;
      document.body.appendChild(toast);
      setTimeout(() => document.body.removeChild(toast), 2000);
      
    } catch (error) {
      alert('❌ Print failed: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Generate HTML for printing
  const generatePrintHTML = (isPreview) => {
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

    return `
      <html>
        <head>
          <title>${isPreview ? 'Custom Label Preview' : 'Print Custom Labels'}</title>
          <style>
            body { font-family: Arial; margin: ${isPreview ? '20px' : '0'}; }
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
              font-size: 1.1em; /* Increased size for better visibility */
            }
            .line3, .line4 { 
              line-height: 1.2; 
              margin: 1px 0;
              word-wrap: break-word;
              font-size: 1em; /* Increased size for better visibility */
            }
            button { margin: 10px 5px; padding: 10px 20px; }
            .print-btn { background: #4CAF50; color: white; border: none; cursor: pointer; }
            .cancel-btn { background: #f44336; color: white; border: none; cursor: pointer; }
            @media print {
              body { margin: 0; }
              button { display: none; }
              .page { width: 108mm; margin: 0; }
              .label { ${commonSettings.includeBorder ? 'border: 1px solid #000;' : ''} page-break-inside: avoid; }
              .empty-label { display: none; }
              .label-row { page-break-inside: avoid; }
            }
          </style>
        </head>
        <body>
          ${isPreview ? `<h3>🏷️ Custom Label Preview (${customConfig.copies} copies) - ${customConfig.layout === '2up' ? '2-up Layout (Left & Right)' : 'Single Layout'}</h3>` : ''}
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
          ${isPreview ? `
            <div>
              <button class="print-btn" onclick="window.print(); setTimeout(() => window.close(), 1000);">🖨️ Print Now</button>
              <button class="cancel-btn" onclick="window.close()">❌ Cancel</button>
            </div>
          ` : `
            <script>
              window.onload = function() {
                window.print();
                setTimeout(() => window.close(), 2000);
              }
            </script>
          `}
        </body>
      </html>
    `;
  };

  useEffect(() => {
    // Printer loading has been removed as per requirements
  }, []);

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">🏷️ Custom Label Printing</h1>
        <p className="text-gray-600">Create and print custom labels with your own text</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Label Design Panel */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4 text-blue-600">📜 Left Label Design</h2>
          
          {/* Left Label Text Fields */}
          <div className="space-y-4 mb-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Line 1 (Title)
                </label>
                <select
                  className="text-xs border border-gray-300 rounded px-2 py-1"
                  value={leftLabel.fontSize1}
                  onChange={(e) => setLeftLabel({...leftLabel, fontSize1: e.target.value})}
                >
                  <option value="small">Small</option>
                  <option value="medium">Medium</option>
                  <option value="large">Large</option>
                  <option value="xlarge">X-Large</option>
                  <option value="xxlarge">XX-Large</option>
                  <option value="xxxlarge">XXX-Large</option>
                </select>
              </div>
              <input
                type="text"
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                value={leftLabel.line1}
                onChange={(e) => setLeftLabel({...leftLabel, line1: e.target.value})}
                placeholder="Enter left title..."
                maxLength="30"
              />
            </div>
            
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Line 2 (Subtitle)
                </label>
                <select
                  className="text-xs border border-gray-300 rounded px-2 py-1"
                  value={leftLabel.fontSize2}
                  onChange={(e) => setLeftLabel({...leftLabel, fontSize2: e.target.value})}
                >
                  <option value="small">Small</option>
                  <option value="medium">Medium</option>
                  <option value="large">Large</option>
                  <option value="xlarge">X-Large</option>
                  <option value="xxlarge">XX-Large</option>
                  <option value="xxxlarge">XXX-Large</option>
                </select>
              </div>
              <input
                type="text"
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                value={leftLabel.line2}
                onChange={(e) => setLeftLabel({...leftLabel, line2: e.target.value})}
                placeholder="Enter left subtitle..."
                maxLength="40"
              />
            </div>
            
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Line 3
                </label>
                <select
                  className="text-xs border border-gray-300 rounded px-2 py-1"
                  value={leftLabel.fontSize3}
                  onChange={(e) => setLeftLabel({...leftLabel, fontSize3: e.target.value})}
                >
                  <option value="small">Small</option>
                  <option value="medium">Medium</option>
                  <option value="large">Large</option>
                  <option value="xlarge">X-Large</option>
                  <option value="xxlarge">XX-Large</option>
                  <option value="xxxlarge">XXX-Large</option>
                </select>
              </div>
              <input
                type="text"
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                value={leftLabel.line3}
                onChange={(e) => setLeftLabel({...leftLabel, line3: e.target.value})}
                placeholder="Enter left line 3..."
                maxLength="40"
              />
            </div>
            
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Line 4
                </label>
                <select
                  className="text-xs border border-gray-300 rounded px-2 py-1"
                  value={leftLabel.fontSize4}
                  onChange={(e) => setLeftLabel({...leftLabel, fontSize4: e.target.value})}
                >
                  <option value="small">Small</option>
                  <option value="medium">Medium</option>
                  <option value="large">Large</option>
                  <option value="xlarge">X-Large</option>
                  <option value="xxlarge">XX-Large</option>
                  <option value="xxxlarge">XXX-Large</option>
                </select>
              </div>
              <input
                type="text"
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                value={leftLabel.line4}
                onChange={(e) => setLeftLabel({...leftLabel, line4: e.target.value})}
                placeholder="Enter left line 4..."
                maxLength="40"
              />
            </div>
          </div>

          {/* Copy to Right Button */}
          <button
            onClick={() => setRightLabel({...leftLabel})}
            className="w-full px-3 py-2 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 text-sm mb-4"
          >
            ➡️ Copy to Right Label
          </button>
        </div>

        {/* Right Label Design Panel */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4 text-green-600">📝 Right Label Design</h2>
          
          {/* Right Label Text Fields */}
          <div className="space-y-4 mb-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Line 1 (Title)
                </label>
                <select
                  className="text-xs border border-gray-300 rounded px-2 py-1"
                  value={rightLabel.fontSize1}
                  onChange={(e) => setRightLabel({...rightLabel, fontSize1: e.target.value})}
                >
                  <option value="small">Small</option>
                  <option value="medium">Medium</option>
                  <option value="large">Large</option>
                  <option value="xlarge">X-Large</option>
                  <option value="xxlarge">XX-Large</option>
                  <option value="xxxlarge">XXX-Large</option>
                </select>
              </div>
              <input
                type="text"
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                value={rightLabel.line1}
                onChange={(e) => setRightLabel({...rightLabel, line1: e.target.value})}
                placeholder="Enter right title..."
                maxLength="30"
              />
            </div>
            
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Line 2 (Subtitle)
                </label>
                <select
                  className="text-xs border border-gray-300 rounded px-2 py-1"
                  value={rightLabel.fontSize2}
                  onChange={(e) => setRightLabel({...rightLabel, fontSize2: e.target.value})}
                >
                  <option value="small">Small</option>
                  <option value="medium">Medium</option>
                  <option value="large">Large</option>
                  <option value="xlarge">X-Large</option>
                  <option value="xxlarge">XX-Large</option>
                  <option value="xxxlarge">XXX-Large</option>
                </select>
              </div>
              <input
                type="text"
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                value={rightLabel.line2}
                onChange={(e) => setRightLabel({...rightLabel, line2: e.target.value})}
                placeholder="Enter right subtitle..."
                maxLength="40"
              />
            </div>
            
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Line 3
                </label>
                <select
                  className="text-xs border border-gray-300 rounded px-2 py-1"
                  value={rightLabel.fontSize3}
                  onChange={(e) => setRightLabel({...rightLabel, fontSize3: e.target.value})}
                >
                  <option value="small">Small</option>
                  <option value="medium">Medium</option>
                  <option value="large">Large</option>
                  <option value="xlarge">X-Large</option>
                  <option value="xxlarge">XX-Large</option>
                  <option value="xxxlarge">XXX-Large</option>
                </select>
              </div>
              <input
                type="text"
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                value={rightLabel.line3}
                onChange={(e) => setRightLabel({...rightLabel, line3: e.target.value})}
                placeholder="Enter right line 3..."
                maxLength="40"
              />
            </div>
            
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Line 4
                </label>
                <select
                  className="text-xs border border-gray-300 rounded px-2 py-1"
                  value={rightLabel.fontSize4}
                  onChange={(e) => setRightLabel({...rightLabel, fontSize4: e.target.value})}
                >
                  <option value="small">Small</option>
                  <option value="medium">Medium</option>
                  <option value="large">Large</option>
                  <option value="xlarge">X-Large</option>
                  <option value="xxlarge">XX-Large</option>
                  <option value="xxxlarge">XXX-Large</option>
                </select>
              </div>
              <input
                type="text"
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                value={rightLabel.line4}
                onChange={(e) => setRightLabel({...rightLabel, line4: e.target.value})}
                placeholder="Enter right line 4..."
                maxLength="40"
              />
            </div>
          </div>

          {/* Copy from Left Button */}
          <button
            onClick={() => setRightLabel({...leftLabel})}
            className="w-full px-3 py-2 bg-green-100 text-green-700 rounded-md hover:bg-green-200 text-sm mb-4"
          >
            ⬅️ Copy from Left Label
          </button>
        </div>

        {/* Print Settings Panel */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">🖨️ Print Settings</h2>
          
          {/* Common Style Options */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Common Settings</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Text Alignment
                </label>
                <select
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  value={commonSettings.alignment}
                  onChange={(e) => setCommonSettings({...commonSettings, alignment: e.target.value})}
                >
                  <option value="left">Left</option>
                  <option value="center">Center</option>
                  <option value="right">Right</option>
                </select>
              </div>
              
              <div>
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={commonSettings.includeBorder}
                    onChange={(e) => setCommonSettings({...commonSettings, includeBorder: e.target.checked})}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 mr-2"
                  />
                  <span className="text-sm text-gray-700">Include Border</span>
                </label>
              </div>
            </div>
          </div>

          {/* Quick Templates */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Quick Templates
            </label>
            <div className="grid grid-cols-1 gap-2">
              <button
                onClick={() => {
                  setLeftLabel({
                    line1: 'SALE',
                    line2: '50% OFF',
                    line3: 'Limited Time',
                    line4: '',
                    fontSize1: 'large',
                    fontSize2: 'xlarge',
                    fontSize3: 'medium',
                    fontSize4: 'small'
                  });
                  setRightLabel({
                    line1: 'SPECIAL',
                    line2: 'OFFER',
                    line3: 'Buy Now!',
                    line4: '',
                    fontSize1: 'large',
                    fontSize2: 'xlarge',
                    fontSize3: 'medium',
                    fontSize4: 'small'
                  });
                }}
                className="px-3 py-2 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 text-sm"
              >
                Sale Template (Left: Sale, Right: Special)
              </button>
              <button
                onClick={() => {
                  setLeftLabel({
                    line1: 'PRODUCT A',
                    line2: '₹299',
                    line3: 'High Quality',
                    line4: '',
                    fontSize1: 'medium',
                    fontSize2: 'large',
                    fontSize3: 'small',
                    fontSize4: 'small'
                  });
                  setRightLabel({
                    line1: 'PRODUCT B',
                    line2: '₹399',
                    line3: 'Premium',
                    line4: '',
                    fontSize1: 'medium',
                    fontSize2: 'large',
                    fontSize3: 'small',
                    fontSize4: 'small'
                  });
                }}
                className="px-3 py-2 bg-green-100 text-green-700 rounded-md hover:bg-green-200 text-sm"
              >
                Product Template (A & B)
              </button>
              <button
                onClick={() => {
                  setLeftLabel({
                    line1: '',
                    line2: '',
                    line3: '',
                    line4: '',
                    fontSize1: 'medium',
                    fontSize2: 'medium',
                    fontSize3: 'small',
                    fontSize4: 'small'
                  });
                  setRightLabel({
                    line1: '',
                    line2: '',
                    line3: '',
                    line4: '',
                    fontSize1: 'medium',
                    fontSize2: 'medium',
                    fontSize3: 'small',
                    fontSize4: 'small'
                  });
                }}
                className="px-3 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 text-sm"
              >
                Clear Both Labels
              </button>
            </div>
          </div>
          
          {/* Label Configuration */}
          <div className="grid grid-cols-1 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Label Layout
              </label>
              <div className="space-y-2">
                <label className="flex items-center text-sm text-gray-700">
                  <input
                    type="radio"
                    name="layout"
                    checked={customConfig.layout === '2up' && customConfig.width === 50 && customConfig.height === 38}
                    onChange={(e) => setCustomConfig({...customConfig, layout: '2up', width: 50, height: 38})}
                    className="w-4 h-4 mr-2"
                  />
                  50×38 mm (Standard 2-up)
                </label>
                <label className="flex items-center text-sm text-gray-700">
                  <input
                    type="radio"
                    name="layout"
                    checked={customConfig.layout === '2up' && customConfig.width === 50 && customConfig.height === 25}
                    onChange={(e) => setCustomConfig({...customConfig, layout: '2up', width: 50, height: 25})}
                    className="w-4 h-4 mr-2"
                  />
                  50×25 mm (Compact 2-up)
                </label>
                <label className="flex items-center text-sm text-gray-700">
                  <input
                    type="radio"
                    name="layout"
                    checked={customConfig.layout === '1up'}
                    onChange={(e) => setCustomConfig({...customConfig, layout: '1up', width: 100, height: 38})}
                    className="w-4 h-4 mr-2"
                  />
                  100×38 mm (Single Label)
                </label>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Copies
              </label>
              <input
                type="number"
                min="1"
                max="100"
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                value={customConfig.copies}
                onChange={(e) => setCustomConfig({...customConfig, copies: Number(e.target.value)})}
              />
            </div>
          </div>

          {/* Print Mode */}
          <div className="mb-6">
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={showPreview}
                onChange={(e) => setShowPreview(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 mr-2"
              />
              <span className="text-sm text-gray-700">
                {showPreview ? '👁️ Preview First' : '🖨️ Direct Windows Print'}
              </span>
            </label>
          </div>

          {/* Test Printer Button - simplified as printer selection has been removed */}
          <button
            onClick={testPrinter}
            className="w-full mb-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Test Printer
          </button>

          {printerStatus && (
            <div className="mb-4 text-sm font-medium">
              {printerStatus}
            </div>
          )}

          {/* Print Button */}
          <button
            onClick={printCustomLabels}
            disabled={loading}
            className={`w-full px-4 py-3 rounded-md font-medium ${
              loading
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-green-600 text-white hover:bg-green-700'
            }`}
          >
            {loading ? '🔄 Processing...' : showPreview ? '👁️ Preview Labels' : '🖨️ Print Custom Labels'}
          </button>
        </div>
      </div>

      {/* Live Preview */}
      <div className="mt-6 bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">👀 Live Preview - 2-up Layout</h2>
        <div className="border-2 border-dashed border-gray-300 p-4 bg-gray-50 rounded-lg">
          <div className="flex justify-center gap-4">
            {/* Left Label Preview */}
            <div className="text-center">
              <div className="text-xs text-blue-600 font-medium mb-2">Left Label</div>
              <div 
                className={`${commonSettings.includeBorder ? 'border border-gray-400' : ''} p-3 bg-white rounded`}
                style={{
                  width: '180px',
                  height: '120px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  textAlign: commonSettings.alignment
                }}
              >
                {leftLabel.line1 && (
                  <div style={{
                    fontWeight: 'bold', 
                    lineHeight: '1.2',
                    fontSize: {
                      small: '10px',
                      medium: '12px', 
                      large: '14px',
                      xlarge: '16px',
                      xxlarge: '18px',
                      xxxlarge: '20px'
                    }[leftLabel.fontSize1]
                  }}>
                    {leftLabel.line1}
                  </div>
                )}
                {leftLabel.line2 && (
                  <div style={{
                    fontWeight: 'bold',
                    lineHeight: '1.2',
                    fontSize: {
                      small: '10px',
                      medium: '12px',
                      large: '14px', 
                      xlarge: '16px',
                      xxlarge: '18px',
                      xxxlarge: '20px'
                    }[leftLabel.fontSize2]
                  }}>
                    {leftLabel.line2}
                  </div>
                )}
                {leftLabel.line3 && (
                  <div style={{
                    lineHeight: '1.2',
                    fontSize: {
                      small: '10px',
                      medium: '12px',
                      large: '14px',
                      xlarge: '16px',
                      xxlarge: '18px',
                      xxxlarge: '20px'
                    }[leftLabel.fontSize3]
                  }}>
                    {leftLabel.line3}
                  </div>
                )}
                {leftLabel.line4 && (
                  <div style={{
                    lineHeight: '1.2',
                    fontSize: {
                      small: '10px',
                      medium: '12px',
                      large: '14px',
                      xlarge: '16px',
                      xxlarge: '18px',
                      xxxlarge: '20px'
                    }[leftLabel.fontSize4]
                  }}>
                    {leftLabel.line4}
                  </div>
                )}
                {!leftLabel.line1 && !leftLabel.line2 && !leftLabel.line3 && !leftLabel.line4 && (
                  <div style={{color: '#9CA3AF', fontStyle: 'italic', fontSize: '10px'}}>Left label empty</div>
                )}
              </div>
            </div>

            {/* Right Label Preview */}
            <div className="text-center">
              <div className="text-xs text-green-600 font-medium mb-2">Right Label</div>
              <div 
                className={`${commonSettings.includeBorder ? 'border border-gray-400' : ''} p-3 bg-white rounded`}
                style={{
                  width: '180px',
                  height: '120px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  textAlign: commonSettings.alignment
                }}
              >
                {rightLabel.line1 && (
                  <div style={{
                    fontWeight: 'bold', 
                    lineHeight: '1.2',
                    fontSize: {
                      small: '10px',
                      medium: '12px', 
                      large: '14px',
                      xlarge: '16px',
                      xxlarge: '18px',
                      xxxlarge: '20px'
                    }[rightLabel.fontSize1]
                  }}>
                    {rightLabel.line1}
                  </div>
                )}
                {rightLabel.line2 && (
                  <div style={{
                    fontWeight: 'bold',
                    lineHeight: '1.2',
                    fontSize: {
                      small: '10px',
                      medium: '12px',
                      large: '14px', 
                      xlarge: '16px',
                      xxlarge: '18px',
                      xxxlarge: '20px'
                    }[rightLabel.fontSize2]
                  }}>
                    {rightLabel.line2}
                  </div>
                )}
                {rightLabel.line3 && (
                  <div style={{
                    lineHeight: '1.2',
                    fontSize: {
                      small: '10px',
                      medium: '12px',
                      large: '14px',
                      xlarge: '16px',
                      xxlarge: '18px',
                      xxxlarge: '20px'
                    }[rightLabel.fontSize3]
                  }}>
                    {rightLabel.line3}
                  </div>
                )}
                {rightLabel.line4 && (
                  <div style={{
                    lineHeight: '1.2',
                    fontSize: {
                      small: '10px',
                      medium: '12px',
                      large: '14px',
                      xlarge: '16px',
                      xxlarge: '18px',
                      xxxlarge: '20px'
                    }[rightLabel.fontSize4]
                  }}>
                    {rightLabel.line4}
                  </div>
                )}
                {!rightLabel.line1 && !rightLabel.line2 && !rightLabel.line3 && !rightLabel.line4 && (
                  <div style={{color: '#9CA3AF', fontStyle: 'italic', fontSize: '10px'}}>Right label empty</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}