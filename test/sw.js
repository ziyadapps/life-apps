self.SHELL_APP = "test";
self.SHELL_VERSION = "5"; // bump this when any file below changes
self.SHELL_FILES = [
  "./",
  "./app.js",
  "./manifest.json",
  "./icon-180.png",
  "./icon-192.png",
  "../shared/ui.css",
  "../shared/hub.js",
  "../shared/kit.js",
];
importScripts("../shared/sw-core.js");
