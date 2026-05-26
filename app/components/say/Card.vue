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
<article class="say-card card" :style="getFixedDelay((index || 0) * 0.05)">
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
		<a
			v-for="image in item.images"
			:key="image"
			class="say-image-link"
			:href="image"
			target="_blank"
			rel="noopener noreferrer"
		>
			<NuxtImg class="say-image" :src="image" :alt="item.title" loading="lazy" />
		</a>
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
	--say-rail-color: var(--c-primary-soft);

	display: grid;
	gap: 0.8rem;
	position: relative;
	margin: 1rem 0;
	padding: 1rem 1.1rem;
	border: 1px solid transparent;
	border-radius: 0.8rem;
	color: var(--c-text);
	animation: float-in 0.2s var(--delay) backwards;

	&:hover,
	&:focus-within {
		border-color: var(--c-border);
		background-color: var(--ld-bg-card);
	}

	&::after {
		content: "";
		position: absolute;
		opacity: 0.35;
		top: 1rem;
		bottom: 1rem;
		inset-inline-start: 0;
		width: 0.18rem;
		border-radius: 999px;
		background-image: linear-gradient(var(--c-primary), transparent);
		transition: opacity 0.2s;
	}

	&:hover::after,
	&:focus-within::after {
		opacity: 0.8;
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
	box-shadow: 0 0 0 1px var(--c-border), 0 0.25rem 0.8rem var(--ld-shadow);
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
	overflow: hidden;
	aspect-ratio: 1;
	border: 1px solid var(--c-border);
	border-radius: 0.55rem;
	box-shadow: 0 0.15rem 0.4rem var(--ld-shadow);
	background-color: var(--c-bg-2);

	.say-images-single & {
		aspect-ratio: 4 / 3;
	}
}

.say-image {
	width: 100%;
	height: 100%;
	transition: transform 0.2s, filter 0.2s, opacity 0.2s;
	object-fit: cover;

	:hover > &,
	:focus-visible > & {
		transform: scale(1.03);
		filter: brightness(1.04);
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
	padding: 0.16em 0.58em;
	border: 1px solid var(--c-border);
	border-radius: 999px;
	box-shadow: 0 0.12rem 0.35rem var(--ld-shadow);
	background-color: var(--ld-bg-card);
	color: var(--c-text-1);
	transition: all 0.2s;

	&::before {
		content: "#";
		opacity: 0.7;
		margin-inline-end: 0.08em;
		color: var(--c-text-2);
	}

	&:hover {
		border-color: var(--c-text-3);
		box-shadow: 0 0.3rem 0.7rem var(--ld-shadow);
		background-color: var(--c-bg-2);
		transform: translateY(-1px);

		&::before {
			opacity: 0.85;
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
