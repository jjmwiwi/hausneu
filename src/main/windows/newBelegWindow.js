const { BrowserWindow } = require('electron');
const path = require('path');

function createNewBelegWindow(parent) {
  const win = new BrowserWindow({
    parent,
    modal: true,
    width: 720,
    height: 640,
    resizable: false,
    minimizable: false,
    maximizable: false,
    title: "Neuer Beleg",
    webPreferences: {
      preload: path.join(__dirname, "..", "..", "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });
  
  // DEV/PROD: Wenn VITE_DEV_SERVER_URL existiert, darauf navigieren + Route /popup/neuer-beleg
  // sonst auf file://.../index.html#/popup/neuer-beleg
  const isDev = !!process.env.VITE_DEV_SERVER_URL;
  if (isDev) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL + "#/popup/neuer-beleg");
  } else {
    win.loadURL(`file://${path.join(__dirname, "..", "..", "..", "index.html")}#/popup/neuer-beleg`);
  }
  
  return win;
}

module.exports = { createNewBelegWindow };
