<script setup lang="ts">
interface SelectedImage {
	id: string
	file: File
	url: string
}

interface SaveResult {
	ok: boolean
	title?: string
	date: string
	contentPath: string
	imagePaths: string[]
	innerImagePaths?: string[]
}

const emit = defineEmits<{
	close: []
	view: []
}>()

const maxImages = 9
const imageInput = ref<HTMLInputElement>()
const innerImageInput = ref<HTMLInputElement>()
const title = ref('')
const body = ref('')
const innerEnabled = ref(false)
const innerTitle = ref('')
const innerBody = ref('')
const tags = ref('')
const location = ref('')
const date = ref(toLocalDateTimeValue(new Date()))
const images = ref<SelectedImage[]>([])
const innerImages = ref<SelectedImage[]>([])
const isSaving = ref(false)
const saveResult = ref<SaveResult>()
const errorMessage = ref('')
const advancedOpen = ref(false)
const isBackdropPointerDown = ref(false)

const appConfig = useAppConfig()
let bodyOverflow = ''

const parsedTags = computed(() => parseTags(tags.value))
const hasInnerContent = computed(() => !!innerTitle.value.trim() || !!innerBody.value.trim() || innerImages.value.length > 0)
const canSave = computed(() => !isSaving.value && (!!body.value.trim() || images.value.length > 0) && (!innerEnabled.value || hasInnerContent.value))
const previewTitle = computed(() => title.value.trim())
const innerPreviewTitle = computed(() => innerTitle.value.trim())

watch([title, body, tags, location, date, innerEnabled, innerTitle, innerBody], () => {
	saveResult.value = undefined
	errorMessage.value = ''
})

watch([images, innerImages], () => {
	saveResult.value = undefined
	errorMessage.value = ''
}, { deep: true })

onMounted(() => {
	const draft = localStorage.getItem('say-editor-draft')
	if (draft) {
		try {
			const parsed = JSON.parse(draft)
			title.value = parsed.title || ''
			body.value = parsed.body || ''
			innerEnabled.value = !!parsed.innerEnabled
			innerTitle.value = parsed.innerTitle || ''
			innerBody.value = parsed.innerBody || ''
			tags.value = parsed.tags || ''
			location.value = parsed.location || ''
			date.value = parsed.date || date.value
			advancedOpen.value = innerEnabled.value || !!tags.value || !!location.value
		}
		catch {
			localStorage.removeItem('say-editor-draft')
		}
	}

	bodyOverflow = document.body.style.overflow
	document.body.style.overflow = 'hidden'
	window.addEventListener('keydown', onKeydown)
})

watch([title, body, tags, location, date, innerEnabled, innerTitle, innerBody], () => {
	if (!import.meta.client)
		return

	localStorage.setItem('say-editor-draft', JSON.stringify({
		title: title.value,
		body: body.value,
		innerEnabled: innerEnabled.value,
		innerTitle: innerTitle.value,
		innerBody: innerBody.value,
		tags: tags.value,
		location: location.value,
		date: date.value,
	}))
}, { deep: true })

onBeforeUnmount(() => {
	revokeImages(images.value)
	revokeImages(innerImages.value)

	if (import.meta.client) {
		document.body.style.overflow = bodyOverflow
		window.removeEventListener('keydown', onKeydown)
	}
})

function onKeydown(event: KeyboardEvent) {
	if (event.key === 'Escape')
		closeEditor()
}

function onBackdropPointerdown(event: PointerEvent) {
	isBackdropPointerDown.value = event.target === event.currentTarget
}

function onBackdropClick(event: MouseEvent) {
	if (event.target === event.currentTarget && isBackdropPointerDown.value)
		closeEditor()

	isBackdropPointerDown.value = false
}

function closeEditor() {
	emit('close')
}

function viewSavedSay() {
	emit('view')
}

function toLocalDateTimeValue(input: Date) {
	const pad = (value: number) => value.toString().padStart(2, '0')

	const datePart = [
		input.getFullYear(),
		pad(input.getMonth() + 1),
		pad(input.getDate()),
	].join('-')

	return `${datePart}T${pad(input.getHours())}:${pad(input.getMinutes())}`
}

