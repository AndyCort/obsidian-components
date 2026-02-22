import { App, Editor, FuzzySuggestModal } from 'obsidian';
import type { ComponentDefinition } from './types';

/**
 * A fuzzy-search modal that lets the user pick a component and insert it
 * at the cursor position in the active editor.
 */
export class ComponentPickerModal extends FuzzySuggestModal<ComponentDefinition> {
    private components: ComponentDefinition[];
    private editor: Editor;

    constructor(app: App, components: ComponentDefinition[], editor: Editor) {
        super(app);
        this.components = components;
        this.editor = editor;
        this.setPlaceholder('搜索组件…');
    }

    getItems(): ComponentDefinition[] {
        return this.components;
    }

    getItemText(item: ComponentDefinition): string {
        return item.name;
    }

    renderSuggestion(item: { item: ComponentDefinition }, el: HTMLElement): void {
        const def = item.item;
        const container = el.createDiv({ cls: 'oc-picker-item' });

        // Top row: name + description
        const row = container.createDiv({ cls: 'oc-picker-row' });
        row.createEl('span', { text: def.name, cls: 'oc-picker-name' });
        if (def.description) {
            row.createEl('span', { text: def.description, cls: 'oc-picker-desc' });
        }

        // Props row
        const propsKeys = Object.keys(def.props);
        if (propsKeys.length > 0) {
            const propsRow = container.createDiv({ cls: 'oc-picker-props' });
            for (const key of propsKeys) {
                propsRow.createEl('span', { text: key, cls: 'oc-picker-prop-tag' });
            }
        }
    }

    onChooseItem(item: ComponentDefinition): void {
        const propsStr = Object.entries(item.props)
            .map(([k, v]) => `${k}="${v}"`)
            .join(', ');

        const hasProps = Object.keys(item.props).length > 0;
        const invocation = hasProps
            ? `${item.name}(${propsStr})`
            : item.name;

        const snippet = `\`\`\`component\n${invocation}\n\`\`\``;
        this.editor.replaceSelection(snippet);
    }
}
