const statusEl = document.getElementById('status');
const lastBarcodeEl = document.getElementById('last-barcode');
const videoEl = document.getElementById('video');

// Parse URL params for custom WebSocket endpoint or session
const urlParams = new URLSearchParams(window.location.search);
const wsHost = urlParams.get('ws') || window.location.hostname || 'localhost';
const wsPort = urlParams.get('port') || '17777';
const wsUrl = `ws://${wsHost}:${wsPort}`;

let ws = null;
let codeReader = null;
let lastScannedTime = 0;
let lastCode = '';

function connectWebSocket() {
  try {
    ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      statusEl.textContent = 'Connected to POS';
      statusEl.className = 'status connected';
      console.log('Connected to Bridge WebSocket');
    };

    ws.onclose = () => {
      statusEl.textContent = 'Disconnected (Reconnecting...)';
      statusEl.className = 'status disconnected';
      setTimeout(connectWebSocket, 3000);
    };

    ws.onerror = (err) => {
      console.error('WebSocket Error:', err);
    };
  } catch (err) {
    console.error('Connection failed:', err);
    setTimeout(connectWebSocket, 3000);
  }
}

function startScanner() {
  if (typeof ZXing === 'undefined') {
    lastBarcodeEl.textContent = 'Loading ZXing scanner engine...';
    setTimeout(startScanner, 500);
    return;
  }

  codeReader = new ZXing.BrowserMultiFormatReader();

  codeReader.listVideoInputDevices()
    .then((videoInputDevices) => {
      if (videoInputDevices.length === 0) {
        lastBarcodeEl.textContent = 'No camera device found';
        return;
      }

      // Prefer back/environment camera
      let selectedDeviceId = videoInputDevices[0].deviceId;
      const backCamera = videoInputDevices.find(device =>
        device.label.toLowerCase().includes('back') ||
        device.label.toLowerCase().includes('environment')
      );
      if (backCamera) {
        selectedDeviceId = backCamera.deviceId;
      }

      codeReader.decodeFromVideoDevice(selectedDeviceId, 'video', (result, err) => {
        if (result) {
          const barcode = result.getText();
          const now = Date.now();

          // Debounce same code within 1.5 seconds
          if (barcode !== lastCode || now - lastScannedTime > 1500) {
            lastCode = barcode;
            lastScannedTime = now;
            handleBarcodeScanned(barcode);
          }
        }
      });
    })
    .catch((err) => {
      console.error('Camera initialization error:', err);
      lastBarcodeEl.textContent = 'Camera permission required';
    });
}

function handleBarcodeScanned(barcode) {
  lastBarcodeEl.textContent = `Scanned: ${barcode}`;

  // Audio feedback (beep)
  playBeep();

  // Vibrate phone if supported
  if (navigator.vibrate) {
    navigator.vibrate(100);
  }

  // Send via WebSocket to Bridge/POS
  if (ws && ws.readyState === WebSocket.OPEN) {
    const payload = {
      type: 'BARCODE_SCANNED',
      payload: {
        barcode: barcode,
        source: 'phone'
      }
    };
    ws.send(JSON.stringify(payload));
  }
}

function playBeep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200, ctx.currentTime);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.1);
  } catch (e) {
    // Audio context not allowed until user interaction
  }
}

// Initialize
connectWebSocket();
startScanner();