function parseTags(value: string) {
	return value
		.split(/[,，、\n]/)
		.map(tag => tag.trim().replace(/^#/, ''))
		.filter(Boolean)
		.slice(0, 12)
}

function pickImages() {
	imageInput.value?.click()
}

function pickInnerImages() {
	innerImageInput.value?.click()
}

function revokeImages(list: SelectedImage[]) {
	for (const image of list)
		URL.revokeObjectURL(image.url)
}

function createSelectedImages(files: File[], slots: number) {
	return files
		.filter(file => file.type.startsWith('image/'))
		.slice(0, slots)
		.map(file => ({
			id: `${file.name}-${file.lastModified}-${crypto.randomUUID()}`,
			file,
			url: URL.createObjectURL(file),
		}))
}

function onImageChange(event: Event) {
	const input = event.target as HTMLInputElement
	const files = Array.from(input.files || [])
	if (!files.length)
		return

	const slots = Math.max(0, maxImages - images.value.length)
	const accepted = createSelectedImages(files, slots)

	images.value = [...images.value, ...accepted]
	input.value = ''
}

function onInnerImageChange(event: Event) {
	const input = event.target as HTMLInputElement
	const files = Array.from(input.files || [])
	if (!files.length)
		return

	const slots = Math.max(0, maxImages - innerImages.value.length)
	const accepted = createSelectedImages(files, slots)

	innerImages.value = [...innerImages.value, ...accepted]
	input.value = ''
}

function removeImage(id: string) {
	const image = images.value.find(item => item.id === id)
	if (image)
		URL.revokeObjectURL(image.url)

	images.value = images.value.filter(item => item.id !== id)
}

function removeInnerImage(id: string) {
	const image = innerImages.value.find(item => item.id === id)
	if (image)
		URL.revokeObjectURL(image.url)

	innerImages.value = innerImages.value.filter(item => item.id !== id)
}

function resetForNewSay() {
	title.value = ''
	body.value = ''
	innerEnabled.value = false
	innerTitle.value = ''
	innerBody.value = ''
	tags.value = ''
	location.value = ''
	date.value = toLocalDateTimeValue(new Date())
	revokeImages(images.value)
	revokeImages(innerImages.value)
	images.value = []
	innerImages.value = []
	advancedOpen.value = false
	saveResult.value = undefined
	errorMessage.value = ''
	localStorage.removeItem('say-editor-draft')
}

async function saveSay() {
	if (!canSave.value)
		return

	isSaving.value = true
	errorMessage.value = ''
	saveResult.value = undefined

	const formData = new FormData()
	formData.append('title', title.value)
	formData.append('body', body.value)
	formData.append('tags', tags.value)
	formData.append('location', location.value)
	formData.append('date', date.value)
	formData.append('innerEnabled', innerEnabled.value ? '1' : '0')

	for (const image of images.value)
		formData.append('images', image.file, image.file.name)

	if (innerEnabled.value) {
		formData.append('innerTitle', innerTitle.value)
		formData.append('innerBody', innerBody.value)

		for (const image of innerImages.value)
			formData.append('innerImages', image.file, image.file.name)
	}

	try {
		saveResult.value = await $fetch<SaveResult>('/api/says/editor', {
			method: 'POST',
			body: formData,
		})
		localStorage.removeItem('say-editor-draft')
	}
	catch (error: any) {
		errorMessage.value = error?.data?.statusMessage || error?.message || '保存失败'
	}
	finally {
		isSaving.value = false
	}
}
</script>

<template>
<Teleport to="body">
	<div
		class="say-editor-overlay"
		role="dialog"
		aria-modal="true"
		aria-labelledby="say-editor-title"
		@pointerdown="onBackdropPointerdown"
		@click="onBackdropClick"
	>
		<section class="say-editor-modal">
			<header class="editor-title">
				<div>
					<h2 id="say-editor-title" class="text-creative">
						写说说
					</h2>
				</div>

				<div class="editor-actions">
					<ZButton icon="ph:x-bold" text="关闭" @click="closeEditor" />
					<ZButton icon="ph:paper-plane-tilt-bold" text="保存" primary :disabled="!canSave" @click="saveSay" />
				</div>
			</header>

			<div class="editor-layout">
				<form class="editor-form" @submit.prevent="saveSay">
					<section class="editor-section">
						<label class="field">
							<span>标题</span>
							<input v-model="title" type="text" maxlength="80" placeholder="可留空">
						</label>

						<label class="field">
							<span>正文</span>
							<textarea v-model="body" rows="12" placeholder="今天想说点什么"></textarea>
						</label>
					</section>

					<section class="editor-section image-picker">
						<div class="section-heading">
							<span>图片</span>
						</div>

						<input ref="imageInput" hidden type="file" accept="image/*" multiple @change="onImageChange">

						<div v-if="images.length" class="image-list">
							<figure v-for="image in images" :key="image.id" class="image-tile">
								<img :src="image.url" :alt="image.file.name">
								<button type="button" class="remove-image" title="移除图片" @click="removeImage(image.id)">
									<Icon name="ph:x-bold" />
								</button>
							</figure>
							<button
								v-if="images.length < maxImages"
								type="button"
								class="image-tile add-image-tile"
								title="追加图片"
								aria-label="追加图片"
								@click="pickImages"
							>
								<Icon name="ph:plus-bold" />
							</button>
						</div>

						<button v-else type="button" class="empty-picker" @click="pickImages">
							<Icon name="ph:plus-bold" />
							<span>选择图片</span>
						</button>
					</section>

					<section class="editor-section advanced-editor">
						<button
							type="button"
							class="advanced-toggle"
							:aria-expanded="advancedOpen"
							@click="advancedOpen = !advancedOpen"
						>
							<span>
								<Icon name="ph:sliders-horizontal-bold" />
								高级功能
							</span>
							<Icon class="advanced-toggle-icon" name="ph:caret-down-bold" />
						</button>

						<div v-if="advancedOpen" class="advanced-fields">
							<div class="editor-grid">
								<label class="field">
									<span>时间</span>
									<input v-model="date" type="datetime-local">
								</label>

								<label class="field">
									<span>地点</span>
									<input v-model="location" type="text" maxlength="80" placeholder="可留空">
								</label>

								<label class="field editor-grid-wide">
									<span>标签</span>
									<input v-model="tags" type="text" placeholder="日常, 站点">
								</label>
							</div>

							<div class="advanced-inline-actions">
								<ZButton icon="ph:clock-counter-clockwise-bold" text="设为现在" @click="date = toLocalDateTimeValue(new Date())" />
							</div>

							<div class="inner-editor">
								<label class="toggle-field">
									<input v-model="innerEnabled" type="checkbox">
									<span class="toggle-shell" aria-hidden="true">
										<span />
									</span>
									<span>里内容</span>
								</label>

								<div v-if="innerEnabled" class="inner-fields">
									<label class="field">
										<span>里标题</span>
										<input v-model="innerTitle" type="text" maxlength="80" placeholder="可留空">
									</label>

									<label class="field">
										<span>里正文</span>
										<textarea v-model="innerBody" rows="8" placeholder="藏在长按后的内容"></textarea>
									</label>

									<div class="image-picker">
										<div class="section-heading">
											<span>里图片</span>
										</div>

										<input ref="innerImageInput" hidden type="file" accept="image/*" multiple @change="onInnerImageChange">

										<div v-if="innerImages.length" class="image-list">
											<figure v-for="image in innerImages" :key="image.id" class="image-tile">
												<img :src="image.url" :alt="image.file.name">
												<button type="button" class="remove-image" title="移除图片" @click="removeInnerImage(image.id)">
													<Icon name="ph:x-bold" />
												</button>
											</figure>
											<button
												v-if="innerImages.length < maxImages"
												type="button"
												class="image-tile add-image-tile"
												title="追加图片"
												aria-label="追加图片"
												@click="pickInnerImages"
											>
												<Icon name="ph:plus-bold" />
											</button>
										</div>

										<button v-else type="button" class="empty-picker" @click="pickInnerImages">
											<Icon name="ph:plus-bold" />
											<span>选择里图片</span>
										</button>
									</div>
								</div>
							</div>
						</div>
					</section>

					<p v-if="errorMessage" class="message error-message">
						<Icon name="ph:warning-circle-bold" />
						{{ errorMessage }}
					</p>

					<div v-if="saveResult" class="message success-message">
						<div>
							<Icon name="ph:check-circle-bold" />
							已保存
						</div>
						<code>{{ saveResult.contentPath }}</code>
						<code v-for="imagePath in saveResult.imagePaths" :key="imagePath">{{ imagePath }}</code>
						<code v-for="imagePath in saveResult.innerImagePaths" :key="imagePath">{{ imagePath }}</code>
						<div class="success-actions">
							<ZButton icon="ph:chat-teardrop-text-bold" text="查看" @click="viewSavedSay" />
							<ZButton icon="ph:plus-bold" text="新建" @click="resetForNewSay" />
						</div>
					</div>
				</form>

				<aside class="editor-preview">
					<div class="preview-sticky">
						<p class="preview-label">
							<Icon name="ph:eye-bold" />
							预览
						</p>

						<article class="preview-card">
							<header class="preview-header">
								<NuxtImg class="preview-avatar" :src="appConfig.author.avatar" :alt="appConfig.author.name" />
								<div>
									<strong>{{ appConfig.author.name }}</strong>
									<div class="preview-subline">
										<span>
											<Icon name="ph:clock-countdown-bold" />
											{{ date.replace('T', ' ') }}
										</span>
										<span v-if="location">
											<Icon name="ph:map-pin-bold" />
											{{ location }}
										</span>
									</div>
								</div>
							</header>

							<h2 v-if="previewTitle">
								{{ previewTitle }}
							</h2>
							<p v-if="body.trim()" class="preview-body">{{ body }}</p>
							<p v-else class="preview-empty">正文会出现在这里。</p>

							<div
								v-if="images.length"
								class="preview-images"
								:class="{
									'preview-images-single': images.length === 1,
									'preview-images-pair': images.length === 2,
								}"
							>
								<img v-for="image in images" :key="image.id" :src="image.url" :alt="image.file.name">
							</div>

							<footer v-if="parsedTags.length" class="preview-tags">
								<span v-for="tag in parsedTags" :key="tag">#{{ tag }}</span>
							</footer>
						</article>

						<article v-if="innerEnabled" class="preview-card inner-preview-card">
							<p class="preview-label">
								<Icon name="ph:spiral-bold" />
								里内容
							</p>

							<h2 v-if="innerPreviewTitle">
								{{ innerPreviewTitle }}
							</h2>
							<p v-if="innerBody.trim()" class="preview-body">{{ innerBody }}</p>
							<p v-else class="preview-empty">里正文会出现在这里。</p>

							<div
								v-if="innerImages.length"
								class="preview-images"
								:class="{
									'preview-images-single': innerImages.length === 1,
									'preview-images-pair': innerImages.length === 2,
								}"
							>
								<img v-for="image in innerImages" :key="image.id" :src="image.url" :alt="image.file.name">
							</div>
						</article>
					</div>
				</aside>
			</div>
		</section>
	</div>
