// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

// Data-layer rules (.claude/rules/data-fetching.md): screens use hooks from
// src/lib/queries/, hooks call services, and only services query Supabase.
const UI_FILES = ['src/app/**/*.{ts,tsx}', 'src/screens/**/*.{ts,tsx}', 'src/components/**/*.{ts,tsx}'];
const TANSTACK_DATA_HOOKS = ['useQuery', 'useQueries', 'useInfiniteQuery', 'useSuspenseQuery', 'useMutation', 'useQueryClient'];

// A Supabase query (.from()/.rpc()) that is awaited without .throwOnError() last.
const AWAIT_WITHOUT_THROW_ON_ERROR =
  'AwaitExpression > CallExpression:not([callee.property.name="throwOnError"]):has(CallExpression[callee.property.name=/^(from|rpc)$/])';

module.exports = defineConfig([
  expoConfig,
  {
    // Agent/editor tooling isn't app code (same folders .easignore keeps out of EAS uploads).
    ignores: ['dist/*', '.agents/*', '.argent/*', '.claude/*', '.cursor/*', '.vscode/*'],
  },
  {
    // Screens, routes and components get remote data only through the hooks in src/lib/queries/.
    files: UI_FILES,
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            { name: '@/lib/supabase', message: 'Use a hook from @/lib/queries/<area> instead of the Supabase client.' },
            { name: '@supabase/supabase-js', message: 'Supabase is queried only in src/services/.' },
            {
              name: '@tanstack/react-query',
              importNames: TANSTACK_DATA_HOOKS,
              message: 'Wrap queries and mutations in a hook in src/lib/queries/<area>/use-<name>.ts.',
            },
          ],
          patterns: [
            {
              group: ['@/services/*', '!@/services/errors'],
              message: 'Screens use hooks from @/lib/queries/<area>; only @/services/errors may be imported here.',
            },
          ],
        },
      ],
    },
  },
  {
    // Services are plain async functions: no React, no TanStack, no hooks.
    files: ['src/services/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            { name: 'react', message: 'Services are plain async functions; React belongs in the hooks.' },
            { name: '@tanstack/react-query', message: 'Caching belongs in the hooks in src/lib/queries/.' },
          ],
          patterns: [{ group: ['@/lib/queries', '@/lib/queries/*'], message: 'Services must not depend on hooks.' }],
        },
      ],
      'no-restricted-syntax': [
        'error',
        { selector: AWAIT_WITHOUT_THROW_ON_ERROR, message: 'End Supabase queries with .throwOnError() so failures reject.' },
      ],
    },
  },
  {
    // Hooks call services; they don't build Supabase queries themselves.
    files: ['src/lib/queries/**/*.ts'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: 'CallExpression[callee.property.name=/^(from|rpc)$/][callee.object.name="supabase"]',
          message: 'Query Supabase in a service in src/services/<area>.ts and call it from the hook.',
        },
      ],
    },
  },
]);
