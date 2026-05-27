<script setup lang="ts">
interface SayItem {
	path?: string
	title?: string
	date?: string
	body?: unknown
	images?: string[]
	inner?: {
		title?: string
		body?: string
		images?: string[]
	}
	tags?: string[]
	location?: string
}

const props = defineProps<{
	item: SayItem
	index?: number
}>()

const appConfig = useAppConfig()
const cardRef = ref<HTMLElement | null>(null)
const isInnerVisible = ref(false)
const isDarkMode = ref(false)
const isPressingInner = ref(false)
const longPressDelay = 620
let longPressTimer: ReturnType<typeof setTimeout> | undefined
let leaveInnerTimer: ReturnType<typeof setTimeout> | undefined
let longPressClickGuardTimer: ReturnType<typeof setTimeout> | undefined
let colorModeObserver: MutationObserver | undefined
let longPressTriggered = false

const hasInner = computed(() => {
	const inner = props.item.inner
	return !!(inner?.title?.trim() || inner?.body?.trim() || inner?.images?.length)
})

const activeSide = computed(() => isInnerVisible.value && hasInner.value ? 'inner' : 'outer')
const activeTitle = computed(() => activeSide.value === 'inner' ? props.item.inner?.title : props.item.title)
const activeImages = computed(() => activeSide.value === 'inner' ? props.item.inner?.images || [] : props.item.images || [])
const activeBody = computed(() => activeSide.value === 'inner' ? props.item.inner?.body || '' : props.item.body)
const innerBody = computed(() => props.item.inner?.body || '')
const hasActiveBody = computed(() => typeof activeBody.value === 'string' ? !!activeBody.value.trim() : !!activeBody.value)
const isDarkInner = computed(() => isInnerVisible.value && isDarkMode.value)

onMounted(() => {
	if (!import.meta.client)
		return

	syncDarkMode()
	colorModeObserver = new MutationObserver(syncDarkMode)
	colorModeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
})

onBeforeUnmount(() => {
	cancelLongPress()
	cancelLeaveInner()
	clearLongPressClickGuard()
	stopPointerLeaveWatcher()
	colorModeObserver?.disconnect()
})

watch(isInnerVisible, (visible) => {
	if (!import.meta.client)
		return

	if (visible)
		startPointerLeaveWatcher()
	else
		stopPointerLeaveWatcher()
})

function toggleInner() {
	if (!hasInner.value)
		return

	isInnerVisible.value = !isInnerVisible.value
	if (!isInnerVisible.value)
		cancelLeaveInner()
}

function showInner() {
	if (!hasInner.value)
		return

	isInnerVisible.value = true
	cancelLeaveInner()
}

function hideInner() {
	if (!hasInner.value)
		return

	isInnerVisible.value = false
	cancelLeaveInner()
}

function startLongPress(event: PointerEvent) {
	if (!hasInner.value || event.button > 0 || isLightboxTarget(event) || isImageTarget(event))
		return

	if (isInnerVisible.value) {
		event.preventDefault()
		event.stopPropagation()
		hideInner()
		return
	}

	longPressTriggered = false
	cancelLeaveInner()
	cancelLongPress()
	isPressingInner.value = true
	longPressTimer = setTimeout(() => {
		longPressTriggered = true
		showInner()
	}, longPressDelay)
}

function cancelLongPress() {
	isPressingInner.value = false
	if (!longPressTimer)
		return

	clearTimeout(longPressTimer)
	longPressTimer = undefined
}

function finishLongPress() {
	const shouldGuardClick = longPressTriggered

	cancelLongPress()

	if (!shouldGuardClick)
		return

	if (longPressClickGuardTimer)
		clearTimeout(longPressClickGuardTimer)

	longPressClickGuardTimer = setTimeout(() => {
		longPressTriggered = false
		longPressClickGuardTimer = undefined
	}, 260)
}

function onCardClick(event: MouseEvent) {
	if (longPressTriggered) {
		event.preventDefault()
		event.stopPropagation()
		clearLongPressClickGuard()
		return
	}

	if (isInnerVisible.value && hasInner.value && !isImageTarget(event) && !isLightboxTarget(event)) {
		event.preventDefault()
		event.stopPropagation()
		hideInner()
	}
}

function onContextMenu(event: MouseEvent) {
	if (!hasInner.value)
		return

	event.preventDefault()
}

function onCardPointerEnter() {
	cancelLeaveInner()
}

function onCardPointerLeave() {
	cancelLongPress()
	scheduleLeaveInner()
}

function cancelLeaveInner() {
	if (!leaveInnerTimer)
		return

	clearTimeout(leaveInnerTimer)
	leaveInnerTimer = undefined
}

