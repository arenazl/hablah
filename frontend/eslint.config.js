// Gate de calidad frontend (WO F0-03, docs/03-rework/02-hoja-de-ruta.md).
// Antes de CADA push: `npx tsc --noEmit` Y `npx eslint src/ --ext .ts,.tsx` (ver README).
//
// Alcance intencionalmente chico: solo reglas de hooks de React, que es lo que este gate
// existe para atrapar (el bug de React #310 — hooks después de un return condicional —
// llegó a producción en otro proyecto del dueño por no tener esto). `eslint-plugin-react-hooks`
// v7 trae presets "recommended"/"recommended-latest" que agregan ~14 reglas nuevas del React
// Compiler (purity, immutability, set-state-in-render, etc.) — a propósito NO se usan: son
// harina de otro costal, candidatas a su propio WO, no lo que F0-03 pidió. Tampoco se prende
// el "recommended" de JS/TS-ESLint: este repo nunca corrió ESLint y esas reglas (no-unused-vars,
// no-explicit-any, etc.) generarían ruido ajeno a hooks. El parser de typescript-eslint se usa
// solo para que ESLint entienda sintaxis TS/JSX — no se activa su ruleset. El plugin
// `@typescript-eslint` se registra (sin reglas propias) solo para que los
// `eslint-disable-next-line @typescript-eslint/no-explicit-any` que ya existían en el código
// (de un scaffold previo) apunten a una regla conocida en vez de tirar "rule not found".
import tseslint from 'typescript-eslint'
import reactHooks from 'eslint-plugin-react-hooks'

export default tseslint.config(
  {
    ignores: ['dist/**', 'node_modules/**', 'src/pages/_attic/**'],
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      parser: tseslint.parser,
      ecmaVersion: 2020,
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      'react-hooks': reactHooks,
      '@typescript-eslint': tseslint.plugin,
    },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
)
