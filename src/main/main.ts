import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'node:path';

const createMainWindow = (): BrowserWindow => {
  const window = new BrowserWindow({
    width: 1100,
    height: 720,
    minWidth: 720,
    minHeight: 480,
    title: 'Multi-AI',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, '../preload/preload.js'),
    },
  });

  void window.loadFile(path.join(__dirname, '../../dist-renderer/index.html'));
  return window;
};

app.whenReady().then(() => {
  ipcMain.handle('app:ping', () => 'pong');
  createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
