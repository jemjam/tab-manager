import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "wxt";

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ["@wxt-dev/module-react"],
  vite: () => ({
    plugins: [tailwindcss()],
  }),
  manifest: ({ browser }) => ({
    action: {},
    permissions: ["tabs", "contextMenus", "activeTab", "scripting", "sidePanel"],
    ...(browser === "firefox" && {
      sidebar_action: { default_panel: "sidepanel.html" },
    }),
    browser_specific_settings: {
      gecko: {
        id: "tab-man@browser-extension",
      },
    },
  }),
  webExt: {
    binaries: {
      vivaldi: "/Applications/Vivaldi.app/Contents/MacOS/Vivaldi",
    },
    startUrls: [],
    chromiumProfile: ".dev-profile",
    keepProfileChanges: true,
  },
});
