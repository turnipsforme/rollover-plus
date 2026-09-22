"use strict";

const obsidian = require("obsidian");

// Daily Notes and Periodic Notes expose settings through their plugin instances.
function getDailyNoteSettings(app) {
  const periodic = app.plugins?.getPlugin?.("periodic-notes");
  const options = periodic?.settings?.daily?.enabled
    ? periodic.settings.daily
    : app.internalPlugins?.getPluginById?.("daily-notes")?.instance?.options;
  return {
    format: options?.format || "YYYY-MM-DD",
    folder: options?.folder?.trim() || "",
    template: options?.template?.trim() || "",
  };
}

function getEffectiveDailyNoteSettings(app, overrideFolder = "") {
  const settings = getDailyNoteSettings(app);
  return { ...settings, folder: overrideFolder.trim() || settings.folder };
}

async function getNotePath(app, folder, filename) {
  const path = obsidian.normalizePath(`${folder}/${filename}.md`);
  const slash = path.lastIndexOf("/");
  const parent = slash === -1 ? "" : path.slice(0, slash);
  if (parent && !app.vault.getAbstractFileByPath(parent)) {
    await app.vault.createFolder(parent);
  }
  return path;
}

async function getTemplateContents(app, template) {
  if (!template) return "";
  const file = app.metadataCache.getFirstLinkpathDest(template, "");
  if (!(file instanceof obsidian.TFile)) {
    throw new Error(`Daily note template not found: ${template}`);
  }
  return app.vault.cachedRead(file);
}

class DailyNotesFolderMissingError extends Error {}

async function createDailyNote(app, date, overrideFolder = "") {
  const { vault } = app;
  const moment = obsidian.moment;
  const { template, format, folder } = getEffectiveDailyNoteSettings(app, overrideFolder);
  const templateContents = await getTemplateContents(app, template);
  const filename = date.format(format);
  const normalizedPath = await getNotePath(app, folder, filename);
  try {
      const createdFile = await vault.create(normalizedPath, templateContents
          .replace(/{{\s*date\s*}}/gi, filename)
          .replace(/{{\s*time\s*}}/gi, moment().format("HH:mm"))
          .replace(/{{\s*title\s*}}/gi, filename)
          .replace(/{{\s*(date|time)\s*(([+-]\d+)([yqmwdhs]))?\s*(:.+?)?}}/gi, (_, _timeOrDate, calc, timeDelta, unit, momentFormat) => {
          const now = moment();
          const currentDate = date.clone().set({
              hour: now.get("hour"),
              minute: now.get("minute"),
              second: now.get("second"),
          });
          if (calc) {
              currentDate.add(parseInt(timeDelta, 10), unit);
          }
          if (momentFormat) {
              return currentDate.format(momentFormat.substring(1).trim());
          }
          return currentDate.format(format);
      })
          .replace(/{{\s*yesterday\s*}}/gi, date.clone().subtract(1, "day").format(format))
          .replace(/{{\s*tomorrow\s*}}/gi, date.clone().add(1, "d").format(format)));
      return createdFile;
  }
  catch (err) {
      console.error(`Failed to create file: '${normalizedPath}'`, err);
      new obsidian.Notice("Unable to create new file.");
  }
}
async function createOrGetDailyNote(app, date, overrideFolder = "") {
  const settings = getEffectiveDailyNoteSettings(app, overrideFolder);
  const path = await getNotePath(app, settings.folder, date.format(settings.format));
  const existingFile = app.vault.getAbstractFileByPath(path);
  if (existingFile instanceof obsidian.TFile) return existingFile;

  if (!overrideFolder) {
    const periodic = app.plugins?.getPlugin?.("periodic-notes");
    const provider = periodic?.settings?.daily?.enabled
      ? periodic
      : app.internalPlugins?.getPluginById?.("daily-notes")?.instance;
    if (provider?.createDailyNote) {
      try {
        const file = await provider.createDailyNote(date.clone());
        // Some providers return no file even though they created the note.
        const created = file || app.vault.getAbstractFileByPath(path);
        if (created instanceof obsidian.TFile && created.path === path) return created;
      } catch (error) {
        console.warn("Rollover Plus: Native daily note creation failed.", error);
        const created = app.vault.getAbstractFileByPath(path);
        if (created instanceof obsidian.TFile) return created;
      }
    }
  }
  return createDailyNote(app, date, overrideFolder);
}

class UndoModal extends obsidian.Modal {
  constructor(plugin) {
    super(plugin.app);
    this.plugin = plugin;
  }

  async parseChange(change) {
    const { file, oldContent } = change;
    let currentContent = await this.plugin.app.vault.read(file);

    const oldContentLineCount = oldContent.split('\n').length;
    const currentContentLineCount = currentContent.split('\n').length;
    const diff = Math.abs(oldContentLineCount - currentContentLineCount);

    let s = '';
    if (oldContentLineCount > currentContentLineCount) {
      s = `- ${file.basename}.${file.extension}: add ${diff} line${diff === 1 ? '' : 's'}.`;
    } else if (oldContentLineCount < currentContentLineCount) {
      s = `- ${file.basename}.${file.extension}: remove ${diff} line${diff === 1 ? '' : 's'}.`;
    } else {
      if (oldContent == currentContent) {
        s = `- ${file.basename}.${file.extension}: will not be modified.`;
      } else {
        s = `- ${file.basename}.${file.extension}: will be modified to its previous state, with the same number of lines (but different content).`;
      }
    }

    return s
  }

  async confirmUndo(undoHistoryInstance) {
    await this.plugin.runRolloverOperation("Undo rollover", () =>
      this.plugin.restoreUndoChanges(undoHistoryInstance)
    );
  }

  async onOpen() {
    let { contentEl, plugin } = this;
    contentEl.createEl('h3', { text: 'Undo last rollover' });
    contentEl.createEl('div', { text: 'This restores every file changed by the last rollover. Any edits made to those files since then will be overwritten.' });
    contentEl.createEl('div', { text: 'Rollover actions can be undone for up to 2 minutes. Undo history is cleared when Obsidian closes.' });
    contentEl.createEl('h4', { text: 'Changes made with undo:' });

    const undoHistoryInstance = plugin.undoHistory[0];
    const modTextArray = await Promise.all(
      undoHistoryInstance.changes.map((change) => this.parseChange(change))
    );
    modTextArray.forEach(txt => {
      contentEl.createEl('div', { text: txt });
    });

    new obsidian.Setting(contentEl)
      .addButton(button => button
        .setButtonText('Confirm undo')
        .onClick(async () => {
          await this.confirmUndo(undoHistoryInstance);
          this.close();
        })
      );
  }

