// esbuild 打包期自行处理 .css 导入（见 scripts/build-client.mjs 的 external/plugin 配置），
// tsc 只需认可该导入合法。
declare module '*.css'
