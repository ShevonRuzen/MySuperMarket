import http from 'http';
import fs from 'fs';
import path from 'path';
import { WebSocketServer, WebSocket } from 'ws';

const WS_PORT = parseInt(process.env.BRIDGE_WS_PORT || '17777', 10);
const HTTP_PORT = parseInt(process.env.BRIDGE_HTTP_PORT || '5555', 10);

// --- 1. HTTP Server for Mobile Scanner PWA (Port 5555) ---
const scannerStaticDir = path.resolve(__dirname, '../../scanner');

const httpServer = http.createServer((req, res) => {
  let reqPath = req.url?.split('?')[0] || '/';
  if (reqPath === '/' || reqPath === '') {
    reqPath = '/index.html';
  }

  const filePath = path.join(scannerStaticDir, reqPath);
  const ext = path.extname(filePath).toLowerCase();

  const mimeTypes: Record<string, string> = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
  };

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
      return;
    }
    const contentType = mimeTypes[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content);
  });
});

httpServer.listen(HTTP_PORT, '0.0.0.0', () => {
  console.log(`📱 Mobile Scanner PWA running at http://localhost:${HTTP_PORT}`);
});

// --- 2. Weighing Scale ASCII Stream Parser ---
/**
 * Common supermarket digital scale protocols:
 * CAS, Toledo, Avery Berkel format:
 * "ST,GS,+  1.250kg\r\n" -> 1.250 kg (Stable)
 * "US,GS,+  1.250kg\r\n" -> 1.250 kg (Unstable/Settling)
 */
function parseScaleAscii(raw: string): { weight: number; unit: string; stable: boolean } | null {
  try {
    const isStable = raw.includes('ST') || !raw.includes('US');
    const match = raw.match(/([0-9]+\.[0-9]+)/);
    if (match) {
      const weight = parseFloat(match[1]);
      return { weight, unit: 'kg', stable: isStable };
    }
  } catch (e) {}
  return null;
}

// --- 3. WebSocket Server for Hardware & Scanners (Port 17777) ---
const wss = new WebSocketServer({ port: WS_PORT });

console.log(`🔌 Hardware Bridge WebSocket running at ws://localhost:${WS_PORT}`);

wss.on('connection', (ws: WebSocket, req) => {
  const remoteIp = req.socket.remoteAddress;
  console.log(`[Bridge] Client connected from ${remoteIp}`);

  ws.send(
    JSON.stringify({
      type: 'BRIDGE_STATUS',
      payload: {
        printer: 'ready',
        scale: 'ready',
        drawer: 'ready',
        version: '1.2.0',
      },
    })
  );

  ws.on('message', (data: string) => {
    try {
      const message = JSON.parse(data.toString());

      switch (message.type) {
        case 'PRINT_RECEIPT':
          console.log('\n================ ESC/POS THERMAL RECEIPT ================');
          if (message.payload?.lines) {
            message.payload.lines.forEach((line: string) => console.log(line));
          }
          console.log('=========================================================\n');
          ws.send(JSON.stringify({ type: 'PRINT_OK' }));
          break;

        case 'OPEN_DRAWER':
          console.log('[Bridge Hardware] 🔔 ESC/POS Pulse Kickout Drawer (Pin 2 / 24V)!');
          ws.send(JSON.stringify({ type: 'DRAWER_KICK_OK' }));
          break;

        case 'GET_SCALE_WEIGHT':
          // Simulate or read from serialport
          const sampleRaw = `ST,GS,+  ${(Math.random() * 2 + 0.5).toFixed(3)}kg\r\n`;
          const parsed = parseScaleAscii(sampleRaw);
          if (parsed) {
            ws.send(
              JSON.stringify({
                type: 'SCALE_WEIGHT',
                payload: parsed,
              })
            );
          }
          break;

        case 'BARCODE_SCANNED':
          // Relay phone camera scanner scan to all active POS terminals
          wss.clients.forEach((client) => {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify(message));
            }
          });
          break;

        default:
          break;
      }
    } catch (err) {
      console.error('[Bridge] Error parsing incoming message:', err);
    }
  });

  ws.on('close', () => {
    console.log('[Bridge] Client disconnected');
  });
});
