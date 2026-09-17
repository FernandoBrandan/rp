// eslint.config.mjs
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';

export default tseslint.config(
  // 1. Ignorados globales
  {
    ignores: [
      'eslint.config.mjs',
      'dist/**',
      'node_modules/**',
      'coverage/**',
    ],
  },

  // 2. Configuraciones base
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,

  // 3. Entorno (Node + Jest)
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
      sourceType: 'commonjs',
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },

  // 4. Reglas personalizadas
  {
    rules: {
      // ---------------------------------------------------------------
      // ✅ REGLAS QUE MANTENEMOS ACTIVAS (aportan valor real)
      // ---------------------------------------------------------------

      // Evita promesas sin manejar (bug clásico en NestJS)
      '@typescript-eslint/no-floating-promises': 'error',

      // Evita usar promesas en contextos donde no toca (if, &&, etc.)
      '@typescript-eslint/no-misused-promises': 'error',

      // Obliga a usar `cause` al re-lanzar errores (mejora el debugging)
      'preserve-caught-error': 'error',

      // Detecta variables, imports y parámetros sin usar
      // (con opción de ignorar los que empiezan con `_`)
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          args: 'all',
          argsIgnorePattern: '^_',
          caughtErrors: 'all',
          caughtErrorsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          ignoreRestSiblings: true,
        },
      ],

      // Evita usar `async` sin `await` (código más limpio)
      '@typescript-eslint/require-await': 'error',

      // Detecta métodos pasados sin bind (típico bug en callbacks)
      '@typescript-eslint/unbound-method': 'error',

      // Preferir `unknown` sobre `any` cuando no se sabe el tipo
      '@typescript-eslint/no-explicit-any': 'warn',

      // ---------------------------------------------------------------
      // ⚠️ REGLAS RELAJADAS A WARN (útiles pero ruidosas en código legado)
      // ---------------------------------------------------------------

      // Detectan uso de `any` en posiciones peligrosas.
      // Las dejamos como warning para que sirvan de guía sin bloquear.
      '@typescript-eslint/no-unsafe-assignment': 'warn',
      '@typescript-eslint/no-unsafe-call': 'warn',
      '@typescript-eslint/no-unsafe-member-access': 'warn',
      '@typescript-eslint/no-unsafe-return': 'warn',
      '@typescript-eslint/no-unsafe-argument': 'warn',

      // ---------------------------------------------------------------
      // 🚫 REGLAS APAGADAS (ruido sin valor real en este contexto)
      // ---------------------------------------------------------------

      // Esta regla es muy agresiva y entra en conflicto con patrones
      // comunes de Jest (expect(repo.save).toHaveBeenCalled())
      // y con el estilo de NestJS. La apagamos.
      '@typescript-eslint/unbound-method': 'off',

      // `require-await` es útil, pero en providers que implementan
      // interfaces con métodos async (aunque sean síncronos) da falsos positivos.
      '@typescript-eslint/require-await': 'off',
    },
  },
);