import { App, PluginSettingTab, Setting } from 'obsidian';
import type ComponentsPlugin from './main';

export class ComponentsSettingTab extends PluginSettingTab {
    plugin: ComponentsPlugin;

    constructor(app: App, plugin: ComponentsPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();

        containerEl.createEl('h2', { text: 'Obsidian Components 设置' });

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

        // Show loaded components info
        const infoEl = containerEl.createDiv({ cls: 'oc-settings-info' });
        const count = this.plugin.getComponentCount();
        infoEl.createEl('p', {
            text: `已加载 ${count} 个组件`,
            cls: 'oc-settings-count',
        });

        if (count > 0) {
            const listEl = infoEl.createEl('ul', { cls: 'oc-settings-list' });
            for (const name of this.plugin.getComponentNames()) {
                listEl.createEl('li', { text: name });
            }
        }

        new Setting(containerEl)
            .setName('刷新组件')
            .setDesc('重新加载所有组件定义')
            .addButton(button => button
                .setButtonText('刷新')
                .setCta()
                .onClick(async () => {
                    await this.plugin.loadComponentDefinitions();
                    this.display(); // Re-render the settings page
                }));
    }
}
