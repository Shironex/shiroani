// Window sensor (macOS): enumerate on-screen top-level window rects so the
// mascot engine can climb them.
//
// Deliberately reads ONLY kCGWindowBounds / kCGWindowLayer / kCGWindowOwnerPID
// / kCGWindowAlpha / kCGWindowNumber. Reading kCGWindowName would trigger the
// Screen Recording permission prompt (macOS 10.15+); bounds do not.
//
// Returned coordinates are global screen points with a top-left origin —
// the same space as Electron's `screen` API on macOS.

#include <napi.h>
#import <CoreGraphics/CoreGraphics.h>
#include <unistd.h>

namespace {

Napi::Value GetWindows(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  Napi::Array result = Napi::Array::New(env);

  CFArrayRef windowList = CGWindowListCopyWindowInfo(
      kCGWindowListOptionOnScreenOnly | kCGWindowListExcludeDesktopElements,
      kCGNullWindowID);
  if (windowList == nullptr) {
    return result;
  }

  const pid_t ownPid = getpid();
  uint32_t outIndex = 0;
  const CFIndex count = CFArrayGetCount(windowList);

  for (CFIndex i = 0; i < count; i++) {
    CFDictionaryRef win =
        static_cast<CFDictionaryRef>(CFArrayGetValueAtIndex(windowList, i));
    if (win == nullptr) continue;

    // Layer 0 == normal application windows (skips menubar, dock, overlays).
    int layer = -1;
    CFNumberRef layerRef =
        static_cast<CFNumberRef>(CFDictionaryGetValue(win, kCGWindowLayer));
    if (layerRef == nullptr ||
        !CFNumberGetValue(layerRef, kCFNumberIntType, &layer) || layer != 0) {
      continue;
    }

    // Skip our own process — the mascot must not climb itself. The main app
    // window is re-added JS-side from Electron bounds.
    int pid = -1;
    CFNumberRef pidRef =
        static_cast<CFNumberRef>(CFDictionaryGetValue(win, kCGWindowOwnerPID));
    if (pidRef != nullptr) {
      CFNumberGetValue(pidRef, kCFNumberIntType, &pid);
    }
    if (pid == static_cast<int>(ownPid)) continue;

    // Skip fully transparent windows.
    double alpha = 1.0;
    CFNumberRef alphaRef =
        static_cast<CFNumberRef>(CFDictionaryGetValue(win, kCGWindowAlpha));
    if (alphaRef != nullptr) {
      CFNumberGetValue(alphaRef, kCFNumberDoubleType, &alpha);
    }
    if (alpha < 0.1) continue;

    CFDictionaryRef boundsRef =
        static_cast<CFDictionaryRef>(CFDictionaryGetValue(win, kCGWindowBounds));
    CGRect rect;
    if (boundsRef == nullptr ||
        !CGRectMakeWithDictionaryRepresentation(boundsRef, &rect)) {
      continue;
    }

    int windowId = 0;
    CFNumberRef numRef =
        static_cast<CFNumberRef>(CFDictionaryGetValue(win, kCGWindowNumber));
    if (numRef != nullptr) {
      CFNumberGetValue(numRef, kCFNumberIntType, &windowId);
    }

    Napi::Object obj = Napi::Object::New(env);
    obj.Set("id", Napi::Number::New(env, windowId));
    obj.Set("x", Napi::Number::New(env, rect.origin.x));
    obj.Set("y", Napi::Number::New(env, rect.origin.y));
    obj.Set("width", Napi::Number::New(env, rect.size.width));
    obj.Set("height", Napi::Number::New(env, rect.size.height));
    result.Set(outIndex++, obj);
  }

  CFRelease(windowList);
  return result;
}

Napi::Object Init(Napi::Env env, Napi::Object exports) {
  exports.Set("getWindows", Napi::Function::New(env, GetWindows));
  return exports;
}

}  // namespace

NODE_API_MODULE(window_sensor, Init)
