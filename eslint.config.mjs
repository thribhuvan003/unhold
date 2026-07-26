import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';
import nextTypescript from 'eslint-config-next/typescript';

const eslintConfig = [...nextCoreWebVitals, ...nextTypescript, {
  ignores: ['test-results/**', 'playwright-report/**', 'blob-report/**'],
}];

export default eslintConfig;