</Teleport>
</template>

<style lang="scss" scoped>
.say-editor-overlay {
	display: grid;
	place-items: center;
	position: fixed;
	inset: 0;
	padding: 1rem;
	background-color: rgb(0 0 0 / 45%);
	backdrop-filter: blur(0.35rem);
	z-index: 1000;
}

.say-editor-modal {
	container-type: inline-size;
	display: grid;
	grid-template-rows: auto minmax(0, 1fr);
	overflow: hidden;
	width: min(76rem, 100%);
	max-height: calc(100dvh - 2rem);
	border: 1px solid var(--c-border);
	border-radius: 0.5rem;
	box-shadow: 0 1.4rem 4rem rgb(0 0 0 / 24%);
	background-color: var(--c-bg);
}

.editor-title {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 1rem;
	padding: 1rem 1.1rem;
	border-bottom: 1px solid var(--c-border);
	background-color: color-mix(in srgb, var(--ld-bg-card), transparent 8%);

	h2 {
		margin: 0.1rem 0 0;
		font-size: clamp(1.4rem, 4vw, 2rem);
		line-height: 1.1;
		color: var(--c-text);
	}
}

.preview-label {
	display: inline-flex;
	align-items: center;
	gap: 0.35em;
	margin: 0;
	font-size: 0.86em;
	color: var(--c-text-2);
}

