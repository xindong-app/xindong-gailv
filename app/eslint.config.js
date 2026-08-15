import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      // 浏览器包严禁引入 react-dom/server(+60 KiB gz 服务端渲染器);
      // 分享卡小人上卡请用 react-dom 客户端离屏渲染取 innerHTML(见 share/canvas.ts personSvgDataUri)
      'no-restricted-imports': ['error', {
        paths: [{
          name: 'react-dom/server',
          message: '浏览器包禁入 react-dom/server(+60 KiB gz);请用 react-dom 客户端离屏渲染(见 share/canvas.ts personSvgDataUri)。',
        }],
      }],
    },
  },
])