  onClose() {
    let { contentEl } = this;
    contentEl.empty();
  }
}

class RolloverSettingTab extends obsidian.PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  async getTemplateHeadings() {
    const { template = "" } = getDailyNoteSettings(this.app) || {};
    if (!template) return [];

    const templatePath = obsidian.normalizePath(template.trim());
    let file = this.app.metadataCache?.getFirstLinkpathDest?.(templatePath, "");

    if (!file) {
      file = this.app.vault.getAbstractFileByPath(templatePath);
    }

    if (!file && !templatePath.endsWith(".md")) {
      file = this.app.vault.getAbstractFileByPath(templatePath + ".md");
    }

    if (!file) {
      return [];
    }

    const templateContents = await this.app.vault.read(file);
    return this.plugin.extractTemplateHeadings(templateContents);
  }

  getHeadingOptions(templateHeadings, selectedHeading, emptyLabel) {
    const options = { none: emptyLabel };
    templateHeadings.forEach((heading) => {
      options[heading] = heading;
    });

    if (
      selectedHeading &&
      selectedHeading !== "none" &&
      !Object.prototype.hasOwnProperty.call(options, selectedHeading)
    ) {
      options[selectedHeading] = `${selectedHeading} (saved setting)`;
    }

    return options;
  }

  async display() {
    const templateHeadings = await this.getTemplateHeadings();

    this.containerEl.empty();
    new obsidian.Setting(this.containerEl)
      .setName("Daily note folder")
      .setDesc(
        "Optional folder override for rollover source and destination notes. Leave blank to use the folder from Daily Notes or Periodic Notes."
      )
      .addText((text) =>
        text
          .setPlaceholder("Use Daily Notes setting")
          .setValue(this.plugin.settings.dailyNoteFolder || "")
          .onChange(async (value) => {
            this.plugin.settings.dailyNoteFolder = value.trim();
            await this.plugin.saveSettings();
          })
      );

    new obsidian.Setting(this.containerEl)
      .setName("Rollover to today source")
      .setDesc(
        "Yesterday uses the most recent earlier daily note. Past week uses the seven most recent earlier notes, even with gaps, and hides the separate past-week command."
      )
      .addDropdown((dropdown) =>
        dropdown
          .addOptions({ "previous-note": "Yesterday", "past-week": "Past week" })
          .setValue(this.plugin.settings.rolloverToTodaySource)
          .onChange(async (value) => {
            this.plugin.settings.rolloverToTodaySource = value;
            await this.plugin.saveSettings();
          })
      );

    new obsidian.Setting(this.containerEl)
      .setName("Roll over from heading")
      .setDesc(
        "For bulk rollover, only collect unfinished tasks inside this heading. Choose all headings to collect them from the whole source note."
      )
      .addDropdown((dropdown) =>
        dropdown
          .addOptions(
            this.getHeadingOptions(
              templateHeadings,
              this.plugin.settings.sourceHeading,
              "All headings"
            )
          )
          .setValue(this.plugin.settings.sourceHeading || "none")
          .onChange((value) => {
            this.plugin.settings.sourceHeading = value;
            this.plugin.saveSettings();
          })
      );

    new obsidian.Setting(this.containerEl)
      .setName("Roll over to heading")
      .setDesc(
        "Place rolled tasks under this heading. Auto-detect uses the first heading containing the word task or tasks, then falls back to the end of the note."
      )
      .addDropdown((dropdown) =>
        dropdown
          .addOptions(
            this.getHeadingOptions(
              templateHeadings,
              this.plugin.settings.templateHeading,
              "Auto-detect Tasks heading"
            )
          )
          .setValue(this.plugin.settings.templateHeading || "none")
          .onChange((value) => {
            this.plugin.settings.templateHeading = value;
            this.plugin.saveSettings();
          })
      );

    new obsidian.Setting(this.containerEl)
      .setName("Delete tasks from source note")
      .setDesc(
        `After tasks are safely added to the destination, remove their exact source blocks. When disabled, bulk rollover commands copy tasks instead. The current-selection command always moves its selected task.`
      )
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.deleteOnComplete || false)
          .onChange((value) => {
            this.plugin.settings.deleteOnComplete = value;
            this.plugin.saveSettings();
          })
      );

    new obsidian.Setting(this.containerEl)
      .setName("Remove empty tasks in rollover")
      .setDesc(
        `Skip empty task boxes. If source deletion is enabled, empty boxes are cleaned from the source.`
      )
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.removeEmptyTodos || false)
          .onChange((value) => {
            this.plugin.settings.removeEmptyTodos = value;
            this.plugin.saveSettings();
          })
      );

    new obsidian.Setting(this.containerEl)
      .setName("Roll over task children")
      .setDesc(
        `Move or copy indented Markdown lines beneath each task together with the parent task.`
      )
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.rolloverChildren || false)
          .onChange((value) => {
            this.plugin.settings.rolloverChildren = value;
            this.plugin.saveSettings();
          })
      );

    new obsidian.Setting(this.containerEl)
      .setName("Done status markers")
      .setDesc(
        `Characters that represent done status in checkboxes. Default is "xX-". Add any characters that should be considered as marking a task complete.`
      )
      .addText((text) =>
        text
          .setValue(this.plugin.settings.doneStatusMarkers || "xX-")
          .onChange((value) => {
            this.plugin.settings.doneStatusMarkers = value;
            this.plugin.saveSettings();
          })
      );
  }
}

