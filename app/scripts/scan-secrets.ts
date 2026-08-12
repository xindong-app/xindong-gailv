import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { extname, relative, resolve } from 'node:path'

const repositoryResult = spawnSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' })
if (repositoryResult.status !== 0) throw new Error('无法定位 Git 根目录，密钥扫描已停止。')
const repositoryRoot = repositoryResult.stdout.trim()
const filesResult = spawnSync('git', ['ls-files', '-z', '--cached', '--others', '--exclude-standard'], { cwd: repositoryRoot, encoding: 'utf8' })
if (filesResult.status !== 0) throw new Error('无法读取 Git 候选文件清单，密钥扫描已停止。')

const candidateFiles = [...new Set(filesResult.stdout.split('\0').filter(Boolean))]
const textExtensions = new Set([
  '', '.cjs', '.conf', '.css', '.go', '.html', '.ini', '.java', '.js', '.json', '.jsx', '.key', '.md', '.mjs',
  '.pem', '.properties', '.ps1', '.py', '.rb', '.sh', '.svg', '.toml', '.ts', '.tsx', '.txt', '.xml', '.yaml', '.yml',
])
const secretRules: Array<{ name: string; pattern: RegExp }> = [
  { name: 'private key', pattern: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/ },
  { name: 'AWS access key', pattern: /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/ },
  { name: 'GitHub token', pattern: /\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,})\b/ },
  { name: 'Google API key', pattern: /\bAIza[0-9A-Za-z_-]{35}\b/ },
  { name: 'Slack token', pattern: /\bxox[baprs]-[0-9A-Za-z-]{20,}\b/ },
  { name: 'Stripe secret', pattern: /\bsk_(?:live|test)_[0-9A-Za-z]{20,}\b/ },
  {
    name: 'credential assignment',
    pattern: /\b(?:api[_-]?key|access[_-]?token|auth[_-]?token|client[_-]?secret|password)\b\s*[:=]\s*["'][A-Za-z0-9_+/.=-]{16,}["']/i,
  },
]

const findings: string[] = []
for (const candidate of candidateFiles) {
  const absolute = resolve(repositoryRoot, candidate)
  const basename = candidate.replaceAll('\\', '/').split('/').at(-1) ?? candidate
  if (/^\.env(?:\.|$)/.test(basename) && basename !== '.env.example') {
    findings.push(`${candidate}: environment file is not ignored`)
    continue
  }
  if (basename !== '.env.example' && !textExtensions.has(extname(candidate).toLowerCase())) continue
  let content: string
  try {
    content = readFileSync(absolute, 'utf8')
  } catch {
    continue
  }
  for (const rule of secretRules) {
    if (rule.pattern.test(content)) findings.push(`${relative(repositoryRoot, absolute)}: ${rule.name}`)
  }
}

console.log(`Secret scan: inspected ${candidateFiles.length} tracked or nonignored candidate files without reading non-example .env* contents.`)
if (findings.length > 0) {
  console.error(findings.map((finding) => `- ${finding}`).join('\n'))
  process.exitCode = 1
} else {
  console.log('Secret scan passed: no nonignored environment files or recognized credentials found.')
}
