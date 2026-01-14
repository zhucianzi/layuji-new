// 友链检测 CLI 需要使用显式导入和相对路径
import type { FeedGroup } from '../app/types/feed'
import { getGhAvatar } from './utils/img'

export default [
	// #region Clarity
	{
		name: '好朋友们',
		desc: '总之就是很厉害。',
		// @keep-sorted { "keys": ["date"] }
		entries: [
			{
				author: 'KazariEX',
				sitenick: '微光档案',
				desc: '故事就是只为你一个人而存在的世界',
				link: 'https://archive.bikari.top/',
				feed: 'https://archive.bikari.top/feed',
				icon: 'https://archive.bikari.top/image/favicon.svg',
				avatar: getGhAvatar('KazariEX'),
				archs: ['Nuxt', 'Netlify'],
				date: '2024-03-14',
				comment: '是老老老朋友，帮助我搭建、维护、更新博客，难以计数。',
			},
			{
				author: '纸鹿本鹿',
				sitenick: '摸鱼处',
				desc: '纸鹿至麓不知路，支炉制露不止漉',
				link: 'https://blog.zhilu.site/',
				feed: 'https://blog.zhilu.site/atom.xml',
				icon: 'https://www.zhilu.site/icon.png',
				avatar: getGhAvatar('L33Z22L11'),
				archs: ['Nuxt', 'Vercel'],
				date: '2026-01-11',
				comment: '这个主题的作者，提供了很慷慨的技术指导。',
			},
		],
	},
	// #endregion
] satisfies FeedGroup[]
