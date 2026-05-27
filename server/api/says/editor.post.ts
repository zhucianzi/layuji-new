import { randomUUID } from 'node:crypto'
import { access, mkdir, writeFile } from 'node:fs/promises'
import { basename, extname, join, parse, relative } from 'node:path'
import { cwd, env } from 'node:process'

const projectRoot = cwd()
const saysDir = join(projectRoot, 'content', 'says')
const imageRootDir = join(projectRoot, 'public', 'images', 'says')

const maxImages = 9
const maxImageSize = 15 * 1024 * 1024
const allowedExts = new Set(['.avif', '.gif', '.jpg', '.jpeg', '.png', '.webp'])
const extByMime: Record<string, string> = {
	'image/avif': '.avif',
	'image/gif': '.gif',
	'image/jpeg': '.jpg',
	'image/png': '.png',
	'image/webp': '.webp',
}

function isLocalRequest(event: Parameters<Parameters<typeof defineEventHandler>[0]>[0]) {
	const remoteAddress = event.node.req.socket.remoteAddress
	const host = getRequestHost(event, { xForwardedHost: false }).split(':')[0]

	return [
		'localhost',
		'127.0.0.1',
		'::1',
		'[::1]',
	].includes(host) || [
		'127.0.0.1',
		'::1',
		'::ffff:127.0.0.1',
	].includes(remoteAddress || '')
}

function assertLocalEditor(event: Parameters<Parameters<typeof defineEventHandler>[0]>[0]) {
	if (env.NODE_ENV === 'production' && env.ALLOW_LOCAL_SAY_EDITOR !== '1') {
		throw createError({
			statusCode: 403,
			statusMessage: '本地编辑器只在开发环境保存文件。',
		})
	}

	if (!isLocalRequest(event)) {
		throw createError({
			statusCode: 403,
			statusMessage: '只能从本机访问说说编辑器。',
		})
	}
}

function normalizeDate(value: string) {
	const normalized = value.trim().replace('T', ' ')
	const withSeconds = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(normalized)
		? `${normalized}:00`
		: normalized

	if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(withSeconds))
		return withSeconds

	const now = new Date()
	const pad = (input: number) => input.toString().padStart(2, '0')
	return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`
}

function cleanLineEndings(value: string) {
	return value.replace(/\r\n?/g, '\n').trim()
}

function parseTags(value: string) {
	return value
		.split(/[,，、\n]/)
		.map(tag => tag.trim().replace(/^#/, ''))
		.filter(Boolean)
		.slice(0, 12)
}

function yamlScalar(value: string) {
	return JSON.stringify(value)
}

function deriveTitle(title: string, body: string, date: string) {
	if (title.trim())
		return title.trim().slice(0, 80)

	const firstLine = body.trim().split('\n').find(Boolean)
	if (firstLine)
		return firstLine.replace(/[#*_`>\[\]]/g, '').trim().slice(0, 24)

	return `说说 ${date.slice(0, 16)}`
}

