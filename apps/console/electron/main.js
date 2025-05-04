import { app, BrowserWindow } from 'electron'
import path from 'node:path'
import server from './server.js'

const PORT = Number.parseInt(process.env.PORT || "3000");

server.listen(PORT, () => {
  fetch('http://localhost:3000').then(() => {
    BrowserWindow.getAllWindows()[0].loadURL(`http://localhost:${PORT}`);
  })
  console.log(`Server is running on http://localhost:${PORT}`);
});

const createWindow = () => {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(app.getAppPath(), 'preload.js')
    }
  })
  win.loadFile(path.join(app.getAppPath(), 'index.html'))
}

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
