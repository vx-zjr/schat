export async function preventScreenCapture() {
  const ScreenCapture = await import('expo-screen-capture');
  await ScreenCapture.preventScreenCaptureAsync();
}