// Share Markdown context between task parsing and heading lookup.
function getMarkdownLineMask(lines) {
  let fence = null;
  let frontmatter = lines[0]?.replace(/^\uFEFF/, "") === "---";
  return lines.map((line, index) => {
    if (frontmatter) {
      if (index > 0 && /^(---|\.\.\.)\s*$/.test(line)) frontmatter = false;
      return false;
    }
    if (fence) {
      const closing = line.match(/^\s*(`{3,}|~{3,})\s*$/);
      if (closing && closing[1][0] === fence[0] && closing[1].length >= fence.length) {
        fence = null;
      }
      return false;
    }
    const opening = line.match(/^\s*(`{3,}|~{3,})(.*)$/);
    if (opening && !(opening[1][0] === "`" && opening[2].includes("`"))) {
      fence = opening[1];
      return false;
    }
    return true;
  });
}

class TodoParser {
  // Support all unordered list bullet symbols as per spec (https://daringfireball.net/projects/markdown/syntax#list)
  // Default completed status markers
  doneStatusMarkers = ["x", "X", "-"];

  // List of strings that include the Markdown content
  #lines;

  // Boolean that encodes whether nested items should be rolled over
  #withChildren;

  // Reuse one segmenter for the whole parse instead of creating one per task.
  #segmenter;

  // Parse content with segmentation to allow for Unicode grapheme clusters
  #parseIntoChars(content) {
    // Use Intl.Segmenter to properly split grapheme clusters if available,
    // otherwise fall back to Array.from. The fallback should not trigger in
    // Obsidian since it uses Electron which supports Intl.Segmenter.
    if (this.#segmenter) {
      return Array.from(this.#segmenter.segment(content), (s) => s.segment);
    } else {
      // Array.from() splits surrogate pairs correctly but not complex grapheme clusters
      // (e.g., 👨‍👩‍👧‍👦 would be split incorrectly) and fail to match.
      return Array.from(content);
    }
  }

  constructor(lines, withChildren, doneStatusMarkers) {
    this.#lines = lines;
    this.#withChildren = withChildren;
    this.#segmenter =
      typeof Intl !== "undefined" && Intl.Segmenter
        ? new Intl.Segmenter("en", { granularity: "grapheme" })
        : null;
    if (doneStatusMarkers) {
      this.doneStatusMarkers = this.#parseIntoChars(
        doneStatusMarkers
      );
    }
  }

  // Returns true if string s is a todo-item
  #isTodo(s) {
    // Extract the checkbox content
    const match = s.match(/^\s*[*+-] \[(.*?)\]/);
    if (!match) return false;

    const checkboxContent = match[1];

    if (checkboxContent === "" || /^\s+$/.test(checkboxContent)) {
      return true;
    }

    // Parse content with segmentation to allow for Unicode grapheme clusters
    const contentChars = this.#parseIntoChars(
      checkboxContent
    );

    // Valid checkbox content must be exactly one grapheme cluster
    if (contentChars.length !== 1) {
      return false;
    }

    // Exclude grapheme modifiers that are not valid as standalone content
    const graphemeModifiers = ['\u202E', '\u200B', '\u200C', '\u200D'];
    const hasGraphemeModifier = contentChars.some((char) =>
      graphemeModifiers.includes(char)
    );
    if (hasGraphemeModifier) {
      return false;
    }

    // Check if the checkbox content contains any characters that are in doneStatusMarkers
    const hasDoneMarker = contentChars.some((char) =>
      this.doneStatusMarkers.includes(char)
    );

    // Return true (is a todo) if it does NOT contain any done markers
    return !hasDoneMarker;
  }

  // Returns true if line after line-number `l` is a nested item
  #hasChildren(l) {
    if (l + 1 >= this.#lines.length) {
      return false;
    }
    const indCurr = this.#getIndentation(l);
    const indNext = this.#getIndentation(l + 1);
    if (indNext > indCurr) {
      return true;
    }
    return false;
  }

  // Returns a list of strings that are the nested items after line `parentLinum`
  #getChildren(parentLinum) {
    const children = [];
    let nextLinum = parentLinum + 1;
    while (this.#isChildOf(parentLinum, nextLinum)) {
      children.push(this.#lines[nextLinum]);
      nextLinum++;
    }
    return children;
  }

  // Returns true if line `linum` has more indentation than line `parentLinum`
  #isChildOf(parentLinum, linum) {
    if (parentLinum >= this.#lines.length || linum >= this.#lines.length) {
      return false;
    }
    return this.#getIndentation(linum) > this.#getIndentation(parentLinum);
  }

  // Returns the number of whitespace-characters at beginning of string at line `l`
  #getIndentation(l) {
    return this.#lines[l].search(/\S/);
  }

  // Returns each unfinished todo with its exact source range and optional children.
  getTodoBlocks() {
    const blocks = [];
    const markdownLines = getMarkdownLineMask(this.#lines);
    for (let l = 0; l < this.#lines.length; l++) {
      const line = this.#lines[l];
      if (!markdownLines[l]) continue;
      if (this.#isTodo(line)) {
        let blockLines = [line];
        let endLine = l;
        if (this.#withChildren && this.#hasChildren(l)) {
          const cs = this.#getChildren(l);
          blockLines = [...blockLines, ...cs];
          endLine += cs.length;
          l += cs.length;
        }
        blocks.push({ startLine: endLine - blockLines.length + 1, endLine, lines: blockLines });
      }
    }
    return blocks;
  }

}

const getTodoBlocks = ({
  lines,
  withChildren = false,
  doneStatusMarkers = null,
}) => {
  const todoParser = new TodoParser(lines, withChildren, doneStatusMarkers);
  return todoParser.getTodoBlocks();
};

