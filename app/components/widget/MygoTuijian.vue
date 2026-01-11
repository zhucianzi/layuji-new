<template>
<BlogWidget
	card
	dim
	title="灵感菇"
	bg-img="https://lain.bgm.tv/pic/cover/l/e7/a7/428735_1v11n.jpg"
	bg-right
>
	<div class="title text-creative">
		迷途之子
	</div>

	<ProseA href="https://www.bilibili.com/bangumi/play/ss73077">
		立即观看
	</ProseA>
</BlogWidget>
</template>

<style lang="scss" scoped>
.title {
	background-clip: text;
	background-image: linear-gradient(60deg, var(--c-accent) -30%, var(--c-primary), var(--c-text-1));
	background-position: 100% 0;
	background-size: 200%;
	font-size: 1.2em;
	font-weight: 800;
	letter-spacing: 0.05em;
	color: transparent;
	transition: background-position 0.2s;

	.blog-widget:hover & {
		background-position: 0 0;
	}
}

.tip {
	font-size: 0.9em;
	line-height: 2;
}

:deep(.bg-img).bg-img.bg-img {
	opacity: 0.8;
}
</style>
