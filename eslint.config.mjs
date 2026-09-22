import tseslint from "typescript-eslint";
import obsidianmd from "eslint-plugin-obsidianmd";

export default [
  ...obsidianmd.configs.recommended,
  {
    files: ["main.js"],
    languageOptions: { sourceType: "commonjs" },
    rules: {
      // Obsidian loads the shipped JavaScript entry point as CommonJS.
      "@typescript-eslint/no-require-imports": "off",
      "no-implicit-globals": "off",
      "obsidianmd/ui/sentence-case": ["warn", { brands: ["Obsidian", "Markdown", "Daily Notes", "Periodic Notes", "xX-"] }],
    },
  },
  {
    files: ["manifest.json"],
    languageOptions: { parser: tseslint.parser },
    rules: { "obsidianmd/validate-manifest": "error" },
  },
];