.editor-actions {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	justify-content: flex-end;
	gap: 0.5rem;
}

.editor-actions :deep(.button + .button),
.success-actions :deep(.button + .button),
.advanced-inline-actions :deep(.button + .button) {
	margin-inline-start: 0;
}

.editor-actions :deep(.button),
.success-actions :deep(.button),
.advanced-inline-actions :deep(.button) {
	border-color: var(--c-border);
	box-shadow: none;
	background-color: var(--ld-bg-card);
}

.editor-actions :deep(.button.primary) {
	border-color: var(--c-primary);
	background-color: var(--c-primary);
	color: var(--c-bg);
}

.editor-actions :deep(.button:hover),
.success-actions :deep(.button:hover),
.advanced-inline-actions :deep(.button:hover) {
	background-color: var(--c-bg-2);
	transform: none;
}

.editor-actions :deep(.button.primary:hover) {
	background-color: var(--c-primary);
	color: var(--c-bg);
}

.editor-layout {
	display: grid;
	grid-template-columns: minmax(0, 1.08fr) minmax(20rem, 0.92fr);
	gap: 0;
	min-height: 0;
}

.editor-form,
.editor-preview {
	overflow: auto;
	min-width: 0;
	min-height: 0;
}

.editor-form {
	display: grid;
	align-content: start;
	gap: 1rem;
	padding: 1rem;
	border-inline-end: 1px solid var(--c-border);
}

