import { defineConfig } from "wxt";

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ["@wxt-dev/module-react"],
  webExt: {
    binaries: {
      vivaldi: "/Applications/Vivaldi.app/Contents/MacOS/Vivaldi",
    },
  },
});
