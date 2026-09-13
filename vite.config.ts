import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // GitHub Pages用: リポジトリ名に合わせて変更してください
  // 例: https://username.github.io/conlang-dev/ なら "/conlang-dev/"
  base: "./",
});
