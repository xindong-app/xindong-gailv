import { gzipSync } from 'node:zlib'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { extname, join, relative, resolve } from 'node:path'
import {
  CSS_GZIP_BUDGET_KIB,
  JS_GZIP_BUDGET_KIB,
  exceedsGzipBudget,
} from './artifact-budgets.ts'

const distDirectory = resolve(process.cwd(), 'dist')
const readableExtensions = new Set(['.css', '.html', '.js', '.json', '.map', '.svg', '.txt', '.xml'])
const forbidden: Array<{ name: string; pattern: RegExp }> = [
  { name: 'code-path production marker', pattern: /code-path/i },
  { name: 'React inspection plugin', pattern: /(?:kimi-plugin-inspect-react|inspect-react|vite-plugin-inspect)/i },
  { name: 'Windows absolute user/source path', pattern: /(?:file:\/{2,3})?[A-Z]:[\\/](?:Users|AI|src|workspace)[\\/]/i },
  { name: 'Unix absolute user/source path', pattern: /(?:file:\/{2,3})?\/(?:Users|home|workspace)\/[\w.-]+\//i },
  { name: 'source map reference', pattern: /[#@]\s*sourceMappingURL=/i },
  { name: 'debugger statement', pattern: /\bdebugger\s*;/ },
  { name: 'React development warning', pattern: /react\.development\.js|react-jsx-dev-runtime/i },
]

if (!existsSync(distDirectory) || !statSync(distDirectory).isDirectory()) {
  throw new Error('dist/ 不存在；请先运行 npm run build。')
}

function filesUnder(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = join(directory, entry.name)
    return entry.isDirectory() ? filesUnder(target) : [target]
  })
}

const files = filesUnder(distDirectory)
const sourceMaps = files.filter((file) => extname(file).toLowerCase() === '.map')
const findings: string[] = sourceMaps.map((file) => `${relative(distDirectory, file)}: source map file`)

for (const file of files) {
  if (!readableExtensions.has(extname(file).toLowerCase())) continue
  const content = readFileSync(file, 'utf8')
  for (const rule of forbidden) {
    if (rule.pattern.test(content)) findings.push(`${relative(distDirectory, file)}: ${rule.name}`)
  }
}

const bundles = files.filter((file) => ['.js', '.css'].includes(extname(file).toLowerCase()))
const budgets = bundles.map((file) => ({
  file: relative(distDirectory, file),
  type: extname(file).toLowerCase(),
  rawBytes: statSync(file).size,
  gzipBytes: gzipSync(readFileSync(file)).byteLength,
}))
const jsGzip = budgets.filter((item) => item.type === '.js').reduce((sum, item) => sum + item.gzipBytes, 0)
const cssGzip = budgets.filter((item) => item.type === '.css').reduce((sum, item) => sum + item.gzipBytes, 0)

console.log(`Artifact scan: ${files.length} files; JS gzip ${(jsGzip / 1024).toFixed(1)} KiB; CSS gzip ${(cssGzip / 1024).toFixed(1)} KiB.`)
if (exceedsGzipBudget(jsGzip, JS_GZIP_BUDGET_KIB)) {
  findings.push(`JS gzip budget exceeded: ${(jsGzip / 1024).toFixed(1)} KiB > ${JS_GZIP_BUDGET_KIB} KiB`)
}
if (exceedsGzipBudget(cssGzip, CSS_GZIP_BUDGET_KIB)) {
  findings.push(`CSS gzip budget exceeded: ${(cssGzip / 1024).toFixed(1)} KiB > ${CSS_GZIP_BUDGET_KIB} KiB`)
}

if (findings.length > 0) {
  console.error(findings.map((finding) => `- ${finding}`).join('\n'))
  process.exitCode = 1
} else {
  console.log('Artifact scan passed: no source-path, debug, inspection, source-map, or size-budget violations.')
}
