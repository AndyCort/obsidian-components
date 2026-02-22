import { Notice, Plugin, TFile, TFolder } from 'obsidian';
import { ComponentDefinition, ComponentsPluginSettings, DEFAULT_SETTINGS } from './types';
import { parseCodeBlock, parseComponentDefinition } from './parser';
import { renderComponent, renderError } from './renderer';
import { ComponentsSettingTab } from './settings';

export default class ComponentsPlugin extends Plugin {
    settings: ComponentsPluginSettings;
    /** Map of component name → definition */
    components: Map<string, ComponentDefinition> = new Map();

    async onload() {
        await this.loadSettings();

        // Load all component definitions from the components folder
        this.app.workspace.onLayoutReady(async () => {
            await this.loadComponentDefinitions();
        });

        // Register the 'component' code block processor
        this.registerMarkdownCodeBlockProcessor('component', (source, el, ctx) => {
            this.processComponentBlock(source, el);
        });

        // Add command: reload components
        this.addCommand({
            id: 'reload-components',
            name: '重新加载所有组件',
            callback: async () => {
                await this.loadComponentDefinitions();
                new Notice(`已重新加载 ${this.components.size} 个组件`);
            },
        });

        // Add command: insert component
        this.addCommand({
            id: 'insert-component',
            name: '插入组件',
            editorCallback: (editor) => {
                const names = [...this.components.keys()];
                if (names.length === 0) {
                    new Notice('暂无可用组件。请先在组件文件夹中创建组件定义。');
                    return;
                }
                // Insert a component template at cursor
                const firstComponent = names[0] ?? 'component_name';
                const def = this.components.get(firstComponent);
                let propsStr = '';
                if (def && Object.keys(def.props).length > 0) {
                    propsStr = Object.entries(def.props)
                        .map(([k, v]) => `${k}="${v}"`)
                        .join(', ');
                }
                const snippet = `\`\`\`component\n${firstComponent}(${propsStr})\n\`\`\``;
                editor.replaceSelection(snippet);
            },
        });

        // Add ribbon icon
        this.addRibbonIcon('component', 'Obsidian Components', async () => {
            await this.loadComponentDefinitions();
            new Notice(`已加载 ${this.components.size} 个组件`);
        });

        // Watch for file changes in the vault to auto-refresh components
        this.registerEvent(
            this.app.vault.on('modify', async (file) => {
                if (this.settings.liveReload && file instanceof TFile && this.isComponentFile(file)) {
                    if (this.settings.debugMode) console.log(`[obsidian-components] Live reload: ${file.path}`);
                    await this.loadSingleComponent(file);
                }
            })
        );

        this.registerEvent(
            this.app.vault.on('create', async (file) => {
                if (this.settings.liveReload && file instanceof TFile && this.isComponentFile(file)) {
                    if (this.settings.debugMode) console.log(`[obsidian-components] New component: ${file.path}`);
                    await this.loadSingleComponent(file);
                }
            })
        );

        this.registerEvent(
            this.app.vault.on('delete', (file) => {
                if (file instanceof TFile && this.isComponentFile(file)) {
                    const name = file.basename;
                    this.components.delete(name);
                    if (this.settings.debugMode) console.log(`[obsidian-components] Deleted component: ${name}`);
                }
            })
        );

        this.registerEvent(
            this.app.vault.on('rename', async (file, oldPath) => {
                if (file instanceof TFile) {
                    const oldName = oldPath.split('/').pop()?.replace(/\.md$/i, '') ?? '';
                    if (oldName) {
                        this.components.delete(oldName);
                    }
                    if (this.isComponentFile(file)) {
                        await this.loadSingleComponent(file);
                    }
                }
            })
        );

        // Add settings tab
        this.addSettingTab(new ComponentsSettingTab(this.app, this));
    }

    onunload() {
        this.components.clear();
    }

    /**
     * Load all component definitions from the configured folder.
     */
    async loadComponentDefinitions(): Promise<void> {
        this.components.clear();

        const folder = this.app.vault.getAbstractFileByPath(
            this.settings.componentsFolder
        );

        if (!folder || !(folder instanceof TFolder)) {
            console.log(
                `[obsidian-components] Components folder "${this.settings.componentsFolder}" not found. Will create it when components are saved.`
            );
            return;
        }

        const files = folder.children.filter(
            (f): f is TFile => f instanceof TFile && f.extension === 'md'
        );

        for (const file of files) {
            await this.loadSingleComponent(file);
        }

        console.log(
            `[obsidian-components] Loaded ${this.components.size} component(s): ${[...this.components.keys()].join(', ')}`
        );
    }

    /**
     * Load a single component from a file.
     */
    async loadSingleComponent(file: TFile): Promise<void> {
        try {
            const content = await this.app.vault.read(file);
            const def = parseComponentDefinition(content, file.path);
            if (def) {
                this.components.set(def.name, def);
            }
        } catch (e) {
            console.error(
                `[obsidian-components] Failed to load component from ${file.path}:`,
                e
            );
        }
    }

    /**
     * Process a ```component code block.
     */
    processComponentBlock(source: string, container: HTMLElement): void {
        const invocations = parseCodeBlock(source);

        if (invocations.length === 0) {
            renderError(container, '无法解析组件调用。格式: component_name(prop="value")');
            return;
        }

        for (const invocation of invocations) {
            const definition = this.components.get(invocation.name);

            if (!definition) {
                const availableNames = [...this.components.keys()];
                const suggestion = availableNames.length > 0
                    ? `可用组件: ${availableNames.join(', ')}`
                    : `请先在 "${this.settings.componentsFolder}" 文件夹中创建组件定义`;
                renderError(
                    container,
                    `未找到组件 "${invocation.name}"。${suggestion}`
                );
                continue;
            }

            if (this.settings.debugMode) {
                console.log(`[obsidian-components] Rendering: ${invocation.name}`, invocation.props);
            }

            const componentEl = container.createDiv();
            renderComponent(componentEl, definition, invocation.props, {
                enableScripts: this.settings.enableScripts,
                displayMode: this.settings.displayMode,
            });
        }
    }

    /**
     * Check if a file is inside the components folder.
     */
    isComponentFile(file: TFile): boolean {
        return (
            file.extension === 'md' &&
            file.path.startsWith(this.settings.componentsFolder + '/')
        );
    }

    // ─── Settings helpers ───────────────────────────────────────────

    async loadSettings(): Promise<void> {
        this.settings = Object.assign(
            {},
            DEFAULT_SETTINGS,
            await this.loadData() as Partial<ComponentsPluginSettings>
        );
    }

    async saveSettings(): Promise<void> {
        await this.saveData(this.settings);
    }

    getComponentCount(): number {
        return this.components.size;
    }

    getComponentNames(): string[] {
        return [...this.components.keys()];
    }

    getComponentDefinition(name: string): ComponentDefinition | undefined {
        return this.components.get(name);
    }
}
