import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Standalone Node.js debug scripts — not part of the Next.js app bundle.
    "scratch/**",
    // Static assets & service worker — not part of the app source.
    "public/**",
  ]),
  {
    rules: {
      /*
       * next/image is intentionally not used in this project.
       *
       * Every image rendered here is dynamic content, not a static asset:
       *   - base64 data URLs produced by canvas.toDataURL() (school logos,
       *     avatars, digital signatures),
       *   - Google Drive links rewritten to lh3.googleusercontent.com,
       *   - an external QR generator (api.qrserver.com),
       *   - arbitrary URLs typed in by admins.
       *
       * next/image rejects any host missing from `images.remotePatterns` with
       * a 400, and cannot optimise data URLs at all, so converting these would
       * break images rather than speed them up. It would also bill every
       * user-uploaded photo against the Vercel image-optimisation quota.
       */
      '@next/next/no-img-element': 'off',
    },
  },
]);

export default eslintConfig;
