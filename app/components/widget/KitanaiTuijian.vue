<template>
<BlogWidget
	card
	dim
	title=""
	bg-img="https://lain.bgm.tv/pic/cover/l/9c/0d/294899_lVg6X.jpg"
	bg-right
>
	<div class="title text-creative">
		污秽不堪的你最可爱了
	</div>

	<div>
		双死就是HE！
	</div>
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
	object-position: top;
}
</style>
