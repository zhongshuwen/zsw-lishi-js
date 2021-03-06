const { builtinModules } = require("module")
const resolve = require("rollup-plugin-node-resolve")
const commonjs = require("rollup-plugin-commonjs")
const sourceMaps = require("rollup-plugin-sourcemaps")
const typescript = require("rollup-plugin-typescript2")
const json = require("rollup-plugin-json")
const { terser } = require("rollup-plugin-terser")
const ignore = require("rollup-plugin-ignore")

const pkg = require("./package.json")

module.exports = {
  esBuild: () =>
    build({
      output: { file: pkg.module, format: "es", sourcemap: true },
      external: ["crypto", "debug", "fs", "os", "path"]
    }),

  umdBuild: () =>
    build({
      output: {
        file: pkg.browser,
        name: "zswLishiClient",
        format: "umd",
        sourcemap: true
      },
      resolve: {
        browser: true
      },
      prePlugins: [ignore(builtinModules)],
      postPlugins: [terser()]
    })
}

function build(options) {
  return {
    input: `src/index.ts`,
    output: options.output,
    external: options.external || [],
    watch: {
      include: "src/**"
    },
    plugins: [
      ...(options.prePlugins || []),
      json(),
      typescript({ useTsconfigDeclarationDir: true }),
      commonjs(),
      resolve(options.resolve),
      sourceMaps(),
      ...(options.postPlugins || [])
    ]
  }
}