.editor-preview {
	padding: 1rem;
	background-color: color-mix(in srgb, var(--c-bg-2), transparent 35%);
}

.editor-section,
.preview-card,
.message {
	border: 1px solid var(--c-border);
	border-radius: 0.5rem;
	background-color: var(--ld-bg-card);
}

.editor-section {
	display: grid;
	gap: 0.85rem;
	padding: 1rem;
}

.editor-grid {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(min(100%, 15rem), 1fr));
	gap: 0.85rem;
}

.editor-grid-wide {
	grid-column: 1 / -1;
}

.field {
	display: grid;
	gap: 0.35rem;
	min-width: 0;
	color: var(--c-text-2);

	span {
		font-size: 0.85em;
		font-weight: 600;
		color: var(--c-text-1);
	}

	input,
	textarea {
		width: 100%;
		min-width: 0;
		max-width: 100%;
		border: 1px solid var(--c-border);
		border-radius: 0.4rem;
		background-color: var(--c-bg-2);
		color: var(--c-text);
		transition: border-color 0.2s, background-color 0.2s;

		&:focus {
			border-color: var(--c-primary);
			outline: none;
			background-color: var(--c-bg-1);
		}
	}

	input {
		min-height: 2.5rem;
		padding-inline: 0.75rem;
	}

	textarea {
		min-height: 14rem;
		padding: 0.75rem;
		line-height: 1.7;
		resize: vertical;
	}
}

.advanced-editor {
	padding: 0;
}

.advanced-toggle {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 1rem;
	width: 100%;
	padding: 0.9rem 1rem;
	font-weight: 650;
	color: var(--c-text-1);

	> span {
		display: inline-flex;
		align-items: center;
		gap: 0.4em;
	}

	.iconify {
		flex: none;
	}
}

.advanced-toggle-icon {
	transition: transform 0.2s;
}

.advanced-toggle[aria-expanded="true"] .advanced-toggle-icon {
	transform: rotate(180deg);
}

