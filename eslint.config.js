import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
export default tseslint.config(
  { ignores: ["dist/**", "node_modules/**", "coverage/**"] },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  { files: ["**/*.{ts,tsx}"] },
  { files: ["api/_lib/ssrf.ts"], rules: { "no-control-regex": "off" } },
  { files: ["src/lib/traceroute.ts", "src/lib/validate.ts"], rules: { "no-useless-escape": "off" } },
  { files: ["public/sw.js"], languageOptions: { globals: { self: "readonly", caches: "readonly", URL: "readonly", fetch: "readonly" } } },
);
