const { app } = require('electron');
const { autoUpdater } = require('electron-updater');

app.whenReady().then(async () => {
  autoUpdater.logger = console;
  autoUpdater.forceDevUpdateConfig = true;
  autoUpdater.autoDownload = false;
  autoUpdater.setFeedURL({
    provider: 'github',
    owner: 'subhan07idrees-tech',
    repo: 'zonix-dispatcher'
  });
  autoUpdater.currentVersion = '1.9.4';
  
  autoUpdater.on('checking-for-update', () => console.log('[TEST] Checking for update...'));
  autoUpdater.on('update-available', (info) => {
    console.log('[TEST] UPDATE AVAILABLE:', info.version, info.releaseDate);
    app.quit();
  });
  autoUpdater.on('update-not-available', (info) => {
    console.log('[TEST] UPDATE NOT AVAILABLE:', info.version);
    app.quit();
  });
  autoUpdater.on('error', (err) => {
    console.error('[TEST] UPDATER ERROR:', err.message);
    app.quit();
  });

  try {
    const res = await autoUpdater.checkForUpdates();
    console.log('[TEST] CHECK COMPLETED:', res?.updateInfo?.version);
  } catch (e) {
    console.error('[TEST] CATCH ERROR:', e.message);
    app.quit();
  }
});
