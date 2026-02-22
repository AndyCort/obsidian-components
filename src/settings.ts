import { App, Notice, PluginSettingTab, Setting } from 'obsidian';
import type ComponentsPlugin from './main';
import type { ComponentDefinition } from './types';

export class ComponentsSettingTab extends PluginSettingTab {
    plugin: ComponentsPlugin;

    constructor(app: App, plugin: ComponentsPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();
        containerEl.addClass('oc-settings');

        // ─── Header ─────────────────────────────────────────────
        const headerEl = containerEl.createDiv({ cls: 'oc-settings-header' });
        headerEl.createEl('h2', { text: '⚡ Components' });
        headerEl.createEl('p', {
            text: '在笔记中创建和复用自定义 UI 组件',
            cls: 'oc-settings-subtitle',
        });

        // ─── Section: General ───────────────────────────────────
        this.createSectionHeader(containerEl, '📁 基本设置');

        new Setting(containerEl)
            .setName('组件文件夹')
            .setDesc('存放组件定义文件（.md）的文件夹路径，相对于 Vault 根目录')
            .addText(text => text
                .setPlaceholder('_components')
                .setValue(this.plugin.settings.componentsFolder)
                .onChange(async (value) => {
                    this.plugin.settings.componentsFolder = value.trim() || '_components';
                    await this.plugin.saveSettings();
                    await this.plugin.loadComponentDefinitions();
                }));

        new Setting(containerEl)
            .setName('默认显示模式')
            .setDesc('组件的默认渲染方式：行内元素或块级元素')
            .addDropdown(dropdown => dropdown
                .addOption('inline', '行内 (Inline)')
                .addOption('block', '块级 (Block)')
                .setValue(this.plugin.settings.displayMode)
                .onChange(async (value) => {
                    this.plugin.settings.displayMode = value as 'inline' | 'block';
                    await this.plugin.saveSettings();
                }));

        // ─── Section: Behavior ──────────────────────────────────
        this.createSectionHeader(containerEl, '⚙️ 行为设置');

        new Setting(containerEl)
            .setName('实时刷新')
            .setDesc('组件源文件修改后自动重新加载组件定义')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.liveReload)
                .onChange(async (value) => {
                    this.plugin.settings.liveReload = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('允许脚本执行')
            .setDesc('是否允许组件中的 <script> 代码运行（关闭后更安全）')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.enableScripts)
                .onChange(async (value) => {
                    this.plugin.settings.enableScripts = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('调试模式')
            .setDesc('在控制台输出详细的组件加载和渲染日志')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.debugMode)
                .onChange(async (value) => {
                    this.plugin.settings.debugMode = value;
                    await this.plugin.saveSettings();
                }));

        // ─── Section: Components Library ────────────────────────
        this.createSectionHeader(containerEl, '🧩 已加载组件');

        const count = this.plugin.getComponentCount();

        // Toolbar: count + refresh button
        const toolbarEl = containerEl.createDiv({ cls: 'oc-toolbar' });
        toolbarEl.createSpan({
            text: `共 ${count} 个组件`,
            cls: 'oc-toolbar-count',
        });
        const refreshBtn = toolbarEl.createEl('button', {
            text: '↻ 刷新',
            cls: 'oc-toolbar-btn',
        });
        refreshBtn.addEventListener('click', async () => {
            await this.plugin.loadComponentDefinitions();
            new Notice(`已重新加载 ${this.plugin.getComponentCount()} 个组件`);
            this.display();
        });

        if (count === 0) {
            const emptyEl = containerEl.createDiv({ cls: 'oc-empty-state' });
            emptyEl.createEl('div', { text: '📭', cls: 'oc-empty-icon' });
            emptyEl.createEl('p', {
                text: '暂无组件',
                cls: 'oc-empty-title',
            });
            emptyEl.createEl('p', {
                text: `在 Vault 的 "${this.plugin.settings.componentsFolder}" 文件夹中创建 .md 文件来定义组件`,
                cls: 'oc-empty-desc',
            });
        } else {
            const gridEl = containerEl.createDiv({ cls: 'oc-components-grid' });
            for (const name of this.plugin.getComponentNames()) {
                const def = this.plugin.getComponentDefinition(name);
                if (def) {
                    this.createComponentCard(gridEl, def);
                }
            }
        }

        // ─── Section: Usage ─────────────────────────────────────
        this.createSectionHeader(containerEl, '📖 使用帮助');

        const helpEl = containerEl.createDiv({ cls: 'oc-help' });
        helpEl.innerHTML = `
			<div class="oc-help-item">
				<div class="oc-help-step">1</div>
				<div class="oc-help-content">
					<strong>定义组件</strong>
					<p>在 <code>${this.plugin.settings.componentsFolder}/</code> 文件夹中创建 <code>.md</code> 文件，使用 YAML frontmatter 声明 props</p>
				</div>
			</div>
			<div class="oc-help-item">
				<div class="oc-help-step">2</div>
				<div class="oc-help-content">
					<strong>编写模板</strong>
					<p>在 frontmatter 下方编写 HTML 模板，使用 <code>{{prop}}</code> 做占位符，可包含 <code>&lt;style&gt;</code> 和 <code>&lt;script&gt;</code></p>
				</div>
			</div>
			<div class="oc-help-item">
				<div class="oc-help-step">3</div>
				<div class="oc-help-content">
					<strong>使用组件</strong>
					<p>在任意笔记中使用 <code>\`\`\`component</code> 代码块调用，如 <code>button(text="提交")</code></p>
				</div>
			</div>
		`;
    }

