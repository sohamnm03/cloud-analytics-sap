/**
 * obfuscate.mjs — Post-build obfuscation step
 * Run after `vite build`. Processes all JS chunks in dist/assets/
 * Adds: string array encryption, control flow flattening, identifier mangling
 *
 * Usage: node scripts/obfuscate.mjs
 */
import { readFileSync, writeFileSync } from 'fs'
import { glob } from 'glob'
import JavaScriptObfuscator from 'javascript-obfuscator'

const files = await glob('dist/assets/*.js')

if (files.length === 0) {
  console.error('No JS files found in dist/assets/ — run `vite build` first')
  process.exit(1)
}

console.log(`\n→ Obfuscating ${files.length} chunk(s)...\n`)

for (const file of files) {
  const src  = readFileSync(file, 'utf8')
  const orig = src.length

  const result = JavaScriptObfuscator.obfuscate(src, {
    compact: true,
    controlFlowFlattening: true,
    controlFlowFlatteningThreshold: 0.4,
    deadCodeInjection: true,
    deadCodeInjectionThreshold: 0.2,
    identifierNamesGenerator: 'hexadecimal',
    renameGlobals: false,
    // String encryption — makes string literals unreadable
    stringArray: true,
    stringArrayEncoding: ['rc4'],
    stringArrayThreshold: 0.7,
    stringArrayRotate: true,
    stringArrayShuffle: true,
    // Transform object keys: { foo: 1 } → { [_0x…]: 1 }
    transformObjectKeys: true,
    // Remove debug hooks
    disableConsoleOutput: true,
    debugProtection: false,    // set true if you want anti-devtools
    selfDefending: false,      // set true for anti-tampering (breaks HMR in dev)
    sourceMap: false,          // NEVER emit source maps
  })

  writeFileSync(file, result.getObfuscatedCode())
  const ratio = ((1 - result.getObfuscatedCode().length / orig) * -100).toFixed(0)
  console.log(`  ✓ ${file.split('/').pop().padEnd(45)} ${orig.toLocaleString()} → ${result.getObfuscatedCode().length.toLocaleString()} bytes (+${ratio}% obfuscation overhead)`)
}

console.log('\n✓ Obfuscation complete. dist/ is production-ready.\n')
