iOS Motion Permission (NSMotionUsageDescription)

Add the following key to your iOS app's Info.plist to explain why the app needs motion access.

This is required for native Capacitor builds (iOS) so the OS will display a permission prompt when motion sensors are accessed.

Example Info.plist entry:

<key>NSMotionUsageDescription</key>
<string>SOCIO uses motion detection for shake-to-scan interactions.</string>

Notes:
- The iOS native project folder (usually `ios/` created by Capacitor) is not committed to this repo in many workflows. Open Xcode, select your app target, then edit the Info.plist and add the key above.
- If you're using automated CI to build the iOS app, ensure the Info.plist in the build artifact contains this key.
- For Capacitor WKWebView (native) the native permission will be enforced by iOS; for Safari/PWA you'll need to call `DeviceMotionEvent.requestPermission()` from a user gesture before reading `devicemotion` events.

Testing checklist:
- Build and run the Capacitor iOS app on a device and verify the system permission prompt appears when the scanner or motion is accessed.
- If the prompt doesn't show, ensure the Info.plist contains `NSMotionUsageDescription` and rebuild the app.
