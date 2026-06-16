# Vision

schat is a centralized chat system for one owner and many users. The server is the only source of truth. The owner can manage conversations, records, permissions, bans, and audit history. Users only chat.

## Invariants

- The backend is API-first and contains no UI.
- Backend and frontend are separate. This repository phase implements backend and deployment only.
- Messages persist only on the server.
- User clients are treated as memory-only consumers. No export or download workflow is provided.
- Every privileged action is checked on the server.
- Admin actions that change records, permissions, or bans are appended to the audit log.
- Keep implementation practical: enforce real business boundaries, avoid speculative defensive programming.