.advanced-fields {
	display: grid;
	gap: 0.9rem;
	padding: 0 1rem 1rem;
}

.advanced-inline-actions {
	display: flex;
	flex-wrap: wrap;
	gap: 0.5rem;
}

.inner-editor {
	display: grid;
	gap: 0.85rem;
	padding-top: 0.9rem;
	border-top: 1px solid var(--c-border);
}

.inner-fields {
	display: grid;
	gap: 0.85rem;
}

.toggle-field {
	display: flex;
	align-items: center;
	gap: 0.6rem;
	width: max-content;
	max-width: 100%;
	font-size: 0.92em;
	font-weight: 650;
	color: var(--c-text-1);
	cursor: pointer;

	input {
		position: absolute;
		opacity: 0;
		pointer-events: none;
	}

	input:checked + .toggle-shell {
		border-color: var(--c-primary);
		background-color: var(--c-primary-soft);

		span {
			background-color: var(--c-primary);
			transform: translateX(1.1rem);
		}
	}

	input:focus-visible + .toggle-shell {
		outline: 2px solid var(--c-primary-soft);
		outline-offset: 2px;
	}
}

.toggle-shell {
	display: inline-flex;
	align-items: center;
	width: 2.4rem;
	height: 1.3rem;
	padding: 0.15rem;
	border: 1px solid var(--c-border);
	border-radius: 999px;
	background-color: var(--c-bg-2);
	transition: border-color 0.2s, background-color 0.2s;

	span {
		width: 0.86rem;
		aspect-ratio: 1;
		border-radius: 50%;
		background-color: var(--c-text-3);
		transition: background-color 0.2s, transform 0.2s;
	}
}

.section-heading {
	display: flex;
	align-items: center;
	justify-content: space-between;
	font-size: 0.85em;
	font-weight: 600;
	color: var(--c-text-1);
}

.image-list {
	display: grid;
	grid-template-columns: repeat(3, minmax(0, 1fr));
	gap: 0.55rem;
}

.image-tile {
	position: relative;
	overflow: hidden;
	aspect-ratio: 1;
	border: 1px solid var(--c-border);
	border-radius: 0.5rem;
	background-color: var(--c-bg-1);

	img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}
}

.add-image-tile {
	display: grid;
	place-items: center;
	border-style: dashed;
	background-color: var(--c-bg-2);
	font-size: 1.55rem;
	color: var(--c-text-3);
	transition: border-color 0.2s, background-color 0.2s, color 0.2s;

	&:hover {
		border-color: var(--c-primary);
		background-color: var(--c-bg-1);
		color: var(--c-primary);
	}
}

.remove-image {
	display: inline-grid;
	place-items: center;
	position: absolute;
	top: 0.4rem;
	right: 0.4rem;
	width: 1.85rem;
	height: 1.85rem;
	border: 1px solid #0004;
	border-radius: 0.45rem;
	background-color: #000A;
	color: #FFF;
	transition: border-color 0.2s, background-color 0.2s, color 0.2s;

	&:hover {
		border-color: #FFF8;
		color: #FFF;
	}
}

.empty-picker {
	display: grid;
	place-items: center;
	gap: 0.35rem;
	min-height: 7rem;
	border: 1px dashed var(--c-border);
	border-radius: 0.5rem;
	background-color: var(--c-bg-2);
	color: var(--c-text-2);
	transition: border-color 0.2s, background-color 0.2s, color 0.2s;

	&:hover {
		border-color: var(--c-primary);
		background-color: var(--c-bg-1);
		color: var(--c-primary);
	}

	.iconify {
		font-size: 1.6rem;
	}
}

.message {
	display: grid;
	gap: 0.45rem;
	padding: 0.85rem 1rem;
	font-size: 0.92em;

	> div:first-child {
		display: inline-flex;
		align-items: center;
		gap: 0.35em;
		font-weight: 650;
	}

	code {
		display: block;
		overflow-wrap: anywhere;
		padding: 0.45rem 0.55rem;
		border-radius: 0.35rem;
		background-color: var(--c-bg-1);
		font-size: 0.86em;
	}
}

