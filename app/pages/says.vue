<script setup lang="ts">
import { alphabetical } from 'radash'

const appConfig = useAppConfig()

useSeoMeta({
	title: '说说',
	description: `${appConfig.title}的短文字和图片动态。`,
	ogImage: appConfig.author.avatar,
})

const layoutStore = useLayoutStore()
layoutStore.setAside(['blog-stats', 'blog-tech'])

const { data: listRaw } = await useAsyncData('says', () => queryCollection('content')
	.where('path', 'LIKE', '/says/%')
	.all(), { default: () => [] })

const list = computed(() => alphabetical(listRaw.value, item => item.date || '', 'desc'))
</script>

<template>
<BlogHeader class="mobile-only" to="/" tag="h1" />

<main class="says-page proper-height">
	<header class="says-title">
		<div>
			<h1 class="text-creative">
				说说
			</h1>
			<p>短文字、图片和一些轻一点的记录。</p>
		</div>

		<span class="says-count">
			<Icon name="ph:chat-teardrop-text-bold" />
			{{ list.length }} 条
		</span>
	</header>

	<TransitionGroup tag="menu" class="says-feed" name="float-in">
		<SayCard
			v-for="item, index in list"
			:key="item.path"
			:item
			:index
		/>
	</TransitionGroup>
</main>
</template>

<style lang="scss" scoped>
.says-page {
	max-width: 52rem;
	margin: 1rem auto;
	padding-inline: 1rem;
}

.says-title {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 1rem;
	margin: 0 0.25rem 1.2rem;
	color: var(--c-text-2);

	h1 {
		margin: 0;
		font-size: clamp(1.6rem, 6vw, 2.4rem);
		color: var(--c-text);
	}

	p {
		margin-top: 0.2rem;
		font-size: 0.92em;
	}
}

.says-count {
	display: inline-flex;
	flex: none;
	align-items: center;
	gap: 0.35em;
	padding: 0.35em 0.65em;
	border-radius: 999px;
	background-color: var(--c-primary-soft);
	font-size: 0.86em;
	color: var(--c-primary);
}

.says-feed {
	position: relative;
	max-width: 44rem;
	margin-inline: auto;

	&::before {
		content: "";
		position: absolute;
		top: 0.5rem;
		bottom: 0.5rem;
		inset-inline-start: -1rem;
		width: 1px;
		background-image: linear-gradient(transparent, var(--c-border) 8%, var(--c-border) 92%, transparent);
	}
}

@media (max-width: $breakpoint-phone) {
	.says-page {
		padding-inline: 0.75rem;
	}

	.says-title {
		flex-direction: column;
		align-items: flex-start;
	}

	.says-feed::before {
		display: none;
	}
}
</style>
