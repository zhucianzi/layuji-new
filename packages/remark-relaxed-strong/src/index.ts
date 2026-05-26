import type { Parent, Root, RootContent, Strong, Text } from 'mdast'

const strongDelimiter = '**'
const punctuationEdge = /^[\p{P}\p{S}]|[\p{P}\p{S}]$/u

export default function remarkRelaxedStrong() {
	return (tree: Root) => {
		transformChildren(tree)
	}
}

function transformChildren(parent: Parent | Root) {
	for (let index = 0; index < parent.children.length; index++) {
		const child = parent.children[index] as RootContent

		if (child.type === 'text') {
			const replacement = splitRelaxedStrong(child)
			if (replacement.length > 1 || replacement[0] !== child) {
				parent.children.splice(index, 1, ...replacement)
				index += replacement.length - 1
			}
			continue
		}

		if ('children' in child)
			transformChildren(child)
	}
}

function splitRelaxedStrong(node: Text): RootContent[] {
	const result: RootContent[] = []
	let cursor = 0

	while (cursor < node.value.length) {
		const opener = node.value.indexOf(strongDelimiter, cursor)
		if (opener === -1)
			break

		const closer = node.value.indexOf(strongDelimiter, opener + strongDelimiter.length)
		if (closer === -1)
			break

		const value = node.value.slice(opener + strongDelimiter.length, closer)
		if (!value || /^\s|\s$/u.test(value) || !punctuationEdge.test(value)) {
			cursor = closer + strongDelimiter.length
			continue
		}

		if (opener > cursor)
			result.push(text(node.value.slice(cursor, opener)))

		result.push({
			type: 'strong',
			children: [text(value) as Text],
		} satisfies Strong)

		cursor = closer + strongDelimiter.length
	}

	if (result.length === 0)
		return [node]

	if (cursor < node.value.length)
		result.push(text(node.value.slice(cursor)))

	return result
}

function text(value: string): Text {
	return {
		type: 'text',
		value,
	}
}
