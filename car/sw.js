self.SHELL_APP = "car";
self.SHELL_VERSION = "3"; // bump this when any file below changes
self.SHELL_FILES = [
  "./",
  "./car.css",
  "./calc.js",
  "./app.js",
  "./manifest.json",
  "./icon-180.png",
  "./icon-192.png",
  "../shared/ui.css",
  "../shared/hub.js",
  "../shared/kit.js",
  "../budget/calc.js",
];
importScripts("../shared/sw-core.js");
