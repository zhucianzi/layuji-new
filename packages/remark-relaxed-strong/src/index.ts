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

		const siblingDrift = repairSiblingStrongDrift(parent, index)
		if (siblingDrift) {
			parent.children.splice(index, 3, ...siblingDrift)
			index--
			continue
		}

		if (child.type === 'strong') {
			const nestedDrift = repairNestedStrongDrift(child)
			if (nestedDrift) {
				parent.children.splice(index, 1, ...nestedDrift)
				index--
				continue
			}
		}

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

function repairNestedStrongDrift(node: Strong): RootContent[] | undefined {
	const [before, middle, after] = node.children
	if (
		node.children.length !== 3
		|| before?.type !== 'text'
		|| middle?.type !== 'strong'
		|| after?.type !== 'text'
		|| middle.children.length !== 1
		|| middle.children[0]?.type !== 'text'
	)
		return

	return [
		strong(before.value),
		text(middle.children[0].value),
		strong(after.value),
	]
}

function repairSiblingStrongDrift(parent: Parent | Root, index: number): RootContent[] | undefined {
	const before = parent.children[index] as RootContent | undefined
	const middle = parent.children[index + 1] as RootContent | undefined
	const after = parent.children[index + 2] as RootContent | undefined

	if (
		before?.type !== 'text'
		|| middle?.type !== 'strong'
		|| after?.type !== 'text'
		|| middle.children.length !== 1
		|| middle.children[0]?.type !== 'text'
	)
		return

	const opener = before.value.lastIndexOf(strongDelimiter)
	const closer = after.value.indexOf(strongDelimiter)
	if (opener === -1 || closer === -1)
		return

	const prefix = before.value.slice(0, opener)
	const firstStrong = before.value.slice(opener + strongDelimiter.length)
	const secondStrong = after.value.slice(0, closer)
	const suffix = after.value.slice(closer + strongDelimiter.length)
	if (!firstStrong || !secondStrong)
		return

	return [
		...(prefix ? [text(prefix)] : []),
		strong(firstStrong),
		text(middle.children[0].value),
		strong(secondStrong),
		...(suffix ? [text(suffix)] : []),
	]
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

function strong(value: string): Strong {
	return {
		type: 'strong',
		children: [text(value)],
	}
}
