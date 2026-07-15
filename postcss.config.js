// postcss.config.js
export default {
  plugins: {
    // 👈 将原有的 'tailwindcss' 替换为 v4 专用的新包名
    '@tailwindcss/postcss': {},
    autoprefixer: {},
  },
}