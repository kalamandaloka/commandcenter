import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets'
import { Server } from 'socket.io'

@WebSocketGateway({
  cors: { origin: true, credentials: true }
})
export class RealtimeGateway {
  @WebSocketServer()
  server!: Server

  emit(eventName: string, payload: unknown) {
    if (!this.server) return
    this.server.emit(eventName, payload)
  }
}

