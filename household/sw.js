self.SHELL_APP = "household";
self.SHELL_VERSION = "1"; // bump this when any file below changes
self.SHELL_FILES = [
  "./",
  "./household.css",
  "./app.js",
  "./manifest.json",
  "./icon-180.png",
  "./icon-192.png",
  "../shared/ui.css",
  "../shared/hub.js",
  "../shared/kit.js",
];
importScripts("../shared/sw-core.js");