    /**
     * Create a styled section header
     */
    private createSectionHeader(container: HTMLElement, title: string): void {
        const section = container.createDiv({ cls: 'oc-section-header' });
        section.createEl('h3', { text: title });
    }

    /**
     * Create a component card with info and preview
     */
    private createComponentCard(container: HTMLElement, def: ComponentDefinition): void {
        const card = container.createDiv({ cls: 'oc-comp-card' });

        // Header
        const headEl = card.createDiv({ cls: 'oc-comp-card-head' });
        headEl.createEl('span', { text: def.name, cls: 'oc-comp-card-name' });
        if (def.description) {
            headEl.createEl('span', { text: def.description, cls: 'oc-comp-card-desc' });
        }

        // Props list
        const propsKeys = Object.keys(def.props);
        if (propsKeys.length > 0) {
            const propsEl = card.createDiv({ cls: 'oc-comp-card-props' });
            propsEl.createEl('span', { text: 'Props:', cls: 'oc-comp-card-label' });
            for (const [key, value] of Object.entries(def.props)) {
                const tag = propsEl.createEl('span', { cls: 'oc-prop-tag' });
                tag.createEl('span', { text: key, cls: 'oc-prop-key' });
                tag.createEl('span', { text: `= "${value}"`, cls: 'oc-prop-val' });
            }
        }

        // Usage snippet
        const usageEl = card.createDiv({ cls: 'oc-comp-card-usage' });
        let snippet = def.name;
        if (propsKeys.length > 0) {
            const propsStr = Object.entries(def.props)
                .map(([k, v]) => `${k}="${v}"`)
                .join(', ');
            snippet = `${def.name}(${propsStr})`;
        }
        const codeEl = usageEl.createEl('code', { text: snippet, cls: 'oc-usage-code' });

        // Copy button
        const copyBtn = usageEl.createEl('button', { text: '复制', cls: 'oc-copy-btn' });
        copyBtn.addEventListener('click', () => {
            navigator.clipboard.writeText(`\`\`\`component\n${snippet}\n\`\`\``);
            new Notice(`已复制 ${def.name} 组件代码`);
        });

        // Source path
        card.createEl('div', {
            text: `📄 ${def.sourcePath}`,
            cls: 'oc-comp-card-path',
        });
    }
}
