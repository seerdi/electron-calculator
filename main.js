const { app, BrowserWindow, ipcMain, clipboard } = require('electron');
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

let httpServer = null;
let activeServerInfo = { ip: 'localhost', port: 3000, url: 'http://localhost:3000' };

// MIME types for static assets
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png'
};

// Retrieve local LAN IPv4 address
function getLanIpAddress() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      const isIPv4 = iface.family === 'IPv4' || iface.family === 4;
      if (isIPv4 && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

// Start lightweight embedded HTTP server
function startHttpServer(port = 3000) {
  const server = http.createServer((req, res) => {
    let reqPath = req.url.split('?')[0];
    if (reqPath === '/' || reqPath === '') {
      reqPath = '/index.html';
    }

    const safePath = path.normalize(reqPath).replace(/^(\.\.[\/\\])+/, '');
    const filePath = path.join(__dirname, 'src', safePath);

    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404 Not Found');
        return;
      }

      const ext = path.extname(filePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';
      res.writeHead(200, {
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*'
      });
      res.end(data);
    });
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`Port ${port} in use, trying ${port + 1}...`);
      startHttpServer(port + 1);
    } else {
      console.error('HTTP Server error:', err);
    }
  });

  server.listen(port, '0.0.0.0', () => {
    const lanIp = getLanIpAddress();
    activeServerInfo = {
      ip: lanIp,
      port: port,
      url: `http://${lanIp}:${port}`
    };
    console.log(`[LAN Server] Calculator available at: ${activeServerInfo.url}`);
  });

  httpServer = server;
}

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 390,
    height: 670,
    minWidth: 340,
    minHeight: 520,
    maxWidth: 640,
    maxHeight: 920,
    title: 'Calculator (Network Enabled)',
    autoHideMenuBar: true,
    backgroundColor: '#18181c',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'src', 'index.html'));
}

// IPC handler to copy text to clipboard
ipcMain.handle('copy-to-clipboard', (event, text) => {
  if (typeof text === 'string') {
    clipboard.writeText(text);
    return true;
  }
  return false;
});

// IPC handler to get LAN server info
ipcMain.handle('get-lan-info', () => {
  return activeServerInfo;
});

app.whenReady().then(() => {
  startHttpServer(3000);
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('will-quit', () => {
  if (httpServer) {
    httpServer.close();
  }
});
