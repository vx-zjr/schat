# WebSocket Contract

Socket.IO is used for realtime chat and foreground notifications.

Client to server events:

- `conversation.join` with `{ conversationId }`
- `conversation.leave` with `{ conversationId }`
- `message.send` with `{ conversationId, body, attachmentIds? }`
- `typing.update` with `{ conversationId, typing }`

Server to client events:

- `message.created`
- `message.edited`
- `message.deleted`
- `conversation.updated`
- `user.banned`
- `presence.updated`
- `notification.created`

Authentication:

- Clients pass the JWT access token in `handshake.auth.token` as `Bearer <token>`.
- `conversation.join`, `conversation.leave`, `message.send`, and `typing.update` require a valid socket identity.

Room boundary:

- `conversation.join` and `typing.update` check conversation membership server-side.
- Non-members receive `Not a conversation member` and are not joined to the Socket.IO room.
- `message.send` also checks bans and conversation membership before persisting and broadcasting.