.error-message {
	display: flex;
	align-items: center;
	gap: 0.4em;
	border-color: var(--c-error-soft);
	background-color: var(--c-error-soft);
	color: var(--c-error);
}

.success-message {
	border-color: var(--c-success-soft);
	background-color: var(--c-success-soft);
	color: var(--c-success);
}

.success-actions {
	display: flex;
	flex-wrap: wrap;
	gap: 0.5rem;
	margin-top: 0.2rem;
}

.preview-sticky {
	display: grid;
	gap: 0.6rem;
}

.preview-card {
	display: grid;
	gap: 0.8rem;
	padding: 1rem;
	border-inline-start-width: 0.22rem;
	color: var(--c-text);
}

.inner-preview-card {
	border-color: color-mix(in srgb, var(--c-primary-soft), var(--c-border) 45%);
	background-color: color-mix(in srgb, var(--ld-bg-card), var(--c-primary-soft) 8%);
}

.preview-header {
	display: flex;
	align-items: center;
	gap: 0.75rem;
	min-width: 0;

	> div {
		min-width: 0;
	}
}

.preview-avatar {
	flex: none;
	width: 2.8rem;
	height: 2.8rem;
	padding: 0.12rem;
	border-radius: 50%;
	box-shadow: 0 0 0 1px var(--c-border);
	background-color: var(--ld-bg-card);
	object-fit: cover;
}

.preview-subline {
	display: flex;
	flex-wrap: wrap;
	gap: 0.5em 1em;
	margin-top: 0.2rem;
	font-size: 0.82em;
	color: var(--c-text-2);

	span {
		display: inline-flex;
		align-items: center;
		gap: 0.2em;
		overflow-wrap: anywhere;
		min-width: 0;
		max-width: 100%;
	}
}

.preview-card h2 {
	margin: 0;
	font-size: 1.05rem;
	line-height: 1.35;
	color: var(--c-text-1);
}

.preview-body,
.preview-empty {
	margin: 0;
	font-size: 0.98em;
	line-height: 1.75;
	white-space: pre-wrap;
}

.preview-empty {
	color: var(--c-text-3);
}

.preview-images {
	display: grid;
	grid-template-columns: repeat(3, minmax(0, 1fr));
	gap: 0.4rem;

	img {
		width: 100%;
		aspect-ratio: 1;
		border: 1px solid var(--c-border);
		border-radius: 0.5rem;
		background-color: var(--c-bg-1);
		object-fit: cover;
	}
}

.preview-images-single {
	grid-template-columns: minmax(0, 1fr);
	max-width: 24rem;

	img {
		aspect-ratio: 4 / 3;
	}
}

.preview-images-pair {
	grid-template-columns: repeat(2, minmax(0, 1fr));
	max-width: 28rem;
}

.preview-tags {
	display: flex;
	flex-wrap: wrap;
	gap: 0.45em;
	font-size: 0.86em;

	span {
		padding: 0.16em 0.58em;
		border: 1px solid var(--c-border);
		border-radius: 999px;
		background-color: var(--c-bg-2);
		color: var(--c-text-1);
	}
}

@container (max-width: 58rem) {
	.editor-layout {
		grid-template-columns: 1fr;
		overflow: auto;
	}

	.editor-form {
		overflow: visible;
		border-inline-end: 0;
		border-bottom: 1px solid var(--c-border);
	}

	.editor-preview {
		overflow: visible;
	}
}

@media (max-width: $breakpoint-phone) {
	.say-editor-overlay {
		align-items: stretch;
		padding: 0.5rem;
	}

	.say-editor-modal {
		max-height: calc(100dvh - 1rem);
	}

	.editor-title {
		flex-direction: column;
		align-items: flex-start;
		padding: 0.9rem;
	}

	.editor-actions {
		justify-content: flex-start;
	}

	.editor-form,
	.editor-preview {
		padding: 0.75rem;
	}

	.editor-grid,
	.image-list {
		grid-template-columns: 1fr;
	}
}
</style>
