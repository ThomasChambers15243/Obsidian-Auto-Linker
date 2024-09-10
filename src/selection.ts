import { Modal, App } from 'obsidian';

export class LinkSelectionModal extends Modal {
    private options: string[];
    private resolveSelection: (value: string | PromiseLike<string>) => void;

    constructor(app: App, options: string[]) {
        super(app);
        this.options = options;        
    }
    
    openAndGetSelection(): Promise<string> {
        return new Promise((resolve) => {
            this.resolveSelection = resolve;
            this.open();
        });
    }

    onOpen() {
        let { contentEl } = this;

        contentEl.createEl('h1', { text: 'Select a Link' });
        const buttons = contentEl.createEl('div', { cls: "link-buttons" });
        

        
        this.options.forEach(option => {
            const btn = buttons.createEl('button', { text: option, cls: "link-button" });
            btn.onclick = () => {
                this.resolveSelection(option);
                this.close();
            };
        });
    }

    onClose() {
        let { contentEl } = this;
        contentEl.empty();
    }
}
