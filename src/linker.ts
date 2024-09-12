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
    public async loadAllLinksFromAllFills(): Promise<boolean> {
        const files: TFile[] = await getTrackedMarkdownFiles();        
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
                this.addLinkToMap(file.basename, `[${file.basename}](${replaceSpaces(file.path)})`);
                

                // Add tags
                tags.forEach(tag => {
                    this.addLinkToMap(tag, `#${tag}`)
                });
        
                // Add headers
                headers.forEach(header => {
                        let link = `[${header.heading}](${replaceSpaces(file.path)}#^${replaceSpaces(header.heading)})`
                        this.addLinkToMap(header.heading, link)
                });
            }
            
            resolve(true)
            //console.log(this.linkMap);
        })
    }

    // Handles the line change
    public async handleTextChange(editor: Editor) {
        if (!this.activated) {
            this.updating = false
            return;
        }
        if (await this.loadAllLinksFromAllFills()) {
            const cursor = editor.getCursor();
            const line = editor.getLine(cursor.line);
            if (this.linkMap != undefined) {
                let newLine = line;
                let matches: RegExpMatchArray | null;
                let count = 0;
                do {
                    matches = this.lineHasKey(newLine, Array.from(this.linkMap.keys()));
                    console.log("Matches are: " , matches);
                    if (!matches || matches.length === 0) {
                        break;
                    }
                    // Always take the longest match as its most likley this was the intended one
                    let match = matches.reduce((longest, current) => 
                        current.length > longest.length ? current : longest, "");
                    console.log("Match is: " + match)
                    // Get the bucket
                    let links = this.linkMap.get(match.trim());
                    console.log(links)
                    console.log(this.linkMap);
                    if (links !== undefined) {
                        let linkText = links[0]
                        // If there are colling links, get the user to select one from a list
                        if (links.length > 1) {
                            const modal = new LinkSelectionModal(this.app, links);
                            linkText = await modal.openAndGetSelection();
                        }
                        const prevNewLine = newLine; 
                        // Avoid previous links
                        newLine = newLine.replace(new RegExp(`(?<!\\[.*\\]\\([^)]*)\\b(${match})\\b`, 'g'), linkText);                                     
                        if (newLine === prevNewLine) {
                            break;                                 
                    }   
                    }
                    count ++;                    
                }
                while (matches && count <= line.length);
                // Replace match
                if (newLine != line) {
                    editor.replaceRange(newLine, 
                        { line: cursor.line, ch: 0 },
                        { line: cursor.line, ch: line.length });  
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
            this.linkMap.set(name.trim(), [link]);
        // If theres a collision then its not unique so push to collections
        } else if (!bucket.contains(link)) {
            bucket.push(link)
        }
    }
    
    private lineHasKey(line: string, keys: string[]): RegExpMatchArray | null {
        const keysP = keys.map(key => key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join("|");

        // Final regex pattern
        const regex = new RegExp(  `(?<!\\[.*\\]\\([^)]*)\\b(?:#?\\s?)?(${keysP})\\b(?!\\S)`,
            'g');

        return line.match(regex);
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
  async function getTrackedMarkdownFiles(): Promise<TFile[]> {
    const pluginFolder = this.app.vault.configDir + '/plugins/Auto Linker';
    const dataPath = pluginFolder + '/data.json';
    const data = await this.app.vault.adapter.read(dataPath);
    // Settings map
    const settings = new Map<string, any>(Object.entries(JSON.parse(data)));

    let allFiles: TFile[] = this.app.vault.getMarkdownFiles();
    let trackedFiles: TFile[] = [];
    
    // If settings is enabled, only return files without the tag
    if (settings.get("excludeWithTag") == true) {
        allFiles.forEach((file) => {
            let tags = extractTagsFromFile(this.app.metadataCache, file);
            if (!tags.contains("exLink") && !tags.contains("exlink")) {
                trackedFiles.push(file);
            }
        })
        return trackedFiles;
    } else {
        return allFiles;
    }

    
  }

function replaceSpaces(str: string): string {
    return str.replaceAll(" ", "%20")
}
  