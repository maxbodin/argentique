import eslintPluginAstro from "eslint-plugin-astro";
import tseslint from "typescript-eslint";

const eslintConfig = [
  ...tseslint.configs.recommended,
  ...eslintPluginAstro.configs.recommended,
  {
    ignores: [
      "node_modules/**",
      "dist/**",
      ".astro/**",
      ".vercel/**",
    ],
  },
];

export default eslintConfig;
