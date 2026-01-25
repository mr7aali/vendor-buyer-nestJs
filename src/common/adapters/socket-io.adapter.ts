import { IoAdapter } from "@nestjs/platform-socket.io";
import { INestApplication } from "@nestjs/common";

export class SocketIoAdapter extends IoAdapter {
  constructor(app: INestApplication) {
    super(app);
  }

  createIOServer(port: number, options?: any) {
    return super.createIOServer(port, {
      cors: {
        origin: true,
        credentials: true,
      },
      ...options,
    });
  }
}