function scheduleLeaveInner() {
	if (!isInnerVisible.value || leaveInnerTimer)
		return

	leaveInnerTimer = setTimeout(() => {
		leaveInnerTimer = undefined
		hideInner()
	}, 800)
}

function startPointerLeaveWatcher() {
	document.addEventListener('pointermove', onDocumentPointerMove, { passive: true })
}

function stopPointerLeaveWatcher() {
	if (!import.meta.client)
		return

	document.removeEventListener('pointermove', onDocumentPointerMove)
}

function onDocumentPointerMove(event: PointerEvent) {
	if (!isInnerVisible.value)
		return

	const card = cardRef.value
	if (!card)
		return

	const rect = card.getBoundingClientRect()
	const isInside = event.clientX >= rect.left
		&& event.clientX <= rect.right
		&& event.clientY >= rect.top
		&& event.clientY <= rect.bottom

	if (isInside)
		cancelLeaveInner()
	else
		scheduleLeaveInner()
}

function clearLongPressClickGuard() {
	longPressTriggered = false
	if (!longPressClickGuardTimer)
		return

	clearTimeout(longPressClickGuardTimer)
	longPressClickGuardTimer = undefined
}

function syncDarkMode() {
	isDarkMode.value = document.documentElement.classList.contains('dark')
}

function isLightboxTarget(event: Event) {
	return event.target instanceof HTMLElement && !!event.target.closest('.say-lightbox')
}

function isImageTarget(event: Event) {
	return event.target instanceof HTMLElement && !!event.target.closest('.say-image-link')
}
</script>

<template>
<article
	ref="cardRef"
	class="say-card"
	:class="{ 'has-inner': hasInner, 'is-inner': isInnerVisible, 'is-inner-dark': isDarkInner, 'is-inner-pressing': isPressingInner }"
	:style="getFixedDelay((index || 0) * 0.05)"
	:tabindex="hasInner ? 0 : undefined"
	:role="hasInner ? 'button' : undefined"
	:aria-pressed="hasInner ? isInnerVisible : undefined"
	:aria-label="hasInner ? (isInnerVisible ? '切回表内容' : '长按切换到里内容') : undefined"
	@pointerdown="startLongPress"
	@pointerup="finishLongPress"
	@pointercancel="cancelLongPress"
	@pointerenter="onCardPointerEnter"
	@pointerleave="onCardPointerLeave"
	@click.capture="onCardClick"
	@contextmenu="onContextMenu"
	@keydown.self.enter.prevent="toggleInner"
	@keydown.self.space.prevent="toggleInner"
>
	<header class="say-header">
		<NuxtImg class="say-avatar" :src="appConfig.author.avatar" :alt="appConfig.author.name" />

		<div class="say-meta">
			<strong class="say-author">{{ appConfig.author.name }}</strong>
			<div class="say-subline">
				<UtilDate v-if="item.date" :date="item.date" icon="ph:clock-countdown-bold" />
				<span v-if="item.location" class="say-location">
					<Icon name="ph:map-pin-bold" />
					{{ item.location }}
				</span>
			</div>
		</div>
	</header>

	<div class="say-main-frame">
		<Transition name="say-switch">
			<div :key="activeSide" class="say-main">
				<h2 v-if="activeTitle" class="say-title">
					{{ activeTitle }}
				</h2>

				<p v-if="activeSide === 'inner' && hasActiveBody" class="say-content">
					{{ innerBody }}
				</p>
				<ContentRenderer
					v-else-if="hasActiveBody"
					class="say-content"
					:value="item"
					tag="div"
				/>

				<div
					v-if="activeImages.length"
					class="say-images"
					:class="{
						'say-images-single': activeImages.length === 1,
						'say-images-pair': activeImages.length === 2,
					}"
				>
					<template v-for="(image, imageIndex) in activeImages" :key="`${activeSide}-${image}`">
						<button
							type="button"
							class="say-image-link"
							:aria-label="`预览图片：${activeTitle || image}`"
							:popovertarget="`say-preview-${index || 0}-${activeSide}-${imageIndex}`"
							aria-haspopup="dialog"
						>
							<NuxtImg class="say-image" :src="image" :alt="activeTitle" loading="lazy" />
						</button>

						<figure
							:id="`say-preview-${index || 0}-${activeSide}-${imageIndex}`"
							class="say-lightbox"
							popover="auto"
							role="dialog"
							:aria-label="`图片预览：${activeTitle || image}`"
						>
							<button
								type="button"
								class="say-lightbox-scrim"
								:popovertarget="`say-preview-${index || 0}-${activeSide}-${imageIndex}`"
								popovertargetaction="hide"
								aria-label="关闭图片预览"
							/>
							<img :src="image" :alt="activeTitle || '说说图片'">
							<figcaption v-if="activeTitle">
								{{ activeTitle }}
							</figcaption>
							<button
								type="button"
								class="say-lightbox-close"
								:popovertarget="`say-preview-${index || 0}-${activeSide}-${imageIndex}`"
								popovertargetaction="hide"
								aria-label="关闭图片预览"
							>
								<Icon name="ph:x-bold" />
							</button>
						</figure>
					</template>
				</div>
			</div>
		</Transition>
	</div>

	<footer v-if="item.tags?.length" class="say-tags">
		<span v-for="tag in item.tags" :key="tag" class="say-tag">
			{{ tag }}
		</span>
	</footer>
