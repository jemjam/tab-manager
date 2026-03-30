import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "wxt";

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ["@wxt-dev/module-react"],
  vite: () => ({
    plugins: [tailwindcss()],
  }),
  manifest: {
    action: {},
    permissions: ["tabs", "contextMenus", "activeTab", "scripting"],
  },
  webExt: {
    binaries: {
      vivaldi: "/Applications/Vivaldi.app/Contents/MacOS/Vivaldi",
    },
    startUrls: [],
    chromiumProfile: ".dev-profile",
    keepProfileChanges: true,
  },
});
