import { Plugin, Notice } from "obsidian";
import { AutoLinker } from "src/linker"




export default class ReviewTracker extends Plugin {
  autoLinker: AutoLinker;
  
  async onload() {
    // Init autoLink and load in links
    this.autoLinker = new AutoLinker(this.app);
    if (await this.autoLinker.loadAllLinksFromAllFills()) {
      this.autoLinker.activated = false;
      
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

  onunload() {
    
  }
}
