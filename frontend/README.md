# Habláh — frontend

App React + Vite + TypeScript. Ver `docs/03-rework/02-hoja-de-ruta.md` para el mapa de trabajo
del rework en curso; este README solo cubre lo operativo de esta carpeta.

## Checklist obligatorio antes de cada `git push`

Regla dura del dueño: **ningún push de frontend sin correr los dos comandos siguientes,
en este orden**. `tsc` verifica tipos pero NO detecta violaciones de reglas de hooks de React
(hooks llamados después de un `return` condicional, hooks en funciones que no son componentes,
etc.) — esos son errores de runtime que solo ESLint con `eslint-plugin-react-hooks` atrapa. Ya
pasó que un error de este tipo (React #310) llegó a producción en otro proyecto por saltear este
paso.

```bash
npx tsc --noEmit
npx eslint src/ --ext .ts,.tsx
```

O con los scripts de `package.json`:

```bash
npm run typecheck
npm run lint
```

- `tsc --noEmit` tiene que salir sin output (limpio).
- `eslint` tiene que salir con **0 errors**. Los `warning` (hoy son todos `react-hooks/exhaustive-deps`,
  dependencias de un `useEffect`/`useCallback` que el linter sugiere agregar) no bloquean el push,
  pero conviene revisarlos antes de tocar el archivo donde aparecen — arreglarlos a ciegas puede
  cambiar el comportamiento de un efecto (loops, refetch de más, etc.).

## Config de ESLint

`eslint.config.js` (flat config, ESLint 9) está intencionalmente acotado a reglas de hooks de
React:

- `react-hooks/rules-of-hooks`: `error` — un hook llamado fuera de orden/condicionalmente rompe
  la app en runtime, no en build. Esto es lo que este gate existe para atrapar.
- `react-hooks/exhaustive-deps`: `warn` — sugerencia, no bloqueante.

No se activaron los presets `recommended`/`recommended-latest` del plugin (traen ~14 reglas
nuevas del React Compiler: `purity`, `immutability`, `set-state-in-render`, etc.) ni el
`recommended` de `@eslint/js`/`typescript-eslint` (el repo nunca corrió ESLint antes; esas reglas
generarían ruido — `no-unused-vars`, `no-explicit-any` — ajeno al objetivo de este gate). Si en el
futuro se decide subir el nivel, es un WO aparte, no un cambio silencioso de este archivo.

Alcance: `src/**/*.{ts,tsx}`. Ignorado: `src/pages/_attic/**` (paneles retirados, no se mantienen),
`dist/**`, `node_modules/**`.

## Otros comandos

```bash
npm run dev        # servidor de desarrollo (puerto 5200)
npm run build       # tsc -b + vite build + prerender (Puppeteer)
npm run preview     # sirve el build de producción localmente
npm run smoke        # smoke-test.mjs
```
