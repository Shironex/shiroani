// Window sensor (Windows): enumerate visible top-level window rects so the
// mascot engine can climb them. Uses DWMWA_EXTENDED_FRAME_BOUNDS so the rects
// match what the user sees (GetWindowRect includes invisible resize borders
// on Win10/11), and skips cloaked UWP shells, tool windows, and minimized
// windows. Skips our own process — the main app window is re-added JS-side.

#include <napi.h>
#include <windows.h>
#include <dwmapi.h>

#include <vector>

#pragma comment(lib, "dwmapi.lib")

namespace {

struct SensorRect {
  uint32_t id;
  long x;
  long y;
  long width;
  long height;
};

BOOL CALLBACK EnumWindowsProc(HWND hwnd, LPARAM lparam) {
  auto* rects = reinterpret_cast<std::vector<SensorRect>*>(lparam);

  if (!IsWindowVisible(hwnd) || IsIconic(hwnd)) return TRUE;

  // Skip our own process (mascot overlay, context menu, main window).
  DWORD pid = 0;
  GetWindowThreadProcessId(hwnd, &pid);
  if (pid == GetCurrentProcessId()) return TRUE;

  // Skip tool windows / non-activatable overlays.
  const LONG_PTR exStyle = GetWindowLongPtrW(hwnd, GWL_EXSTYLE);
  if (exStyle & (WS_EX_TOOLWINDOW | WS_EX_NOACTIVATE)) return TRUE;

  // Skip cloaked windows (suspended UWP apps, other virtual desktops).
  DWORD cloaked = 0;
  if (SUCCEEDED(DwmGetWindowAttribute(hwnd, DWMWA_CLOAKED, &cloaked,
                                      sizeof(cloaked))) &&
      cloaked != 0) {
    return TRUE;
  }

  RECT rect{};
  if (FAILED(DwmGetWindowAttribute(hwnd, DWMWA_EXTENDED_FRAME_BOUNDS, &rect,
                                   sizeof(rect)))) {
    if (!GetWindowRect(hwnd, &rect)) return TRUE;
  }

  const long width = rect.right - rect.left;
  const long height = rect.bottom - rect.top;
  if (width <= 0 || height <= 0) return TRUE;

  rects->push_back(SensorRect{
      static_cast<uint32_t>(reinterpret_cast<uintptr_t>(hwnd)),
      rect.left, rect.top, width, height});
  return TRUE;
}

Napi::Value GetWindows(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  std::vector<SensorRect> rects;
  EnumWindows(EnumWindowsProc, reinterpret_cast<LPARAM>(&rects));

  Napi::Array result = Napi::Array::New(env, rects.size());
  for (size_t i = 0; i < rects.size(); i++) {
    Napi::Object obj = Napi::Object::New(env);
    obj.Set("id", Napi::Number::New(env, static_cast<double>(rects[i].id)));
    obj.Set("x", Napi::Number::New(env, static_cast<double>(rects[i].x)));
    obj.Set("y", Napi::Number::New(env, static_cast<double>(rects[i].y)));
    obj.Set("width", Napi::Number::New(env, static_cast<double>(rects[i].width)));
    obj.Set("height", Napi::Number::New(env, static_cast<double>(rects[i].height)));
    result.Set(static_cast<uint32_t>(i), obj);
  }
  return result;
}

Napi::Object Init(Napi::Env env, Napi::Object exports) {
  exports.Set("getWindows", Napi::Function::New(env, GetWindows));
  return exports;
}

}  // namespace

NODE_API_MODULE(window_sensor, Init)
