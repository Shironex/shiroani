{
  "conditions": [
    ["OS=='win'", {
      "targets": [
        {
          "target_name": "desktop_overlay",
          "sources": ["src/native/desktop_overlay.cpp"],
          "include_dirs": ["<!@(node -p \"require('node-addon-api').include\")"],
          "defines": [
            "NAPI_VERSION=8",
            "NAPI_DISABLE_CPP_EXCEPTIONS",
            "UNICODE",
            "_UNICODE",
            "_WIN32_WINNT=0x0A00"
          ],
          "msvs_settings": {
            "VCCLCompilerTool": {
              "ExceptionHandling": 1
            }
          },
          "libraries": [
            "user32.lib",
            "shell32.lib",
            "gdiplus.lib",
            "gdi32.lib",
            "ole32.lib",
            "comctl32.lib"
          ]
        },
        {
          "target_name": "window_sensor",
          "sources": ["src/native/window_sensor_win.cpp"],
          "include_dirs": ["<!@(node -p \"require('node-addon-api').include\")"],
          "defines": [
            "NAPI_VERSION=8",
            "NAPI_DISABLE_CPP_EXCEPTIONS",
            "UNICODE",
            "_UNICODE",
            "_WIN32_WINNT=0x0A00"
          ],
          "msvs_settings": {
            "VCCLCompilerTool": {
              "ExceptionHandling": 1
            }
          },
          "libraries": ["user32.lib", "dwmapi.lib"]
        }
      ]
    }],
    ["OS=='mac'", {
      "targets": [
        {
          "target_name": "window_sensor",
          "sources": ["src/native/window_sensor_mac.mm"],
          "include_dirs": ["<!@(node -p \"require('node-addon-api').include\")"],
          "defines": ["NAPI_VERSION=8", "NAPI_DISABLE_CPP_EXCEPTIONS"],
          "xcode_settings": {
            "CLANG_ENABLE_OBJC_ARC": "YES",
            "GCC_ENABLE_CPP_EXCEPTIONS": "NO",
            "MACOSX_DEPLOYMENT_TARGET": "11.0"
          },
          "link_settings": {
            "libraries": ["-framework CoreGraphics", "-framework CoreFoundation"]
          }
        }
      ]
    }],
    ["OS!='win' and OS!='mac'", {
      "targets": [
        {
          "target_name": "desktop_overlay",
          "type": "none"
        }
      ]
    }]
  ]
}
