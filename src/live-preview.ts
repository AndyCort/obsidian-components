import {
    Decoration,
    DecorationSet,
    EditorView,
    ViewPlugin,
    ViewUpdate,
    WidgetType,
} from '@codemirror/view';
import { Range } from '@codemirror/state';
import { syntaxTree } from '@codemirror/language';
import { renderComponent } from './renderer';
import type { ComponentDefinition } from './types';

/**
 * A WidgetType that renders a component inline in Live Preview mode.
 */
class InlineComponentWidget extends WidgetType {
    constructor(
        private definition: ComponentDefinition,
        private props: Record<string, string>,
        private enableScripts: boolean
    ) {
        super();
    }

    eq(other: InlineComponentWidget): boolean {
        return (
            this.definition.name === other.definition.name &&
            JSON.stringify(this.props) === JSON.stringify(other.props)
        );
    }

    toDOM(): HTMLElement {
        const span = document.createElement('span');
        span.className = 'oc-inline-wrapper';
        renderComponent(span, this.definition, this.props, {
            enableScripts: this.enableScripts,
            displayMode: 'inline',
        });
        return span;
    }
}

/**
 * Parse a simple invocation string like `badge(text="HOT", color="#ef4444")`
 * Returns { name, props } or null.
 */
function parseInvocation(
    str: string
): { name: string; props: Record<string, string> } | null {
    const trimmed = str.trim();
    if (!trimmed) return null;

    const match = trimmed.match(/^([a-zA-Z_][\w-]*)\s*(?:\(([\s\S]*)\))?$/);
    if (!match) return null;

    const name = match[1] ?? '';
    const argsStr = match[2] ?? '';
    const props: Record<string, string> = {};

    if (argsStr.trim()) {
        const argRegex = /(\w[\w-]*)\s*=\s*(?:"([^"]*?)"|'([^']*?)')/g;
        let argMatch;
        while ((argMatch = argRegex.exec(argsStr)) !== null) {
            const key = argMatch[1];
            const value = argMatch[2] ?? argMatch[3] ?? '';
            if (key) {
                props[key] = value;
            }
        }
    }

    return { name, props };
}

/**
 * Create a CM6 ViewPlugin that replaces `c:component(props)` inline code
 * with rendered component widgets in Live Preview mode.
 */
export function createInlineComponentPlugin(
    getComponents: () => Map<string, ComponentDefinition>,
    getEnableScripts: () => boolean
) {
    return ViewPlugin.fromClass(
        class {
            decorations: DecorationSet;

            constructor(view: EditorView) {
                this.decorations = this.buildDecorations(view);
            }

            update(update: ViewUpdate) {
                if (update.docChanged || update.viewportChanged) {
                    this.decorations = this.buildDecorations(update.view);
                }
            }

            buildDecorations(view: EditorView): DecorationSet {
                const decorations: Range<Decoration>[] = [];
                const components = getComponents();

                if (components.size === 0) return Decoration.none;

                for (const { from, to } of view.visibleRanges) {
                    syntaxTree(view.state).iterate({
                        from,
                        to,
                        enter: (node) => {
                            // Look for inline code nodes
                            if (
                                node.name !== 'InlineCode' &&
                                node.name !== 'inline-code'
                            ) {
                                return;
                            }

                            const text = view.state.doc.sliceString(
                                node.from,
                                node.to
                            );

                            // Remove backticks to get raw content
                            const content = text.replace(/^`+|`+$/g, '').trim();

                            // Must start with "c:"
                            if (!content.startsWith('c:')) return;

                            const invocationStr = content.slice(2).trim();
                            const parsed = parseInvocation(invocationStr);
                            if (!parsed) return;

                            const definition = components.get(parsed.name);
                            if (!definition) return;

                            const widget = new InlineComponentWidget(
                                definition,
                                parsed.props,
                                getEnableScripts()
                            );

                            decorations.push(
                                Decoration.replace({
                                    widget,
                                }).range(node.from, node.to)
                            );
                        },
                    });
                }

                return Decoration.set(decorations, true);
            }
        },
        {
            decorations: (v) => v.decorations,
        }
    );
}
