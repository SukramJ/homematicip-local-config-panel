import resolve from "@rollup/plugin-node-resolve";
import typescript from "@rollup/plugin-typescript";
import json from "@rollup/plugin-json";
import terser from "@rollup/plugin-terser";

export default {
  input: "src/homematic-config.ts",
  output: {
    file: "dist/homematic-config.js",
    format: "es",
    sourcemap: false,
  },
  plugins: [
    resolve(),
    json(),
    typescript(),
    terser({
      format: { comments: false },
    }),
  ],
};
