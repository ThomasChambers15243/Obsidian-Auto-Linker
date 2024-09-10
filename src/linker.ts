import { MetadataCache, TFile, App, Editor } from "obsidian";
import { LinkSelectionModal } from 'src/selection'

export class AutoLinker{
    private app: App;;
    public linkMap: Map<string, string[]>;
    public updating: boolean;
    public activated: boolean;

    public constructor(app: App) {
        this.linkMap = new Map();
        this.app = app;
        // Starts activated for init but is turned off until the user presses the command
        this.activated = true;
        // Ensures concurency when executing checks
        this.updating = false;
    }

    // Methods
    public loadAllLinksFromAllFills(): Promise<boolean> {
        const files: TFile[] = getTrackedMarkdownFiles();        
        return new Promise((resolve) => {
            if (!this.activated) {
                resolve(false)
            }
            // Loop through each file and check for matches
            for (const file of files) {
                const fileName = file.name;    
                const tags = extractTagsFromFile(this.app.metadataCache, file);
                const headers = extractHeadersFromFile(this.app.metadataCache, file);
        
                // Add file names
                this.addLinkToMap(file.basename, `[${file.basename}](${file.path})`);
        
                // Add tags
                tags.forEach(tag => {
                    this.addLinkToMap(tag, `#${tag}`)
                });
        
                // Add headers
                headers.forEach(header => {
                        this.addLinkToMap(header.heading, `[${header.heading}](${file.path}#^${header.heading})`)
                });
            }
            
            resolve(true)
            console.log(this.linkMap);
        })
    }

    public async handleTextChange(editor: Editor) {
        console.log("Activated: ", this.activated)
        if (!this.activated) {
            this.updating = false
            return;
        }
        if (await this.loadAllLinksFromAllFills()) {
            const cursor = editor.getCursor();
            const line = editor.getLine(cursor.line);
            if (this.linkMap != undefined) {
                for (const key of this.linkMap.keys()) {
                    let splitLine = line.split(' ');
                    if (splitLine.includes(key) && !splitLine.includes(`[${key}]`) && !splitLine.includes(`#${key}`)) {
                        let links = this.linkMap.get(key);
                        if (links !== undefined) {
                            let newLine = "";
                            if (links.length > 1) {
                                const modal = new LinkSelectionModal(this.app, links);
                                newLine = await modal.openAndGetSelection();
                            } else {
                                newLine = line.replace(key, links[0]);
                            }
                            editor.replaceRange(newLine, 
                                { line: cursor.line, ch: 0 },
                                { line: cursor.line, ch: line.length });                                       
                            break
                            }
                    }
                }
            } else {
                console.log("ERROR: Map is undefined");
            }
            this.updating = false
        }
    }

    private addLinkToMap(name: string, link: string) {
        // Stops any ghost links being inserted        
        // so the user doesn't get spooked
        if (name == "") {return}
    
        let bucket = this.linkMap.get(name);
        // If its undefined then its unique so inserted
        if (bucket === undefined) {
            this.linkMap.set(name, [link]);
        // If theres a collision then its not unique so push to collections
        } else if (!bucket.contains(link)) {
            bucket.push(link)
        }
    }
}

// Get all tags from file
function extractTagsFromFile(metadataCache: MetadataCache, file: TFile): string[] {
    const cache = metadataCache.getFileCache(file);
    if (cache?.tags) {
        // Remove hash to enable collision in map
        return cache.tags.map(tagObject => tagObject.tag.replace("#", ""));
    }
    return [];
  }
  
  // Get all header text from file
  function extractHeadersFromFile(metadataCache: MetadataCache, file: TFile) {
    const cache = metadataCache.getFileCache(file);
    if (cache?.headings) {
        return cache.headings.map(heading => ({
            heading: heading.heading,
        }));
    }
    return [];
  }

  // Gets markdown files from vault
  function getTrackedMarkdownFiles(): TFile[] {
    return this.app.vault.getMarkdownFiles()
  }

  