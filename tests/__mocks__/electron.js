const listeners = {};
const ipcMain = {
  _handlers: new Map(),
  handle(channel, fn) { this._handlers.set(channel, fn); },
  removeHandler(channel) { this._handlers.delete(channel); },
  // helper for tests
  async invoke(channel, payload) {
    const h = this._handlers.get(channel);
    if (!h) throw new Error('no handler: '+channel);
    return h({ sender: {} }, payload);
  }
};

const ipcRenderer = {
  _events: new Map(),
  invoke: jest.fn(async () => ({})),
  on(event, cb){ const arr=this._events.get(event)||[]; arr.push(cb); this._events.set(event, arr); },
  removeListener(event, cb){ const arr=this._events.get(event)||[]; this._events.set(event, arr.filter(x=>x!==cb)); },
  _emit(event, payload){ (this._events.get(event)||[]).forEach(cb=>cb({}, payload)); }
};

const contextBridge = {
  _exposed: {},
  exposeInMainWorld(key, api){ this._exposed[key]=api; }
};

const BrowserWindow = {
  getAllWindows(){ return [{ webContents: { send: jest.fn() } }]; }
};

// Mock für die Haupt-App
const app = {
  isPackaged: false,
  getPath: jest.fn(() => '/tmp'),
  on: jest.fn(),
  whenReady: jest.fn(() => Promise.resolve())
};

// Mock für dialog
const dialog = {
  showOpenDialog: jest.fn(() => Promise.resolve({ canceled: false, filePaths: [] })),
  showSaveDialog: jest.fn(() => Promise.resolve({ canceled: false, filePath: '' }))
};

// Mock für shell
const shell = {
  openExternal: jest.fn()
};

module.exports = { 
  ipcMain, 
  ipcRenderer, 
  contextBridge, 
  BrowserWindow, 
  app, 
  dialog, 
  shell 
};