class RolloverPlusPlugin extends obsidian.Plugin {
  async loadSettings() {
    const DEFAULT_SETTINGS = {
      dailyNoteFolder: "",
      rolloverToTodaySource: "previous-note",
      sourceHeading: "none",
      templateHeading: "### ⭐ Tasks:",
      deleteOnComplete: true,
      removeEmptyTodos: true,
      rolloverChildren: true,
      doneStatusMarkers: "xX-",
    };
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  isDailyNotesEnabled() {
    const internalPlugins = this.app.internalPlugins;
    const dailyNotesPlugin =
      internalPlugins?.getPluginById?.("daily-notes") ||
      internalPlugins?.plugins?.["daily-notes"];
    const dailyNotesEnabled = Boolean(dailyNotesPlugin?.enabled);

    const periodicNotesPlugin = this.app.plugins?.getPlugin?.("periodic-notes");
    const periodicNotesEnabled = Boolean(
      periodicNotesPlugin?.settings?.daily?.enabled
    );

    return dailyNotesEnabled || periodicNotesEnabled;
  }

  getTodoBlocksFromContent(content, withChildren = this.settings.rolloverChildren) {
    const { lines } = this.splitNoteContent(content);
    return getTodoBlocks({
      lines,
      withChildren,
      doneStatusMarkers: this.settings.doneStatusMarkers,
    });
  }

  getRolloverTodoBlocksFromContent(
    content,
    withChildren = this.settings.rolloverChildren
  ) {
    const selectedHeading = (this.settings.sourceHeading || "").trim();
    if (!selectedHeading || selectedHeading === "none") {
      return this.getTodoBlocksFromContent(content, withChildren);
    }

    const { lines } = this.splitNoteContent(content);
    const section = this.getHeadingSectionRange(lines, selectedHeading);
    if (!section) {
      return [];
    }

    return this.getTodoBlocksFromContent(content, withChildren).filter(
      (block) => block.startLine >= section.startLine && block.endLine < section.endLine
    );
  }

  splitNoteContent(content) {
    const newlineMatch = content.match(/\r\n|\n|\r/);
    return {
      lines: content.split(/\r\n|\n|\r/),
      newline: newlineMatch ? newlineMatch[0] : "\n",
    };
  }

  normalizeHeading(heading) {
    return heading
      .trim()
      .replace(/^#{1,}\s+/, "")
      .replace(/[\uFE0E\uFE0F]/g, "")
      .replace(/[:\s]+$/, "")
      .toLocaleLowerCase();
  }

  isTaskHeading(line) {
    return (
      /^\s*#{1,6}\s+/.test(line) &&
      /\btasks?\b/i.test(this.normalizeHeading(line))
    );
  }

  getHeadingLevel(line) {
    const match = line.match(/^\s*(#{1,6})\s+/);
    return match ? match[1].length : 0;
  }

  extractTemplateHeadings(content) {
    const headings = [];
    const seen = new Set();
    const { lines } = this.splitNoteContent(content);
    const markdownLines = getMarkdownLineMask(lines);
    lines.forEach((line, index) => {
      if (!markdownLines[index]) return;
      const match = line.match(/^\s*(#{1,6}\s+\S.*?\s*)$/);
      if (!match) {
        return;
      }

      const heading = match[1].trim();
      if (!seen.has(heading)) {
        seen.add(heading);
        headings.push(heading);
      }
    });
    return headings;
  }

  getHeadingLevels(lines) {
    return getMarkdownLineMask(lines).map((isMarkdown, index) =>
      isMarkdown ? this.getHeadingLevel(lines[index]) : 0
    );
  }

  findSelectedHeadingIndex(lines, selectedHeading, levels = this.getHeadingLevels(lines)) {
    const heading = (selectedHeading || "").trim();
    if (!heading || heading === "none") {
      return -1;
    }

    const exactMatchIndex = lines.findIndex((line, index) => levels[index] > 0 && line.trim() === heading);
    if (exactMatchIndex !== -1) {
      return exactMatchIndex;
    }

    const normalizedHeading = this.normalizeHeading(heading);
    return lines.findIndex(
      (line, index) =>
        levels[index] > 0 &&
        this.normalizeHeading(line) === normalizedHeading
    );
  }

  getHeadingSectionRange(lines, selectedHeading) {
    const levels = this.getHeadingLevels(lines);
    const headingIndex = this.findSelectedHeadingIndex(lines, selectedHeading, levels);
    if (headingIndex === -1) {
      return null;
    }

    const headingLevel = this.getHeadingLevel(lines[headingIndex]);
    let endLine = lines.length;
    for (let i = headingIndex + 1; i < lines.length; i++) {
      const level = levels[i];
      if (level > 0 && level <= headingLevel) {
        endLine = i;
        break;
      }
    }

    return { headingIndex, startLine: headingIndex + 1, endLine };
  }

  isRolloverHeading(line) {
    if (this.isTaskHeading(line)) {
      return true;
    }

    const selectedHeadings = [
      this.settings.templateHeading,
      this.settings.sourceHeading,
    ];
    return selectedHeadings.some((selectedHeading) => {
      const heading = (selectedHeading || "").trim();
      return (
        heading !== "" &&
        heading !== "none" &&
        this.getHeadingLevel(line) > 0 &&
        this.normalizeHeading(line) === this.normalizeHeading(heading)
      );
    });
  }

  findTemplateHeadingIndex(lines, templateHeading, levels = this.getHeadingLevels(lines)) {
    const selectedHeading = (templateHeading || "").trim();
    if (selectedHeading && selectedHeading !== "none") {
      const selectedHeadingIndex = this.findSelectedHeadingIndex(
        lines,
        selectedHeading,
        levels
      );
      if (selectedHeadingIndex !== -1) {
        return selectedHeadingIndex;
      }
    }

    return lines.findIndex((line, index) => levels[index] > 0 && this.isTaskHeading(line));
  }

  removeTodoBlocksFromContent(content, blocks) {
    const { lines, newline } = this.splitNoteContent(content);
    const removedLineIndices = new Set();
    const touchedHeadingIndices = new Set();
    let currentHeading = -1;
    const containingHeadings = this.getHeadingLevels(lines).map((level, index) => {
      const containing = currentHeading;
      if (level > 0) currentHeading = index;
      return containing;
    });

    blocks.forEach((block) => {
      for (let i = block.startLine; i <= block.endLine; i++) {
        removedLineIndices.add(i);
      }

      const headingIndex = containingHeadings[block.startLine];
      if (headingIndex !== -1 && this.isRolloverHeading(lines[headingIndex])) {
        touchedHeadingIndices.add(headingIndex);
      }
    });

    const sourceSection = this.getHeadingSectionRange(
      lines,
      this.settings.sourceHeading
    );
    if (
      sourceSection &&
      blocks.some(
        (block) =>
          block.startLine >= sourceSection.startLine &&
          block.endLine < sourceSection.endLine
      )
    ) {
      touchedHeadingIndices.add(sourceSection.headingIndex);
    }

    const entries = lines
      .map((text, originalIndex) => ({ text, originalIndex }))
      .filter((entry) => !removedLineIndices.has(entry.originalIndex));

    this.removeBlankResidueAtBlockSeams(entries, blocks, lines);
    this.removeEmptyRolloverHeadingEntries(entries, touchedHeadingIndices);
    return entries.map((entry) => entry.text).join(newline);
  }

  removeBlankResidueAtBlockSeams(entries, blocks, originalLines) {
    const isBlank = (entry) => /^\s*$/.test(entry.text);
    const originalEndsWithNewline =
      originalLines.length > 1 && originalLines[originalLines.length - 1] === "";

    [...blocks]
      .sort((a, b) => b.startLine - a.startLine)
      .forEach((block) => {
        let rightIndex = entries.findIndex(
          (entry) => entry.originalIndex > block.endLine
        );
        if (rightIndex === -1) {
          rightIndex = entries.length;
        }

        let leftRunStart = rightIndex;
        while (leftRunStart > 0 && isBlank(entries[leftRunStart - 1])) {
          leftRunStart--;
        }

        let rightRunEnd = rightIndex;
        while (rightRunEnd < entries.length && isBlank(entries[rightRunEnd])) {
          rightRunEnd++;
        }

        const leftBlanks = entries
          .slice(leftRunStart, rightIndex)
          .filter((entry) => entry.originalIndex < block.startLine);
        const rightBlanks = entries
          .slice(rightIndex, rightRunEnd)
          .filter((entry) => entry.originalIndex > block.endLine);
        const hasContentBefore = leftRunStart > 0;
        const hasContentAfter = rightRunEnd < entries.length;

        const removeOriginalIndices = new Set();
        if (!hasContentBefore) {
          [...leftBlanks, ...rightBlanks].forEach((entry) =>
            removeOriginalIndices.add(entry.originalIndex)
          );
        } else if (!hasContentAfter) {
          leftBlanks.forEach((entry) =>
            removeOriginalIndices.add(entry.originalIndex)
          );
          const terminalBlank = originalEndsWithNewline
            ? rightBlanks[rightBlanks.length - 1]
            : null;
          rightBlanks.forEach((entry) => {
            if (entry !== terminalBlank) {
              removeOriginalIndices.add(entry.originalIndex);
            }
          });
        } else if (leftBlanks.length > 0 && rightBlanks.length > 0) {
          rightBlanks.forEach((entry) =>
            removeOriginalIndices.add(entry.originalIndex)
          );
        }

        if (removeOriginalIndices.size > 0) {
          for (let i = entries.length - 1; i >= 0; i--) {
            if (removeOriginalIndices.has(entries[i].originalIndex)) {
              entries.splice(i, 1);
            }
          }
        }
      });
  }

  insertTodosInNote(content, todos, templateHeading) {
    const { lines, newline } = this.splitNoteContent(content);
    const levels = this.getHeadingLevels(lines);
    const headingLineIndex = this.findTemplateHeadingIndex(
      lines,
      templateHeading,
      levels
    );

    let insertionIndex = lines.length;
    if (headingLineIndex !== -1) {
      for (let i = headingLineIndex + 1; i < lines.length; i++) {
        if (levels[i] > 0) {
          insertionIndex = i;
          break;
        }
      }
    }

    insertionIndex = this.removeEmptyTodosAndBlankLinesAbove(
      lines,
      insertionIndex
    );
    lines.splice(insertionIndex, 0, ...todos);

    return {
      content: lines.join(newline),
      headingFound: headingLineIndex !== -1,
    };
  }

  removeTomorrowMentionFromTask(line) {
    return line.replace(/^(\s*[*+-] \[[^\]]*\]\s*)(?:tomorrow|tmrw)(?:\s*[:,-]\s*|\s+)/i, "$1");
  }

  isBareEmptyTodo(line) {
    return /^\s*[-*+] \[\s*\]\s*$/.test(line);
  }

  isEffectivelyEmptyTodoBlock(block) {
    return (
      this.isBareEmptyTodo(block.lines[0] || "") &&
      block.lines.slice(1).every((line) => /^\s*$/.test(line))
    );
  }

  prepareTodoBlocks(blocks, stripTomorrowMention = false) {
    const movedBlocks = [];
    let emptyCount = 0;

    blocks.forEach((block) => {
      if (this.settings.removeEmptyTodos && this.isEffectivelyEmptyTodoBlock(block)) {
        emptyCount++;
        return;
      }

      movedBlocks.push({
        ...block,
        lines: stripTomorrowMention
          ? block.lines.map((line) => this.removeTomorrowMentionFromTask(line))
          : [...block.lines],
      });
    });

    return {
      blocks: movedBlocks,
      lines: movedBlocks.flatMap((block) => block.lines),
      taskCount: movedBlocks.length,
      emptyCount,
    };
  }

  removeEmptyTodosAndBlankLinesAbove(lines, insertionIndex) {
    while (
      insertionIndex > 0 &&
      (/^\s*$/.test(lines[insertionIndex - 1]) ||
        /^\s*[-*+] \[\s*\]\s*$/.test(lines[insertionIndex - 1]))
    ) {
      lines.splice(insertionIndex - 1, 1);
      insertionIndex--;
    }

    return insertionIndex;
  }

  removeEmptyRolloverHeadingEntries(entries, candidateOriginalIndices) {
    const candidates = Array.from(candidateOriginalIndices).sort((a, b) => b - a);

    candidates.forEach((originalIndex) => {
      const headingIndex = entries.findIndex(
        (entry) => entry.originalIndex === originalIndex
      );
      if (headingIndex === -1) {
        return;
      }

      const headingLevel = this.getHeadingLevel(entries[headingIndex].text);
      let sectionEnd = entries.length;
      for (let i = headingIndex + 1; i < entries.length; i++) {
        const level = this.getHeadingLevel(entries[i].text);
        if (level > 0 && level <= headingLevel) {
          sectionEnd = i;
          break;
        }
      }

      const bodyIsEmpty = entries
        .slice(headingIndex + 1, sectionEnd)
        .every(
          (entry) => /^\s*$/.test(entry.text) || this.isBareEmptyTodo(entry.text)
        );

      if (bodyIsEmpty) {
        entries.splice(headingIndex, sectionEnd - headingIndex);
      }
    });
  }

  getCleanFolder(folder) {
    // Check if user defined folder with root `/` e.g. `/dailies`
    if (folder.startsWith("/")) {
      folder = folder.substring(1);
    }

    // Check if user defined folder with trailing `/` e.g. `dailies/`
    if (folder.endsWith("/")) {
      folder = folder.substring(0, folder.length - 1);
    }

    return folder;
  }

  getDailyNoteAtDate(date) {
    const { dailyNoteFolder } = this.settings;
    let { folder, format } = getEffectiveDailyNoteSettings(this.app, dailyNoteFolder);
    folder = this.getCleanFolder(folder);
    const notePath = obsidian.normalizePath(
      `${folder}${folder === "" ? "" : "/"}${date.format(format)}.md`
    );
    const file = this.app.vault.getAbstractFileByPath(notePath);
    return file instanceof obsidian.TFile ? file : null;
  }

  getAllConfiguredDailyNotes() {
    const effectiveSettings = getEffectiveDailyNoteSettings(this.app,
      this.settings.dailyNoteFolder
    );
    const folder = this.getCleanFolder(effectiveSettings.folder);
    const root =
      folder === ""
        ? this.app.vault.getRoot()
        : this.app.vault.getAbstractFileByPath(obsidian.normalizePath(folder));
    if (!root) {
      throw new DailyNotesFolderMissingError(
        "Failed to find daily notes folder"
      );
    }

    const notes = [];
    obsidian.Vault.recurseChildren(root, (file) => {
      if (file instanceof obsidian.TFile && file.extension === "md") {
        const date = this.getDateFromDailyNote(file, effectiveSettings);
        if (date) notes.push({ file, date });
      }
    });
    return notes;
  }

  getDateFromDailyNote(file, effectiveSettings = null) {
    let { folder, format } =
      effectiveSettings ||
      getEffectiveDailyNoteSettings(this.app, this.settings.dailyNoteFolder);
    folder = this.getCleanFolder(folder);
    const prefix = folder === "" ? "" : `${folder}/`;
    if (!file.path.startsWith(prefix) || !file.path.endsWith(".md")) {
      return null;
    }

    const relativePath = file.path.slice(prefix.length, -3);
    const date = obsidian.moment(relativePath, format, true);
    return date.isValid() ? date : null;
  }

  createOrGetDailyNote(date) {
    return createOrGetDailyNote(this.app, date, this.settings.dailyNoteFolder);
  }

  getRecentDailyNotesBefore(date, dailyNotes, limit = 1) {
    const recent = [];
    for (const item of Object.values(dailyNotes)) {
      const file = item.file || item;
      const fileDate = item.date || this.getDateFromDailyNote(file);
      if (!fileDate || !fileDate.isBefore(date, "day")) continue;
      const time = fileDate.valueOf();
      const index = recent.findIndex((entry) => entry.time < time);
      recent.splice(index === -1 ? recent.length : index, 0, { file, time });
      if (recent.length > limit) recent.pop();
    }
    return recent.map((entry) => entry.file);
  }

  recordUndo(changes) {
    if (changes.length === 0) {
      return;
    }
    this.undoHistoryTime = new Date();
    this.undoHistory = [{ changes }];
  }

  async restoreUndoChanges(undoHistoryInstance) {
    if (this.undoHistory[0] !== undoHistoryInstance || Date.now() - this.undoHistoryTime.getTime() > 120000) {
      new obsidian.Notice("This rollover can no longer be undone.");
      return;
    }
    for (let i = undoHistoryInstance.changes.length - 1; i >= 0; i--) {
      const change = undoHistoryInstance.changes[i];
      await this.app.vault.modify(change.file, change.oldContent);
    }
    this.undoHistory = [];
  }

  async insertIntoDestination(destinationNote, todoLines) {
    const { vault } = this.app;
    let oldContent = "";
    let newContent = "";
    let headingFound = true;
    let changed = false;

    const buildContent = (currentContent) => {
      oldContent = currentContent;
      const insertion = this.insertTodosInNote(
        currentContent,
        todoLines,
        this.settings.templateHeading
      );
      newContent = insertion.content;
      headingFound = insertion.headingFound;
      changed = newContent !== currentContent;
      return newContent;
    };

    if (typeof vault.process === "function") {
      await vault.process(destinationNote, buildContent);
    } else {
      let currentContent = await vault.read(destinationNote);
      buildContent(currentContent);

      const latestContent = await vault.read(destinationNote);
      if (latestContent !== currentContent) {
        currentContent = latestContent;
        buildContent(currentContent);
      }

      if (changed) {
        await vault.modify(destinationNote, newContent);
      }
    }

    return { oldContent, newContent, headingFound, changed };
  }

  async writeSourceSafely(sourceNote, expectedContent, updatedContent) {
    const { vault } = this.app;

    if (typeof vault.process === "function") {
      let written = false;
      await vault.process(sourceNote, (currentContent) => {
        if (currentContent !== expectedContent) {
          return currentContent;
        }
        written = true;
        return updatedContent;
      });
      return written;
    }

    const currentContent = await vault.read(sourceNote);
    if (currentContent !== expectedContent) {
      return false;
    }
    await vault.modify(sourceNote, updatedContent);
    return true;
  }

  applyRollover({ destinationNote, ...source }) {
    return this.applyRolloverBatch([source], destinationNote);
  }

  async applyRolloverBatch(sources, destinationNote) {
    const changes = [];
    const lines = sources.flatMap((source) => source.prepared.lines);
    const result = {
      taskCount: sources.reduce((sum, source) => sum + source.prepared.taskCount, 0),
      emptyCount: sources.reduce((sum, source) => sum + source.prepared.emptyCount, 0),
      headingFound: true,
      sourceDeleted: sources.every((source) => source.forceDeleteSource || this.settings.deleteOnComplete),
      sourceWriteSkipped: false,
      changed: false,
    };
    if (lines.length > 0 && !destinationNote) {
      throw new Error("A destination note is required for non-empty tasks.");
    }
    if (sources.some((source) => source.sourceNote.path === destinationNote?.path)) {
      throw new Error("The source and destination notes are the same file.");
    }

    try {
      // Save every collected task in one destination write before touching sources.
      if (lines.length > 0) {
        const update = await this.insertIntoDestination(destinationNote, lines);
        result.headingFound = update.headingFound;
        if (update.changed) {
          changes.push({ file: destinationNote, oldContent: update.oldContent });
        }
      }

      for (const source of sources) {
        if (!(source.forceDeleteSource || this.settings.deleteOnComplete)) continue;
        const { sourceNote, sourceContent, sourceBlocks, sourceWriter } = source;
        const updatedSource = this.removeTodoBlocksFromContent(sourceContent, sourceBlocks);
        if (updatedSource === sourceContent) continue;
        const written = sourceWriter
          ? await sourceWriter(updatedSource)
          : await this.writeSourceSafely(sourceNote, sourceContent, updatedSource);
        if (written === false) {
          result.sourceWriteSkipped = true;
          result.sourceDeleted = false;
        } else {
          changes.push({ file: sourceNote, oldContent: sourceContent });
        }
      }
      result.changed = changes.length > 0;
      return result;
    } finally {
      // A partial failure must still leave the entire completed part undoable.
      this.recordUndo(changes);
    }
  }

  showRolloverResult(result, destinationLabel) {
    const parts = [];
    if (!result.headingFound && result.taskCount > 0) {
      parts.push(
        `Rollover Plus couldn't find a task heading in ${destinationLabel}. Tasks were added to the end of the note.`
      );
    }
    if (result.taskCount > 0) {
      parts.push(
        `${result.taskCount} task${result.taskCount === 1 ? "" : "s"} rolled over to ${destinationLabel}.`
      );
    }
    if (result.emptyCount > 0) {
      parts.push(
        `${result.emptyCount} empty task${result.emptyCount === 1 ? "" : "s"} ${
          result.sourceDeleted ? "removed" : "skipped"
        }.`
      );
    }
    if (result.sourceWriteSkipped) {
      parts.push(
        "The source changed while the destination was being saved, so the source task was kept to avoid data loss."
      );
    }
    if (parts.length > 0) {
      const message = parts.join("\n");
      new obsidian.Notice(message, 4000 + message.length * 3);
    }
  }

  async runRolloverOperation(name, operation) {
    if (this.rolloverInProgress) {
      new obsidian.Notice("Rollover Plus is already moving tasks.", 4000);
      return;
    }

    this.rolloverInProgress = true;
    try {
      return await operation();
    } catch (error) {
      console.error(`Rollover Plus: ${name} failed`, error);
      new obsidian.Notice(
        `Rollover Plus: ${name} failed. Source tasks were kept unless the destination had already been saved.`,
        8000
      );
    } finally {
      this.rolloverInProgress = false;
    }
  }

  checkDailyNotesEnabled() {
    if (this.isDailyNotesEnabled()) {
      return true;
    }
    new obsidian.Notice(
      "Rollover Plus needs Daily Notes, or Periodic Notes with daily notes enabled.",
      10000
    );
    return false;
  }

  async rolloverToTomorrow() {
    if (!this.checkDailyNotesEnabled()) {
      return;
    }

    const now = obsidian.moment();
    const currentDailyNote = this.getDailyNoteAtDate(now);
    if (!currentDailyNote) {
      new obsidian.Notice("Rollover Plus couldn't find today's daily note.", 6000);
      return;
    }

    const sourceContent = await this.app.vault.read(currentDailyNote);
    const sourceBlocks = this.getRolloverTodoBlocksFromContent(sourceContent);
    if (sourceBlocks.length === 0) {
      new obsidian.Notice("Rollover Plus: No unfinished tasks found in today's note.", 4000);
      return;
    }

    const prepared = this.prepareTodoBlocks(sourceBlocks, true);
    const tomorrow = now.clone().add(1, "day");
    let tomorrowNote = null;
    if (prepared.lines.length > 0) {
      tomorrowNote = this.getDailyNoteAtDate(tomorrow);
      if (!tomorrowNote) {
        tomorrowNote = await this.createOrGetDailyNote(tomorrow);
      }
      if (!tomorrowNote) {
        new obsidian.Notice(
          "Rollover Plus couldn't create tomorrow's daily note. Today's tasks were kept.",
          6000
        );
        return;
      }
    }

    const result = await this.applyRollover({
      sourceNote: currentDailyNote,
      destinationNote: tomorrowNote,
      sourceContent,
      sourceBlocks,
      prepared,
    });
    this.showRolloverResult(result, "tomorrow");
  }

  async rolloverToToday(noteLimit = this.settings.rolloverToTodaySource === "past-week" ? 7 : 1) {
    if (!this.checkDailyNotesEnabled()) {
      return;
    }

    const today = obsidian.moment();
    const todayNote = this.getDailyNoteAtDate(today);
    if (!todayNote) {
      new obsidian.Notice(
        "Rollover Plus couldn't find today's daily note. Create or open it first, then run this command again.",
        7000
      );
      return;
    }

    let allDailyNotes;
    try {
      allDailyNotes = this.getAllConfiguredDailyNotes();
    } catch (error) {
      if (!(error instanceof DailyNotesFolderMissingError)) {
        throw error;
      }
      new obsidian.Notice("Rollover Plus couldn't find the daily notes folder.", 6000);
      return;
    }

    const previousNotes = this.getRecentDailyNotesBefore(today, allDailyNotes, noteLimit);
    if (previousNotes.length === 0) {
      new obsidian.Notice("Rollover Plus: No earlier daily note found.", 4000);
      return;
    }

    const sources = [];
    for (const sourceNote of previousNotes) {
      const sourceContent = await this.app.vault.read(sourceNote);
      const sourceBlocks = this.getRolloverTodoBlocksFromContent(sourceContent);
      if (sourceBlocks.length === 0) continue;
      sources.push({
        sourceNote,
        sourceContent,
        sourceBlocks,
        prepared: this.prepareTodoBlocks(sourceBlocks),
      });
    }
    if (sources.length === 0) {
      new obsidian.Notice("Rollover Plus: No unfinished tasks found in the earlier daily notes.", 4000);
      return;
    }

    const result = await this.applyRolloverBatch(sources, todayNote);
    this.showRolloverResult(result, "today");
  }

  getEditorSelectionRange(editor) {
    const from = editor.getCursor("from");
    const to = editor.getCursor("to");
    let endLine = to.line;
    if ((from.line !== to.line || from.ch !== to.ch) && to.ch === 0) {
      endLine = Math.max(from.line, to.line - 1);
    }
    return { from: { ...from }, to: { ...to }, startLine: from.line, endLine };
  }

  expandSelectedTaskBlock(lines, taskBlock) {
    if (!this.settings.rolloverChildren) {
      return taskBlock;
    }

    const parentIndent = lines[taskBlock.startLine].search(/\S/);
    let endLine = taskBlock.startLine;
    while (endLine + 1 < lines.length) {
      const nextIndent = lines[endLine + 1].search(/\S/);
      if (nextIndent <= parentIndent) {
        break;
      }
      endLine++;
    }

    return {
      startLine: taskBlock.startLine,
      endLine,
      lines: lines.slice(taskBlock.startLine, endLine + 1),
    };
  }

  getTodoBlocksInSelection(content, selection) {
    const { lines } = this.splitNoteContent(content);
    return this.getTodoBlocksFromContent(content, false)
      .filter(
        (block) =>
          block.startLine >= selection.startLine &&
          block.startLine <= selection.endLine
      )
      .map((block) => this.expandSelectedTaskBlock(lines, block));
  }

  sameEditorSelection(editor, selection) {
    const from = editor.getCursor("from");
    const to = editor.getCursor("to");
    return (
      from.line === selection.from.line &&
      from.ch === selection.from.ch &&
      to.line === selection.to.line &&
      to.ch === selection.to.ch
    );
  }

  getMinimalEditorLineEdit(before, after) {
    let startOffset = 0;
    while (
      startOffset < before.length &&
      startOffset < after.length &&
      before[startOffset] === after[startOffset]
    ) {
      startOffset++;
    }

    let beforeEndOffset = before.length;
    let afterEndOffset = after.length;
    while (
      beforeEndOffset > startOffset &&
      afterEndOffset > startOffset &&
      before[beforeEndOffset - 1] === after[afterEndOffset - 1]
    ) {
      beforeEndOffset--;
      afterEndOffset--;
    }

    return {
      replacement: after.slice(startOffset, afterEndOffset),
      from: this.getEditorPositionAtOffset(before, startOffset),
      to: this.getEditorPositionAtOffset(before, beforeEndOffset),
    };
  }

  getEditorPositionAtOffset(content, targetOffset) {
    let line = 0;
    let lineStart = 0;
    let offset = 0;

    while (offset < targetOffset) {
      if (content[offset] === "\r" && content[offset + 1] === "\n") {
        if (offset + 2 > targetOffset) {
          break;
        }
        offset += 2;
        line++;
        lineStart = offset;
      } else if (content[offset] === "\n" || content[offset] === "\r") {
        offset++;
        line++;
        lineStart = offset;
      } else {
        offset++;
      }
    }

    return { line, ch: targetOffset - lineStart };
  }

  applyEditorContentChange(editor, before, after) {
    if (typeof editor.replaceRange === "function") {
      const edit = this.getMinimalEditorLineEdit(before, after);
      editor.replaceRange(edit.replacement, edit.from, edit.to);
      return;
    }
    editor.setValue(after);
  }

  async rolloverCurrentSelection(editor, view) {
    if (!this.checkDailyNotesEnabled()) {
      return;
    }

    const sourceNote = view?.file || this.app.workspace.getActiveFile();
    if (!(sourceNote instanceof obsidian.TFile)) {
      new obsidian.Notice("Rollover Plus: Open a Markdown note and select a task first.", 5000);
      return;
    }

    const sourceContent = editor.getValue();
    const selection = this.getEditorSelectionRange(editor);
    const selectedBlocks = this.getTodoBlocksInSelection(
      sourceContent,
      selection
    );

    if (selectedBlocks.length === 0) {
      new obsidian.Notice(
        "Rollover Plus: Put the cursor on one unfinished Markdown task, or select it.",
        5000
      );
      return;
    }
    if (selectedBlocks.length > 1) {
      new obsidian.Notice("Rollover Plus: Select one task at a time.", 5000);
      return;
    }

    const prepared = this.prepareTodoBlocks(selectedBlocks, true);
    const tomorrow = obsidian.moment().add(1, "day");
    let tomorrowNote = null;
    if (prepared.lines.length > 0) {
      tomorrowNote = this.getDailyNoteAtDate(tomorrow);
      if (!tomorrowNote) {
        tomorrowNote = await this.createOrGetDailyNote(tomorrow);
      }
      if (!tomorrowNote) {
        new obsidian.Notice(
          "Rollover Plus couldn't create tomorrow's daily note. The selected task was kept.",
          6000
        );
        return;
      }
      if (sourceNote.path === tomorrowNote.path) {
        new obsidian.Notice(
          "Rollover Plus: The selected task is already in tomorrow's daily note.",
          5000
        );
        return;
      }
    }

    const result = await this.applyRollover({
      sourceNote,
      destinationNote: tomorrowNote,
      sourceContent,
      sourceBlocks: selectedBlocks,
      prepared,
      forceDeleteSource: true,
      sourceWriter: async (updatedSource) => {
        if (
          editor.getValue() !== sourceContent ||
          !this.sameEditorSelection(editor, selection)
        ) {
          return false;
        }
        this.applyEditorContentChange(editor, sourceContent, updatedSource);
        return true;
      },
    });
    this.showRolloverResult(result, "tomorrow");
  }

  async onload() {
    await this.loadSettings();
    this.undoHistory = [];
    this.undoHistoryTime = new Date();
    this.rolloverInProgress = false;

    this.addSettingTab(new RolloverSettingTab(this.app, this));

    this.addCommand({
      id: "rollover-tomorrow",
      name: "Rollover to tomorrow",
      callback: () =>
        this.runRolloverOperation("Rollover to tomorrow", () =>
          this.rolloverToTomorrow()
        ),
    });

    this.addCommand({
      id: "rollover-today",
      name: "Rollover to today",
      callback: () =>
        this.runRolloverOperation("Rollover to today", () =>
          this.rolloverToToday()
        ),
    });

    this.addCommand({
      id: "rollover-past-week",
      name: "Rollover to-dos from the past week",
      checkCallback: (checking) => {
        if (this.settings.rolloverToTodaySource === "past-week") return false;
        if (!checking) {
          void this.runRolloverOperation("Rollover from the last seven daily notes", () =>
            this.rolloverToToday(7)
          );
        }
        return true;
      },
    });

    this.addCommand({
      id: "send-selection-to-tomorrow",
      name: "Rollover current selection to tomorrow",
      editorCallback: (editor, view) =>
        this.runRolloverOperation("Selection rollover", () =>
          this.rolloverCurrentSelection(editor, view)
        ),
    });

    this.addCommand({
      id: "undo-last-rollover",
      name: "Undo last rollover",
      checkCallback: (checking) => {
        // no history, don't allow undo
        if (!this.rolloverInProgress && this.undoHistory.length > 0) {
          if (Date.now() - this.undoHistoryTime.getTime() > 120000) {
            return false;
          }
          if (!checking) {
            new UndoModal(this).open();
          }
          return true;
        }
        return false;
      },
    });
  }
}

module.exports = RolloverPlusPlugin;