</article>
</template>

<style lang="scss" scoped>
.say-card {
	display: grid;
	gap: 0.8rem;
	position: relative;
	margin: 1rem 0;
	padding: 1rem 1.1rem 1rem 1.35rem;
	border: 1px solid var(--c-border);
	border-radius: 0.5rem;
	box-shadow: 0 0.1em 0.2em var(--ld-shadow);
	background-color: var(--ld-bg-card);
	color: var(--c-text);
	transition: transform 0.2s, box-shadow 0.2s, border-color 0.2s, background-color 0.35s, color 0.35s;
	animation: float-in 0.2s var(--delay) backwards;

	&:hover,
	&:focus-within {
		box-shadow: 0 0.5em 1em var(--ld-shadow);
		transform: translateY(-2px);
	}

	&.has-inner {
		cursor: pointer;
		touch-action: manipulation;
		user-select: none;

		&:hover,
		&:focus-visible,
		&:focus-within {
			border-color: var(--c-primary-soft);
			background-color: color-mix(in srgb, var(--ld-bg-card), #000 7%);
		}
	}

	&.is-inner-pressing {
		border-color: color-mix(in srgb, var(--c-primary), var(--c-border) 35%);
		box-shadow: 0 0.5em 1.15em var(--ld-shadow), 0 0 0 0.18rem var(--c-primary-soft);
		transform: translateY(-2px) scale(0.996);
		animation: inner-press-build 0.62s cubic-bezier(0.2, 0, 0.2, 1) forwards;

		&::before {
			background-color: var(--c-primary);
		}
	}

	&.is-inner {
		--inner-red: #FF4A57;
		--inner-red-soft: #FF314D26;
		--c-text: hsl(var(--hue-theme) 0% 100%);
		--c-text-1: hsl(var(--hue-theme) 0% 92%);
		--c-text-2: hsl(var(--hue-theme) 0% 74%);
		--c-text-3: hsl(var(--hue-theme) 0% 55%);
		--c-bg-1: hsl(var(--hue-theme) 10% 10%);
		--c-bg-2: hsl(var(--hue-theme) 10% 14%);
		--c-bg-3: hsl(var(--hue-theme) 10% 18%);
		--c-bg-soft: hsl(var(--hue-theme) 100% 95% / 15%);
		--c-bg-a50: hsl(var(--hue-theme) 10% 10% / 50%);
		--c-primary: hsl(var(--hue-theme) 100% 70%);
		--c-primary-soft: hsl(var(--hue-theme) 100% 60% / 20%);
		--ld-bg-card: var(--c-bg-3);
		--ld-shadow: var(--c-bg-a50);

		border-color: color-mix(in srgb, var(--c-primary-soft), #FFF 12%);
		box-shadow: 0 0.7em 1.3em var(--ld-shadow), inset 0 0 0 1px #FFF1;
		background-color: var(--ld-bg-card);
		color: var(--c-text);

		&::before {
			background-color: var(--c-primary);
		}
	}

	&::before {
		content: "";
		position: absolute;
		top: 1rem;
		bottom: 1rem;
		inset-inline-start: 0.55rem;
		width: 0.16rem;
		border-radius: 999px;
		background-color: var(--c-primary-soft);
		pointer-events: none;
	}
}

.say-card.is-inner-dark {
	--c-text: var(--inner-red);
	--c-text-1: #FF6A73;
	--c-text-2: #EA8A8F;
	--c-text-3: #A95A60;
	--c-primary: var(--inner-red);
	--c-primary-soft: var(--inner-red-soft);

	border-color: color-mix(in srgb, var(--inner-red), var(--c-border) 52%);
	box-shadow: 0 0.7em 1.35em var(--ld-shadow), 0 0 1.4rem #F332;
	color: var(--c-text);
}

.say-main {
	display: grid;
	gap: 0.8rem;
	min-width: 0;
}

.say-main-frame {
	display: grid;
	position: relative;
	min-width: 0;
}

.say-title {
	margin: 0;
	font-size: 1.08rem;
	line-height: 1.35;
	color: var(--c-text-1);
	transform-origin: 12% 60%;
	transition: color 0.35s;
}

.say-header {
	display: flex;
	align-items: center;
	gap: 0.75rem;
	min-width: 0;
}

.say-avatar {
	flex: none;
	width: 2.8rem;
	height: 2.8rem;
	padding: 0.12rem;
	border-radius: 50%;
	box-shadow: 0 0 0 1px var(--c-border);
	background-color: var(--ld-bg-card);
	transition: background-color 0.35s, box-shadow 0.35s;
	object-fit: cover;
}

.say-meta {
	display: grid;
	gap: 0.2rem;
	min-width: 0;
}

.say-author {
	overflow: hidden;
	font-weight: 650;
	white-space: nowrap;
	text-overflow: ellipsis;
	color: var(--c-text-1);
	transition: color 0.35s;
}

.say-subline {
	display: flex;
	flex-wrap: wrap;
	gap: 0.5em 1em;
	font-size: 0.82em;
	color: var(--c-text-2);
	transition: color 0.35s;
}

.say-location {
	display: inline-flex;
	align-items: center;
	gap: 0.2em;
}

.say-content {
	margin: 0;
	font-size: 0.98em;
	line-height: 1.75;
	white-space: pre-wrap;
	transform-origin: 45% 55%;
	transition: color 0.35s;
}

.say-images {
	display: grid;
	grid-template-columns: repeat(3, minmax(0, 1fr));
	gap: 0.4rem;
	max-width: 34rem;
	transform-origin: center;
}

.say-images-single {
	grid-template-columns: minmax(0, 1fr);
	max-width: 24rem;
}

.say-images-pair {
	grid-template-columns: repeat(2, minmax(0, 1fr));
	max-width: 28rem;
}

.say-image-link {
	display: block;
	overflow: hidden;
	width: 100%;
	aspect-ratio: 1;
	padding: 0;
	border: 1px solid var(--c-border);
	border-radius: 0.5rem;
	background-color: var(--c-bg-2);
	font: inherit;
	color: inherit;
	transition: border-color 0.35s, background-color 0.35s, transform 0.2s;
	cursor: zoom-in;

	.say-images-single & {
		aspect-ratio: 4 / 3;
	}

	&:focus-visible {
		outline: 2px solid var(--c-primary-soft);
		outline-offset: 2px;
	}
}

.say-image {
	display: block;
	width: 100%;
	height: 100%;
	transition: filter 0.2s, opacity 0.2s;
	object-fit: cover;

	:hover > &,
	:focus-visible > & {
		filter: saturate(1.04) brightness(1.02);
	}
}

.is-inner {
	.say-title {
		animation: inner-title-shiver 0.92s steps(2, jump-none) infinite;
	}

	.say-content {
		animation: inner-body-shiver 0.98s steps(2, jump-none) infinite;
	}

	.say-image-link {
		animation: inner-image-shiver 0.9s steps(2, jump-none) infinite;

		&:nth-of-type(2n) {
			animation-direction: reverse;
			animation-duration: 1.02s;
		}
	}
}

.say-switch-enter-active,
.say-switch-leave-active {
	transition: opacity 0.32s ease, transform 0.32s ease, filter 0.32s ease;
}

.say-switch-leave-active {
	position: absolute;
	inset: 0;
	width: 100%;
	pointer-events: none;
}

.say-switch-enter-from {
	opacity: 0;
	transform: translateY(0.08rem);
	filter: blur(0.8px);
}

.say-switch-leave-to {
	opacity: 0;
	transform: translateY(-0.08rem);
	filter: blur(1.2px);
}

.say-tags {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: 0.45em;
	font-size: 0.86em;
}

.say-tag {
	display: inline-flex;
	align-items: center;
	padding: 0.16em 0.58em;
	border: 1px solid var(--c-border);
	border-radius: 999px;
	box-shadow: 0 0.08em 0.16em var(--ld-shadow);
	background-color: var(--c-bg-1);
	color: var(--c-text-1);
	transition: transform 0.2s, box-shadow 0.2s, border-color 0.2s, background-color 0.2s, color 0.2s;

	&::before {
		content: "#";
		opacity: 0.7;
		margin-inline-end: 0.08em;
		color: var(--c-text-2);
	}

	&:hover {
		border-color: var(--c-primary-soft);
		box-shadow: 0 0.35em 0.7em var(--ld-shadow);
		background-color: var(--ld-bg-card);
		color: var(--c-text);
		transform: translateY(-2px);

		&::before {
			opacity: 1;
			color: var(--c-primary);
		}
	}
}

.say-lightbox {
	position: fixed;
	inset: 0;
	width: 100vw;
	height: 100vh;
	max-width: none;
	max-height: none;
	margin: 0;
	padding: clamp(1rem, 4vw, 2rem);
	border: 0;
	background-color: #0003;
	backdrop-filter: blur(4px);
	cursor: zoom-out;
	z-index: calc(var(--z-index-popover) + 1);

	&:popover-open {
		display: grid;
		place-items: center;
	}

	&::backdrop {
		background: transparent;
	}

	img {
		display: block;
		position: relative;
		max-width: min(92vw, 72rem);
		max-height: 82vh;
		border-radius: 0.5rem;
		box-shadow: 0 0.5em 1.5em var(--ld-shadow);
		background-color: var(--ld-bg-card);
		cursor: default;
		object-fit: contain;
		z-index: 1;
	}

	figcaption {
		position: relative;
		margin-top: 0.75rem;
		padding: 0.35em 0.75em;
		border: 1px solid #0003;
		border-radius: 0.45rem;
		box-shadow: 0 0.2em 0.5em var(--ld-shadow);
		background-color: #0007;
		backdrop-filter: blur(1rem) saturate(2);
		color: white;
		z-index: 1;
	}
}

.say-lightbox-scrim {
	position: absolute;
	inset: 0;
	cursor: zoom-out;
}

.say-lightbox-close {
	display: inline-grid;
	place-items: center;
	position: absolute;
	top: clamp(1rem, 4vw, 2rem);
	inset-inline-end: clamp(1rem, 4vw, 2rem);
	width: 2.4rem;
	aspect-ratio: 1;
	border: 1px solid #0003;
	border-radius: 0.45rem;
	box-shadow: 0 0.2em 0.5em var(--ld-shadow);
	background-color: #0007;
	backdrop-filter: blur(1rem) saturate(2);
	color: white;
	transition: background-color 0.2s, transform 0.2s;
	cursor: pointer;
	pointer-events: auto;

	&:hover,
	&:focus-visible {
		background-color: #0009;
		transform: translateY(-1px);
	}
}

@keyframes inner-press-build {
	0% {
		transform: translate(0, 0) scale(1);
	}

	18% {
		transform: translate(0.025rem, -0.01rem) scale(0.999);
	}

	36% {
		transform: translate(-0.035rem, 0.018rem) scale(0.998);
	}

	55% {
		transform: translate(0.05rem, -0.026rem) scale(0.997);
	}

	76% {
		transform: translate(-0.065rem, 0.034rem) scale(0.996);
	}

	100% {
		transform: translate(0.08rem, -0.045rem) scale(0.995);
	}
}

@keyframes inner-title-shiver {
	0%, 100% {
		transform: translate(0, 0) rotate(0deg);
	}

	20% {
		transform: translate(0.035rem, -0.02rem) rotate(-0.18deg);
	}

	45% {
		transform: translate(-0.025rem, 0.018rem) rotate(0.16deg);
	}

	70% {
		transform: translate(0.018rem, 0.025rem) rotate(-0.1deg);
	}
}

@keyframes inner-body-shiver {
	0%, 100% {
		transform: translate(0, 0) rotate(0deg);
	}

	24% {
		transform: translate(-0.04rem, 0.026rem) rotate(-0.08deg);
	}

	48% {
		transform: translate(0.048rem, -0.03rem) rotate(0.1deg);
	}

	72% {
		transform: translate(-0.032rem, -0.036rem) rotate(-0.06deg);
	}
}

@keyframes inner-image-shiver {
	0%, 100% {
		transform: translate(0, 0) rotate(0deg);
	}

	18% {
		transform: translate(0.018rem, -0.014rem) rotate(0.08deg);
	}

	43% {
		transform: translate(-0.016rem, 0.012rem) rotate(-0.07deg);
	}

	76% {
		transform: translate(0.012rem, 0.016rem) rotate(0.05deg);
	}
}

@media (prefers-reduced-motion: reduce) {
	.is-inner {
		.say-title,
		.say-content,
		.say-image-link,
		&.is-inner-pressing {
			animation: none;
		}
	}
}

@media (max-width: $breakpoint-phone) {
	.say-card {
		padding: 0.85rem;
	}

	.say-images {
		max-width: none;
	}
}
</style>
