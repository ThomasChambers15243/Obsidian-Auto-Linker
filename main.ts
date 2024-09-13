import { Plugin, Notice, Keymap } from "obsidian";
import { AutoLinker } from "src/linker"
import { AutoLinkerSettings, AutoLinkerSettingsTab } from "src/settings";

const DEFAULT_SETTINGS: Partial<AutoLinkerSettings> = {
  excludeWithTag: false,
}


export default class Main extends Plugin {
  autoLinker: AutoLinker;
  settings: AutoLinkerSettings;
  
  async onload() {
    await this.loadSettings();

    this.addSettingTab(new AutoLinkerSettingsTab(this.app, this));

    // Init autoLink and load in links
    this.autoLinker = new AutoLinker(this.app);    

    if (await this.autoLinker.loadAllLinksFromAllFills()) {
      this.autoLinker.activated = false;
      
      this.registerDomEvent(document, "keydown", (event: KeyboardEvent) => {
        if (event.key == "Enter") {
          this.autoLinker.loadAllLinksFromAllFills();
        }
      })

      // Track the user's editor changes
      this.registerEvent(this.app.workspace.on("editor-change", (editor, data) => {
        let codemirror = data.editor;
        if (codemirror && this.autoLinker.updating == false) {
          this.autoLinker.updating = true;
          this.autoLinker.handleTextChange(codemirror);
        }
      }))
      
    }

    

    // Activate AutoLinker
    this.addCommand({
      id: "Activate-autolinker",
      name: "Activate AutoLinker",
      hotkeys: [
        { modifiers: ["Ctrl", "Alt",], key: "l" },
        {modifiers: ["Ctrl", "Shift",], key: "l" },
      ],
      callback: () => {
        // Flip activated so its an On/Off feature
        this.autoLinker.activated = !this.autoLinker.activated;
        if (this.autoLinker.activated) {
          new Notice("Auto Linker On");
        } else {
          new Notice("Auto Linker Off");
        }
      },
    });

  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }
  
  async saveSettings() {
    await this.saveData(this.settings);
  }

  onunload() {
    
  }
}
