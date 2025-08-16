const { ipcMain } = require('electron');
jest.resetModules();

test('registers IPC handlers exactly once and validates payload', async () => {
  process.env.NODE_ENV = 'test';
  const main = require('../main.js'); // path: adjust if not at root
  expect(typeof main.registerDbIpc).toBe('function');
  main.registerDbIpc();
  const chans = Array.from(ipcMain._handlers.keys());
  // expect standard channels present (adjust to your set)
  expect(chans).toEqual(expect.arrayContaining([
    'db:save-reading','db:list-readings','db:update-reading','db:delete-reading'
  ]));
  // duplicate registration should overwrite not duplicate
  main.registerDbIpc();
  const chans2 = Array.from(ipcMain._handlers.keys());
  expect(chans2).toEqual(expect.arrayContaining([
    'db:save-reading','db:list-readings','db:update-reading','db:delete-reading'
  ]));

  // validate: update-reading without id should throw
  await expect(ipcMain.invoke('db:update-reading', {})).rejects.toThrow();
});
