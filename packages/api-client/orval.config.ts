import { defineConfig } from 'orval';

export default defineConfig({
  api: {
    input: '../../apps/api/api/openapi.yaml',
    output: {
      target: './src/generated/endpoints',
      schemas: './src/generated/models',
      client: 'react-query',
      mode: 'tags-split',
      prettier: true,
      override: {
        mutator: {
          path: './src/custom-instance.ts',
          name: 'customInstance',
        },
      },
    },
  },
});
