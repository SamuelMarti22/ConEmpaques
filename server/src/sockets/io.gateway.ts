import { Server } from 'socket.io';

let ioServer: Server | null = null;

export const setSocketServer = (io: Server) => {
  ioServer = io;
};

export const getSocketServer = (): Server | null => ioServer;
