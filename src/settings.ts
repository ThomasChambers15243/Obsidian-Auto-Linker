import { PluginSettingTab, App, Setting } from "obsidian";
import Main from "main";

export interface AutoLinkerSettings {
    excludeWithTag: boolean,
}

export class AutoLinkerSettingsTab extends PluginSettingTab {
    plugin: Main

    constructor(app: App, plugin: Main) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        let { containerEl } = this;
        containerEl.empty();

        containerEl.createEl("h2", {text: "Auto Linker Settings"});

        new Setting(containerEl)
            .setName("Exlude files with a tag")
            .setDesc("If true, files with the tag '#exLink' will not be included in linking")
            .addToggle(toggle => toggle 
                .setValue(this.plugin.settings.excludeWithTag)
                .onChange(async (value) => {
                    this.plugin.settings.excludeWithTag = value;
                    await this.plugin.saveSettings();
                })
            )

    }

}