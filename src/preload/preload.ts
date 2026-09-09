import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('multiAI', {
  ping: (): Promise<string> => ipcRenderer.invoke('app:ping'),
});
