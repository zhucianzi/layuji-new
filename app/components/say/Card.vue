<script setup lang="ts">
interface SayItem {
	path?: string
	title?: string
	date?: string
	body?: unknown
	images?: string[]
	tags?: string[]
	location?: string
}

defineProps<{
	item: SayItem
	index?: number
}>()

const appConfig = useAppConfig()
</script>

<template>
<article class="say-card" :style="getFixedDelay((index || 0) * 0.05)">
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

	<ContentRenderer
		v-if="item.body"
		class="say-content"
		:value="item"
		tag="div"
	/>

	<div
		v-if="item.images?.length"
		class="say-images"
		:class="{
			'say-images-single': item.images.length === 1,
			'say-images-pair': item.images.length === 2,
		}"
	>
		<template v-for="(image, imageIndex) in item.images" :key="image">
			<button
				type="button"
				class="say-image-link"
				:aria-label="`预览图片：${item.title || image}`"
				:popovertarget="`say-preview-${index || 0}-${imageIndex}`"
				aria-haspopup="dialog"
			>
				<NuxtImg class="say-image" :src="image" :alt="item.title" loading="lazy" />
			</button>

			<figure
				:id="`say-preview-${index || 0}-${imageIndex}`"
				class="say-lightbox"
				popover="auto"
				role="dialog"
				:aria-label="`图片预览：${item.title || image}`"
			>
				<button
					type="button"
					class="say-lightbox-scrim"
					:popovertarget="`say-preview-${index || 0}-${imageIndex}`"
					popovertargetaction="hide"
					aria-label="关闭图片预览"
				/>
				<img :src="image" :alt="item.title || '说说图片'">
				<figcaption v-if="item.title">
					{{ item.title }}
				</figcaption>
				<button
					type="button"
					class="say-lightbox-close"
					:popovertarget="`say-preview-${index || 0}-${imageIndex}`"
					popovertargetaction="hide"
					aria-label="关闭图片预览"
				>
					<Icon name="ph:x-bold" />
				</button>
			</figure>
		</template>
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
	transition: transform 0.2s, box-shadow 0.2s, border-color 0.2s, background-color 0.2s;
	animation: float-in 0.2s var(--delay) backwards;

	&:hover,
	&:focus-within {
		box-shadow: 0 0.5em 1em var(--ld-shadow);
		transform: translateY(-2px);
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
}

.say-subline {
	display: flex;
	flex-wrap: wrap;
	gap: 0.5em 1em;
	font-size: 0.82em;
	color: var(--c-text-2);
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
}

.say-images {
	display: grid;
	grid-template-columns: repeat(3, minmax(0, 1fr));
	gap: 0.4rem;
	max-width: 34rem;
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

@media (max-width: $breakpoint-phone) {
	.say-card {
		padding: 0.85rem;
	}

	.say-images {
		max-width: none;
	}
}
</style>
