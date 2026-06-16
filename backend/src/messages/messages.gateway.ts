import { UseGuards } from '@nestjs/common';
import { ConnectedSocket, MessageBody, OnGatewayConnection, SubscribeMessage, WebSocketGateway, WebSocketServer, WsException } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { WsJwtGuard } from '../auth/ws-jwt.guard';
import { ConversationsService } from '../conversations/conversations.service';
import { SendMessageDto } from './dto';
import { MessagesService } from './messages.service';

@WebSocketGateway({ cors: true })
export class MessagesGateway implements OnGatewayConnection {
  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly messages: MessagesService,
    private readonly conversations: ConversationsService
  ) {}

  handleConnection(client: Socket) {
    client.emit('presence.updated', { socketId: client.id, online: true });
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('conversation.join')
  async joinConversation(@ConnectedSocket() client: Socket, @MessageBody() body: { conversationId: string }) {
    await this.assertRoomMember(client, body.conversationId);
    void client.join(body.conversationId);
    return { status: 'ok' };
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('conversation.leave')
  leaveConversation(@ConnectedSocket() client: Socket, @MessageBody() body: { conversationId: string }) {
    void client.leave(body.conversationId);
    return { status: 'ok' };
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('message.send')
  async sendMessage(@ConnectedSocket() client: Socket, @MessageBody() body: SendMessageDto) {
    const user = client.data.user;
    const message = await this.messages.sendTextMessage(user.id, body);
    this.server.to(body.conversationId).emit('message.created', message);
    return message;
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('typing.update')
  async typing(@ConnectedSocket() client: Socket, @MessageBody() body: { conversationId: string; typing: boolean }) {
    await this.assertRoomMember(client, body.conversationId);
    client.to(body.conversationId).emit('presence.updated', { socketId: client.id, typing: body.typing });
    return { status: 'ok' };
  }

  private async assertRoomMember(client: Socket, conversationId: string) {
    const user = client.data.user;
    if (!(await this.conversations.isMember(conversationId, user.id))) {
      throw new WsException('Not a conversation member');
    }
  }
}
