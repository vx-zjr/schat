# schat mobile

Expo React Native user client for schat. This is a separate native app, not a build target for the Vite web clients.

## Scope

- Memory-only access and refresh tokens in `SchatMobileApiClient`.
- User login, conversation list, message load/send, attachment upload, signed attachment open, voice token request, and local logout.
- Socket.IO foreground events through `SchatMobileWsClient`.
- Native push registration for APNs on iOS and FCM on Android.
- Screen capture prevention through `expo-screen-capture`.

## Local Run

From the repository root:

```powershell
npm.cmd run frontend:dev:mobile
```

Or from this package:

```powershell
npm.cmd run start
```

Use Expo Go first. Set `EXPO_PUBLIC_API_URL` when testing against a non-default API host:

```powershell
$env:EXPO_PUBLIC_API_URL="http://192.168.1.10:3000"
npm.cmd run start
```

## Verification

```powershell
npm.cmd run test:api
npm.cmd run typecheck
```

The automated tests cover in-memory token handling, refresh-on-401 retry behavior, and APNs/FCM registration payloads. Real push delivery still requires Apple/Firebase credentials, a physical or configured emulator device, and production backend notification settings.

## Release Notes

- Expo/EAS settings live in `app.json` and `eas.json`.
- Do not add AsyncStorage, SecureStore, SQLite, or another local message/token persistence layer unless the project storage policy changes in `TECH_STACK.md`.
- Use platform QA for screenshot behavior: Android should block screenshots through the platform path exposed by Expo; iOS behavior is best-effort and should be tested on device.
