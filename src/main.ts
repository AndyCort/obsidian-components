import { Editor, MarkdownView, Notice, Plugin, TFile, TFolder } from 'obsidian';
import { ComponentDefinition, ComponentsPluginSettings, DEFAULT_SETTINGS } from './types';
import { parseCodeBlock, parseComponentDefinition, parseComponentInvocation } from './parser';
import { renderComponent, renderError } from './renderer';
import { ComponentsSettingTab } from './settings';
import { ComponentPickerModal } from './component-picker';
import { createInlineComponentPlugin } from './live-preview';


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

        // Register inline component post-processor (Reading mode)
        // Syntax: `c:component_name(prop="value")` (inline code with c: prefix)
        this.registerMarkdownPostProcessor((el, ctx) => {
            this.processInlineComponents(el);
        });

        // Register CM6 extension for Live Preview mode
        this.registerEditorExtension(
            createInlineComponentPlugin(
                () => this.components,
                () => this.settings.enableScripts
            )
        );

        // ─── Commands ───────────────────────────────────────────

        // Reload components
        this.addCommand({
            id: 'reload-components',
            name: '重新加载所有组件',
            callback: async () => {
                await this.loadComponentDefinitions();
                new Notice(`已重新加载 ${this.components.size} 个组件`);
            },
        });

        // Insert component via picker modal
        this.addCommand({
            id: 'insert-component',
            name: '插入组件',
            editorCallback: (editor: Editor, view: MarkdownView) => {
                const defs = [...this.components.values()];
                if (defs.length === 0) {
                    new Notice('暂无可用组件。请先在组件文件夹中创建组件定义。');
                    return;
                }
                new ComponentPickerModal(this.app, defs, editor).open();
            },
        });

        // Open components folder
        this.addCommand({
            id: 'open-components-folder',
            name: '打开组件文件夹',
            callback: async () => {
                const folder = this.app.vault.getAbstractFileByPath(
                    this.settings.componentsFolder
                );
                if (folder && folder instanceof TFolder) {
                    // Reveal in file explorer
                    const leaf = this.app.workspace.getLeaf(false);
                    if (leaf) {
                        await leaf.openFile(
                            folder.children.find((f): f is TFile => f instanceof TFile) as TFile
                        );
                    }
                } else {
                    new Notice(`组件文件夹 "${this.settings.componentsFolder}" 不存在`);
                }
            },
        });

        // ─── Ribbon Icon ────────────────────────────────────────

        this.addRibbonIcon('blocks', 'Components: 插入组件', () => {
            const view = this.app.workspace.getActiveViewOfType(MarkdownView);
            if (view) {
                const defs = [...this.components.values()];
                if (defs.length === 0) {
                    new Notice('暂无可用组件');
                    return;
                }
                new ComponentPickerModal(this.app, defs, view.editor).open();
            } else {
                new Notice('请先打开一个笔记');
            }
        });

        // ─── File Watchers ──────────────────────────────────────

        this.registerEvent(
            this.app.vault.on('modify', async (file) => {
                if (this.settings.liveReload && file instanceof TFile && this.isComponentFile(file)) {
                    this.debug(`Live reload: ${file.path}`);
                    await this.loadSingleComponent(file);
                }
            })
        );

        this.registerEvent(
            this.app.vault.on('create', async (file) => {
                if (this.settings.liveReload && file instanceof TFile && this.isComponentFile(file)) {
                    this.debug(`New component: ${file.path}`);
                    await this.loadSingleComponent(file);
                }
            })
        );

        this.registerEvent(
            this.app.vault.on('delete', (file) => {
                if (file instanceof TFile && this.isComponentFile(file)) {
                    const name = file.basename;
                    this.components.delete(name);
                    this.debug(`Deleted component: ${name}`);
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

        // ─── Settings Tab ───────────────────────────────────────

        this.addSettingTab(new ComponentsSettingTab(this.app, this));
    }

    onunload() {
        this.components.clear();
    }


    /**
     * Load all component definitions, recursively scanning subfolders.
     */
    async loadComponentDefinitions(): Promise<void> {
        this.components.clear();

        const folder = this.app.vault.getAbstractFileByPath(
            this.settings.componentsFolder
        );

        if (!folder || !(folder instanceof TFolder)) {
            this.debug(`Components folder "${this.settings.componentsFolder}" not found.`);
            return;
        }

        await this.loadComponentsFromFolder(folder);

        this.debug(
            `Loaded ${this.components.size} component(s): ${[...this.components.keys()].join(', ')}`
        );
    }

    /**
     * Recursively load components from a folder and its subfolders.
     */
    private async loadComponentsFromFolder(folder: TFolder): Promise<void> {
        for (const child of folder.children) {
            if (child instanceof TFile && child.extension === 'md') {
                await this.loadSingleComponent(child);
            } else if (child instanceof TFolder) {
                await this.loadComponentsFromFolder(child);
            }
        }
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
                this.debug(`Loaded: ${def.name} from ${file.path}`);
            } else {
                console.warn(
                    `[obsidian-components] ⚠️ Skipped "${file.path}": missing frontmatter (---) or template. Content starts with: "${content.slice(0, 50)}..."`
                );
            }
        } catch (e) {
            console.error(
                `[obsidian-components] Failed to load component from ${file.path}:`,
                e
            );
        }
    }

    // ─── Rendering ──────────────────────────────────────────────────

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

            this.debug(`Rendering: ${invocation.name}`, invocation.props);

            const componentEl = container.createDiv();
            renderComponent(componentEl, definition, invocation.props, {
                enableScripts: this.settings.enableScripts,
                displayMode: this.settings.displayMode,
            });
        }
    }

    /**
     * Process inline components within rendered markdown.
     * Finds <code> elements with `c:` prefix and replaces them with rendered components.
     * Syntax: `c:component_name(prop="value")`
     */
    processInlineComponents(el: HTMLElement): void {
        const codeEls = el.querySelectorAll('code');

        for (const codeEl of Array.from(codeEls)) {
            // Skip <code> inside <pre> (fenced code blocks)
            if (codeEl.parentElement?.tagName === 'PRE') continue;

            const text = codeEl.textContent?.trim() ?? '';
            if (!text.startsWith('c:')) continue;

            const invocationStr = text.slice(2).trim();
            if (!invocationStr) continue;

            const invocation = parseComponentInvocation(invocationStr);
            if (!invocation) continue;

            const definition = this.components.get(invocation.name);
            if (!definition) continue;

            this.debug(`Inline rendering: ${invocation.name}`, invocation.props);

            const span = document.createElement('span');
            span.className = 'oc-inline-wrapper';
            renderComponent(span, definition, invocation.props, {
                enableScripts: this.settings.enableScripts,
                displayMode: 'inline',
            });

            codeEl.parentNode?.replaceChild(span, codeEl);
        }
    }

    // ─── Helpers ────────────────────────────────────────────────────

    /**
     * Check if a file is inside the components folder (including subfolders).
     */
    isComponentFile(file: TFile): boolean {
        return (
            file.extension === 'md' &&
            file.path.startsWith(this.settings.componentsFolder + '/')
        );
    }

    /**
     * Debug logging helper — only logs when debugMode is enabled.
     */
    private debug(message: string, ...args: unknown[]): void {
        if (this.settings.debugMode) {
            console.log(`[obsidian-components] ${message}`, ...args);
        }
    }

    // ─── Settings ───────────────────────────────────────────────────

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