function safeName(value: string, fallback: string) {
	const name = value
		.normalize('NFKC')
		.toLowerCase()
		.replace(/[\\/:*?"<>|]/g, '-')
		.replace(/\s+/g, '-')
		.replace(/-+/g, '-')
		.replace(/^-|-$/g, '')

	return (name || fallback).slice(0, 60)
}

async function exists(path: string) {
	try {
		await access(path)
		return true
	}
	catch {
		return false
	}
}

async function uniqueFilePath(dir: string, filename: string) {
	const parsed = parse(filename)
	let candidateName = filename
	let candidatePath = join(dir, candidateName)
	let suffix = 2

	while (await exists(candidatePath)) {
		candidateName = `${parsed.name}-${suffix}${parsed.ext}`
		candidatePath = join(dir, candidateName)
		suffix++
	}

	return { name: candidateName, path: candidatePath }
}

async function uniqueFolderName(dir: string, folderName: string) {
	let candidate = folderName
	let suffix = 2

	while (await exists(join(dir, candidate))) {
		candidate = `${folderName}-${suffix}`
		suffix++
	}

	return candidate
}

function getImageExt(type = '', filename = '') {
	if (extByMime[type])
		return extByMime[type]

	const ext = extname(filename).toLowerCase()
	return allowedExts.has(ext) ? ext : ''
}

function toProjectPath(path: string) {
	return relative(projectRoot, path).replace(/\\/g, '/')
}

export default defineEventHandler(async (event) => {
	assertLocalEditor(event)

	const parts = await readMultipartFormData(event)
	if (!parts) {
		throw createError({
			statusCode: 400,
			statusMessage: '没有收到可保存的内容。',
		})
	}

	const fields = new Map<string, string>()
	const imageParts = []

	for (const part of parts) {
		if (part.name === 'images' && part.filename) {
			imageParts.push(part)
			continue
		}

		if (part.name)
			fields.set(part.name, part.data.toString('utf8'))
	}

	if (imageParts.length > maxImages) {
		throw createError({
			statusCode: 400,
			statusMessage: `最多一次保存 ${maxImages} 张图片。`,
		})
	}

	const body = cleanLineEndings(fields.get('body') || '')
	if (!body && imageParts.length === 0) {
		throw createError({
			statusCode: 400,
			statusMessage: '正文和图片至少要有一个。',
		})
	}

	const date = normalizeDate(fields.get('date') || '')
	const title = deriveTitle(fields.get('title') || '', body, date)
	const tags = parseTags(fields.get('tags') || '')
	const location = (fields.get('location') || '').trim().slice(0, 80)

	await mkdir(saysDir, { recursive: true })
	await mkdir(imageRootDir, { recursive: true })

	const imagePaths: string[] = []
	if (imageParts.length) {
		const imageFolderBase = `${date.slice(0, 10)}-${date.slice(11, 19).replaceAll(':', '')}-${randomUUID().slice(0, 8)}`
		const imageFolderName = await uniqueFolderName(imageRootDir, imageFolderBase)
		const imageFolderPath = join(imageRootDir, imageFolderName)
		await mkdir(imageFolderPath, { recursive: true })

		for (const [index, image] of imageParts.entries()) {
			if (image.data.byteLength > maxImageSize) {
				throw createError({
					statusCode: 400,
					statusMessage: `${basename(image.filename || `第 ${index + 1} 张图片`)} 超过 15MB。`,
				})
			}

			const ext = getImageExt(image.type, image.filename)
			if (!ext) {
				throw createError({
					statusCode: 400,
					statusMessage: `${basename(image.filename || `第 ${index + 1} 张图片`)} 不是支持的图片格式。`,
				})
			}

			const originalName = parse(basename(image.filename || '')).name
			const fileBaseName = `${String(index + 1).padStart(2, '0')}-${safeName(originalName, 'image')}`
			const imageFile = await uniqueFilePath(imageFolderPath, `${fileBaseName}${ext}`)

			await writeFile(imageFile.path, image.data)
			imagePaths.push(`/images/says/${imageFolderName}/${imageFile.name}`)
		}
	}

	const frontmatter = [
		'---',
		`title: ${yamlScalar(title)}`,
		`date: ${date}`,
		...(imagePaths.length ? [
			'images:',
			...imagePaths.map(image => `  - ${yamlScalar(image)}`),
		] : []),
		...(tags.length ? [`tags: [${tags.map(yamlScalar).join(', ')}]`] : []),
		...(location ? [`location: ${yamlScalar(location)}`] : []),
		'---',
		'',
		body,
		'',
	].join('\n')

	const fileBaseName = `${date.slice(0, 10)}-${safeName(title, `say-${date.slice(11, 19).replaceAll(':', '')}`)}`
	const contentFile = await uniqueFilePath(saysDir, `${fileBaseName}.md`)
	await writeFile(contentFile.path, frontmatter, 'utf8')

	return {
		ok: true,
		title,
		date,
		contentPath: toProjectPath(contentFile.path),
		imagePaths,
	}
})
