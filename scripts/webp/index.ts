import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import sharp from 'sharp'

const inputDir = join(import.meta.dirname, 'input')
const outputDir = join(import.meta.dirname, 'output')

for (const path of await readdir(inputDir)) {
	const file = await readFile(join(inputDir, path))
	const outputPath = join(outputDir, path).replace(/\.\w+$/, '.webp')
	await sharp(file).webp().toFile(outputPath)
}
