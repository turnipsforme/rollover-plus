"use strict";

const assert = require("node:assert/strict");
const Module = require("node:module");

class MockTFile {
  constructor(path) {
    this.path = path;
    this.extension = "md";
    this.basename = path.split("/").pop().replace(/\.md$/, "");
  }
}

const notices = [];

const originalLoad = Module._load;
Module._load = function (request, parent, isMain) {
  if (request === "obsidian") {
    return {
      Modal: class {},
      Notice: class {
        constructor(message) {
          notices.push(message);
        }
      },
      Plugin: class {},
      PluginSettingTab: class {},
      Setting: class {},
      TFile: MockTFile,
      Vault: class {
        static recurseChildren(root, callback) {
          (root.children || []).forEach((child) => {
            callback(child);
            if (child.children) {
              this.recurseChildren(child, callback);
            }
          });
        }
      },
      normalizePath: (path) => path,
    };
  }
  return originalLoad.call(this, request, parent, isMain);
};

const RolloverPlusPlugin = require("../main.js");
Module._load = originalLoad;

async function run() {
  const plugin = Object.create(RolloverPlusPlugin.prototype);
  plugin.loadData = async () => null;
  await plugin.loadSettings();

  assert.deepEqual(plugin.settings, {
    dailyNoteFolder: "",
    sourceHeading: "none",
    templateHeading: "### ⭐ Tasks:",
    deleteOnComplete: true,
    removeEmptyTodos: true,
    rolloverChildren: true,
    doneStatusMarkers: "xX-",
  });

  const tomorrow = [
    "# Fri, August 7th, 2026",
    "### ⭐️ Tasks:",
    "- [ ]",
    "### ✏️ Notes:",
    "- ",
  ].join("\r\n");

  const insertion = plugin.insertTodosInNote(
    tomorrow,
    ["- [ ] task task"],
    "### ⭐ Tasks:"
  );

  assert.equal(insertion.headingFound, true);
  assert.equal(
    insertion.content,
    [
      "# Fri, August 7th, 2026",
      "### ⭐️ Tasks:",
      "- [ ] task task",
      "### ✏️ Notes:",
      "- ",
    ].join("\r\n")
  );

  const possibleTaskHeadings = [
    "# Tasks",
    "## task",
    "### ✅ WORK TASKS •",
    "#### Personal Task-list:",
    "##### 📋 tasks for tomorrow",
    "###### Morning TASKS!!!",
  ];

  possibleTaskHeadings.forEach((heading) => {
    const note = [
      "# Tomorrow",
      heading,
      "- [ ]",
      "## Notes",
      "- ",
    ].join("\n");
    const result = plugin.insertTodosInNote(
      note,
      ["- [ ] detected task"],
      "none"
    );

    assert.equal(result.headingFound, true, heading);
    assert.equal(
      result.content,
      [
        "# Tomorrow",
        heading,
        "- [ ] detected task",
        "## Notes",
        "- ",
      ].join("\n"),
      heading
    );
  });

  assert.deepEqual(
    plugin.extractTemplateHeadings(
      [
        "# Daily note",
        "text with # not a heading",
        "  ## Work tasks  ",
        "## Work tasks",
        "#### Personal",
        "####### Not a supported heading",
      ].join("\n")
    ),
    ["# Daily note", "## Work tasks", "#### Personal"],
    "daily template headings are scanned and deduplicated for settings"
  );

  const scopedSource = [
    "# Day",
    "## Personal",
    "- [ ] leave this here",
    "## Work tasks",
    "- [ ] move this",
    "### Follow-ups",
    "- [ ] move this child-section task too",
    "## Notes",
    "- [ ] not a task for rollover",
  ].join("\n");
  plugin.settings.sourceHeading = "## Work tasks";
  assert.deepEqual(
    plugin.getRolloverTodoBlocksFromContent(scopedSource, false),
    [
      { startLine: 4, endLine: 4, lines: ["- [ ] move this"] },
      {
        startLine: 6,
        endLine: 6,
        lines: ["- [ ] move this child-section task too"],
      },
    ],
    "a selected source heading limits bulk rollover to its section"
  );
  plugin.settings.sourceHeading = "## Missing heading";
  assert.deepEqual(
    plugin.getRolloverTodoBlocksFromContent(scopedSource, false),
    [],
    "a populated source heading never falls back to tasks elsewhere"
  );
  plugin.settings.sourceHeading = "none";
  assert.equal(
    plugin.getRolloverTodoBlocksFromContent(scopedSource, false).length,
    4,
    "All headings keeps whole-note collection behavior"
  );

  plugin.settings.sourceHeading = "## Work";
  const nestedSourceHeading = [
    "# Day",
    "## Work",
    "### Tasks",
    "- [ ] move nested task",
    "## Notes",
    "keep",
  ].join("\n");
  const nestedSourceBlocks = plugin.getRolloverTodoBlocksFromContent(
    nestedSourceHeading,
    false
  );
  assert.equal(
    plugin.removeTodoBlocksFromContent(nestedSourceHeading, nestedSourceBlocks),
    ["# Day", "## Notes", "keep"].join("\n"),
    "an empty selected source section is removed after its nested tasks move"
  );
  plugin.settings.sourceHeading = "none";

  const multipleTaskHeadings = [
    "# Tomorrow",
    "## Personal Tasks",
    "- [ ] personal placeholder",
    "## Work Tasks",
    "- [ ] work placeholder",
  ].join("\n");
  const preferredHeadingResult = plugin.insertTodosInNote(
    multipleTaskHeadings,
    ["- [ ] rolled task"],
    "## Work Tasks"
  );

  assert.equal(
    preferredHeadingResult.content,
    [
      "# Tomorrow",
      "## Personal Tasks",
      "- [ ] personal placeholder",
      "## Work Tasks",
      "- [ ] work placeholder",
      "- [ ] rolled task",
    ].join("\n")
  );

  const firstDetectedHeadingResult = plugin.insertTodosInNote(
    multipleTaskHeadings,
    ["- [ ] rolled task"],
    "### Missing Preferred Heading"
  );

  assert.equal(
    firstDetectedHeadingResult.content,
    [
      "# Tomorrow",
      "## Personal Tasks",
      "- [ ] personal placeholder",
      "- [ ] rolled task",
      "## Work Tasks",
      "- [ ] work placeholder",
    ].join("\n")
  );

  const today = [
    "# Thu, August 6th, 2026",
    "### ⭐ Tasks:",
    "- [ ] task task",
    "- [x] finished task",
    "### ✏️ Notes:",
    "- ",
  ].join("\r\n");

  assert.equal(
    plugin.removeRolledOverTodos(today, ["- [ ] task task"]),
    [
      "# Thu, August 6th, 2026",
      "### ⭐ Tasks:",
      "- [x] finished task",
      "### ✏️ Notes:",
      "- ",
    ].join("\r\n")
  );

  const duplicateTasks = [
    "# Day",
    "## Tasks",
    "- [ ] same task",
    "- [ ] same task",
    "## Notes",
    "keep",
  ].join("\n");
  const duplicateBlocks = plugin.getTodoBlocksFromContent(duplicateTasks, false);
  assert.equal(duplicateBlocks.length, 2);
  assert.equal(
    plugin.removeTodoBlocksFromContent(duplicateTasks, [duplicateBlocks[0]]),
    [
      "# Day",
      "## Tasks",
      "- [ ] same task",
      "## Notes",
      "keep",
    ].join("\n"),
    "only the selected duplicate task is removed"
  );

  const onlyTaskInSection = [
    "# Day",
    "",
    "## Tasks",
    "- [ ] move me",
    "",
    "## Notes",
    "keep",
  ].join("\n");
  const onlyTaskBlock = plugin.getTodoBlocksFromContent(
    onlyTaskInSection,
    false
  )[0];
  assert.equal(
    plugin.removeTodoBlocksFromContent(onlyTaskInSection, [onlyTaskBlock]),
    ["# Day", "", "## Notes", "keep"].join("\n"),
    "an emptied task heading and its scaffold whitespace are removed"
  );

  const seamCases = [
    {
      input: ["before", "", "- [ ] move", "", "after"].join("\n"),
      expected: ["before", "", "after"].join("\n"),
      message: "middle deletion does not combine two blank separators",
    },
    {
      input: ["- [ ] move", "", "after"].join("\n"),
      expected: "after",
      message: "first-line deletion leaves no leading blank",
    },
    {
      input: ["", "- [ ] move", "after"].join("\n"),
      expected: "after",
      message: "blank-only lines before a first task are cleaned",
    },
    {
      input: ["before", "", "- [ ] move"].join("\n"),
      expected: "before",
      message: "last-line deletion leaves no trailing blank",
    },
    {
      input: ["before", "", "- [ ] move", ""].join("\n"),
      expected: "before\n",
      message: "a normal terminal newline is retained without an empty line",
    },
  ];
  seamCases.forEach(({ input, expected, message }) => {
    const block = plugin.getTodoBlocksFromContent(input, false)[0];
    assert.equal(plugin.removeTodoBlocksFromContent(input, [block]), expected, message);
  });
  assert.deepEqual(
    plugin.getMinimalEditorLineEdit(
      ["before", "", "- [ ] move", "", "after"].join("\n"),
      ["before", "", "after"].join("\n")
    ),
    {
      replacement: "",
      from: { line: 2, ch: 0 },
      to: { line: 4, ch: 0 },
    },
    "selection rollover edits only the changed editor lines"
  );

  const positionToOffset = (content, position) => {
    let offset = 0;
    for (let line = 0; line < position.line; line++) {
      const match = content.slice(offset).match(/\r\n|\n|\r/);
      assert.ok(match, "editor position must point to an existing line");
      offset += match.index + match[0].length;
    }
    return offset + position.ch;
  };
  const applyLineEdit = (content, edit) => {
    const fromOffset = positionToOffset(content, edit.from);
    const toOffset = positionToOffset(content, edit.to);
    return (
      content.slice(0, fromOffset) +
      edit.replacement +
      content.slice(toOffset)
    );
  };
  const editorRoundTrips = [
    ["before\n\n- [ ] move\n\nafter", "before\n\nafter"],
    ["- [ ] move\n\nafter", "after"],
    ["keep\n- [ ] move", "keep"],
    ["keep\n- [ ] move\n", "keep\n"],
    ["keep\n\n- [ ] move\n", "keep\n"],
    ["- [ ] move", ""],
    ["before\r\n\r\n- [ ] move\r\n\r\nafter", "before\r\n\r\nafter"],
    ["keep\r\n\r\n- [ ] move\r\n", "keep\r\n"],
  ];
  editorRoundTrips.forEach(([before, after]) => {
    const edit = plugin.getMinimalEditorLineEdit(before, after);
    assert.equal(
      applyLineEdit(before, edit),
      after,
      `editor range must reproduce ${JSON.stringify(after)}`
    );
  });

  const taskHeadingWithChildSection = [
    "## Tasks",
    "- [ ] move me",
    "### Work",
    "- [x] completed task",
  ].join("\n");
  const parentTaskBlock = plugin.getTodoBlocksFromContent(
    taskHeadingWithChildSection,
    false
  )[0];
  assert.equal(
    plugin.removeTodoBlocksFromContent(taskHeadingWithChildSection, [
      parentTaskBlock,
    ]),
    ["## Tasks", "### Work", "- [x] completed task"].join("\n"),
    "a child heading keeps its parent task heading alive"
  );

  plugin.settings.sourceHeading = "## Next up";
  const customHeading = [
    "# Day",
    "## Next up",
    "- [ ] selected",
    "- [ ]",
    "## Notes",
    "keep",
  ].join("\n");
  const customHeadingBlock = plugin.getTodoBlocksFromContent(
    customHeading,
    false
  )[0];
  assert.equal(
    plugin.removeTodoBlocksFromContent(customHeading, [customHeadingBlock]),
    ["# Day", "## Notes", "keep"].join("\n"),
    "the configured non-Task heading and empty placeholder are removed"
  );
  plugin.settings.sourceHeading = "none";

  const meaningfulEmptyParent = ["- [ ]", "  child detail"].join("\n");
  const meaningfulBlock = plugin.getTodoBlocksFromContent(
    meaningfulEmptyParent,
    true
  );
  const meaningfulPrepared = plugin.prepareTodoBlocks(meaningfulBlock, false);
  assert.equal(meaningfulPrepared.taskCount, 1);
  assert.deepEqual(meaningfulPrepared.lines, ["- [ ]", "  child detail"]);

  const emptyBlock = plugin.getTodoBlocksFromContent("- [ ]", true);
  const emptyPrepared = plugin.prepareTodoBlocks(emptyBlock, false);
  assert.equal(emptyPrepared.taskCount, 0);
  assert.equal(emptyPrepared.emptyCount, 1);
  assert.deepEqual(emptyPrepared.lines, []);

  assert.equal(
    plugin.removeTomorrowMentionFromTask("- [ ] Tomorrow: keep everything"),
    "- [ ] keep everything"
  );
  assert.equal(
    plugin.removeTomorrowMentionFromTask("  * [/] tmrw - keep metadata  "),
    "  * [/] keep metadata  "
  );

  const selectionEditor = {
    getCursor(which) {
      return which === "from" ? { line: 2, ch: 3 } : { line: 4, ch: 0 };
    },
  };
  assert.deepEqual(plugin.getEditorSelectionRange(selectionEditor), {
    from: { line: 2, ch: 3 },
    to: { line: 4, ch: 0 },
    startLine: 2,
    endLine: 3,
  });

  const nestedTasks = [
    "- [ ] parent",
    "  parent detail",
    "  - [ ] selected child",
    "    child detail",
    "  - [ ] sibling child",
  ].join("\n");
  assert.deepEqual(
    plugin.getTodoBlocksInSelection(nestedTasks, {
      startLine: 2,
      endLine: 2,
    }),
    [
      {
        startLine: 2,
        endLine: 3,
        lines: ["  - [ ] selected child", "    child detail"],
      },
    ],
    "selecting a nested task moves that task, not its unfinished parent"
  );
  assert.deepEqual(
    plugin.getTodoBlocksInSelection("Example: - [ ] not a real task", {
      startLine: 0,
      endLine: 0,
    }),
    [],
    "inline checkbox examples are not treated as tasks"
  );
  const fencedExample = ["```md", "- [ ] example only", "```"].join("\n");
  assert.deepEqual(
    plugin.getTodoBlocksInSelection(fencedExample, {
      startLine: 1,
      endLine: 1,
    }),
    [],
    "tasks inside fenced code blocks cannot be moved"
  );

  const makeDate = (value) => ({
    isBefore(other) {
      return value < other.valueOf();
    },
    valueOf() {
      return value;
    },
  });
  const olderFile = new MockTFile("daily/2026-08-01.md");
  const closestFile = new MockTFile("daily/2026-08-07.md");
  const futureFile = new MockTFile("daily/2026-08-10.md");
  olderFile.testDate = makeDate(1);
  closestFile.testDate = makeDate(7);
  futureFile.testDate = makeDate(10);
  plugin.getDateFromDailyNote = (file) => file.testDate;
  assert.equal(
    plugin.getMostRecentDailyNoteBefore(makeDate(8), {
      older: olderFile,
      closest: closestFile,
      future: futureFile,
    }),
    closestFile,
    "rollover to today uses the closest strictly earlier note"
  );

  const originalWindow = global.window;
  global.window = {
    moment: () => ({
      clone() {
        return this;
      },
      add() {
        return this;
      },
    }),
  };

  const timeMoment = global.window.moment;
  let nestedParseArguments = null;
  global.window.app = {
    plugins: { getPlugin: () => null },
    internalPlugins: {
      getPluginById: () => ({
        instance: {
          options: { folder: "daily", format: "YYYY/MM/DD", template: "" },
        },
      }),
    },
  };
  global.window.moment = (...args) => {
    nestedParseArguments = args;
    return { isValid: () => true };
  };
  plugin.settings.dailyNoteFolder = "";
  const nestedDailyFile = new MockTFile("daily/2026/08/07.md");
  RolloverPlusPlugin.prototype.getDateFromDailyNote.call(
    plugin,
    nestedDailyFile
  );
  assert.deepEqual(nestedParseArguments, ["2026/08/07", "YYYY/MM/DD", true]);
  plugin.app = {
    vault: {
      getRoot: () => ({ children: [] }),
      getAbstractFileByPath: (path) => {
        assert.equal(path, "daily");
        return { children: [nestedDailyFile] };
      },
    },
  };
  const nestedEntries =
    RolloverPlusPlugin.prototype.getAllConfiguredDailyNotes.call(plugin);
  assert.equal(nestedEntries.length, 1);
  assert.equal(nestedEntries[0].file, nestedDailyFile);
  global.window.moment = timeMoment;

  const previousDailyFile = new MockTFile("daily/2026-08-07.md");
  const todayDailyFile = new MockTFile("daily/2026-08-08.md");
  const rolloverWrites = [];
  const noteContents = new Map([
    [previousDailyFile.path, ["## Tasks", "- [ ] from earlier", ""].join("\n")],
    [todayDailyFile.path, ["## Tasks", "- [ ]"].join("\n")],
  ]);
  plugin.checkDailyNotesEnabled = () => true;
  plugin.getDailyNoteAtDate = () => todayDailyFile;
  plugin.getAllConfiguredDailyNotes = () => ({ today: todayDailyFile });
  plugin.getDailyNoteFromCollection = () => todayDailyFile;
  plugin.getMostRecentDailyNoteBefore = () => previousDailyFile;
  plugin.app = {
    vault: {
      read: async (file) => noteContents.get(file.path),
      modify: async (file, content) => {
        rolloverWrites.push(file.path);
        noteContents.set(file.path, content);
      },
    },
  };
  plugin.undoHistory = [];
  await plugin.rolloverToToday();
  assert.deepEqual(rolloverWrites, [todayDailyFile.path, previousDailyFile.path]);
  assert.equal(noteContents.get(todayDailyFile.path), "## Tasks\n- [ ] from earlier");
  assert.equal(noteContents.get(previousDailyFile.path), "");

  let tomorrowCreationCount = 0;
  plugin.getDailyNoteAtDate = () => todayDailyFile;
  plugin.createOrGetDailyNote = async () => {
    tomorrowCreationCount++;
    return new MockTFile("daily/2026-08-09.md");
  };
  noteContents.set(todayDailyFile.path, "# Today\nNo open tasks");
  await plugin.rolloverToTomorrow();
  assert.equal(
    tomorrowCreationCount,
    0,
    "tomorrow's note is not created when there is nothing to roll over"
  );

  const selectionSourceFile = new MockTFile("notes/inbox.md");
  const selectionDestinationFile = new MockTFile("daily/2026-08-09.md");
  let selectionSourceContent = [
    "## Tasks",
    "- [ ] first",
    "- [ ] selected task",
    "- [ ] last",
  ].join("\n");
  const cursorState = {
    from: { line: 2, ch: 8 },
    to: { line: 2, ch: 16 },
  };
  const editor = {
    getValue: () => selectionSourceContent,
    getCursor: (which) => ({ ...cursorState[which] }),
    setValue: (value) => {
      selectionSourceContent = value;
    },
  };
  let selectionDestinationContent = "## Tasks\n- [ ]";
  plugin.getDailyNoteAtDate = () => selectionDestinationFile;
  plugin.app = {
    workspace: { getActiveFile: () => selectionSourceFile },
    vault: {
      read: async () => selectionDestinationContent,
      modify: async (file, content) => {
        assert.equal(file, selectionDestinationFile);
        selectionDestinationContent = content;
      },
    },
  };
  plugin.undoHistory = [];
  await plugin.rolloverCurrentSelection(editor, { file: selectionSourceFile });
  assert.equal(
    selectionDestinationContent,
    "## Tasks\n- [ ] selected task",
    "a partial text selection moves the full task line"
  );
  assert.equal(
    selectionSourceContent,
    ["## Tasks", "- [ ] first", "- [ ] last"].join("\n")
  );

  global.window = originalWindow;

  const sourceFile = new MockTFile("daily/2026-08-08.md");
  const destinationFile = new MockTFile("daily/2026-08-09.md");
  const sourceContent = [
    "# Day",
    "## Tasks",
    "- [ ] selected",
    "- [ ] identical",
    "- [ ] identical",
    "## Notes",
    "keep",
  ].join("\n");
  const sourceBlocks = plugin.getTodoBlocksFromContent(sourceContent, false);
  const selectedBlock = sourceBlocks[1];
  const preparedSelection = plugin.prepareTodoBlocks([selectedBlock], true);
  const events = [];
  let editorSource = sourceContent;
  plugin.undoHistory = [];
  plugin.app = {
    vault: {
      read: async (file) => {
        events.push(`read:${file.path}`);
        return ["# Tomorrow", "## Tasks", "- [ ]"].join("\n");
      },
      modify: async (file) => {
        events.push(`modify:${file.path}`);
      },
    },
  };
  const moveResult = await plugin.applyRollover({
    sourceNote: sourceFile,
    destinationNote: destinationFile,
    sourceContent,
    sourceBlocks: [selectedBlock],
    prepared: preparedSelection,
    forceDeleteSource: true,
    sourceWriter: async (updatedSource) => {
      events.push(`write:${sourceFile.path}`);
      editorSource = updatedSource;
      return true;
    },
  });
  assert.deepEqual(events, [
    `read:${destinationFile.path}`,
    `read:${destinationFile.path}`,
    `modify:${destinationFile.path}`,
    `write:${sourceFile.path}`,
  ]);
  assert.equal(
    editorSource,
    [
      "# Day",
      "## Tasks",
      "- [ ] selected",
      "- [ ] identical",
      "## Notes",
      "keep",
    ].join("\n"),
    "the exact selected duplicate is removed"
  );
  assert.equal(moveResult.sourceDeleted, true);
  assert.equal(plugin.undoHistory[0].changes.length, 2);

  const undoInstance = plugin.undoHistory[0];
  const undoWrites = [];
  plugin.app.vault.modify = async (file) => {
    undoWrites.push(file.path);
    if (file === destinationFile) {
      throw new Error("destination restore failed");
    }
  };
  await assert.rejects(
    plugin.restoreUndoChanges(undoInstance),
    /destination restore failed/
  );
  assert.deepEqual(
    undoWrites,
    [sourceFile.path, destinationFile.path],
    "undo restores the source first so a partial failure can only duplicate data"
  );
  assert.equal(plugin.undoHistory[0], undoInstance);

  let sourceWriterCalled = false;
  plugin.undoHistory = [];
  plugin.app.vault.modify = async () => {
    throw new Error("destination write failed");
  };
  await assert.rejects(
    plugin.applyRollover({
      sourceNote: sourceFile,
      destinationNote: destinationFile,
      sourceContent,
      sourceBlocks: [selectedBlock],
      prepared: preparedSelection,
      forceDeleteSource: true,
      sourceWriter: async () => {
        sourceWriterCalled = true;
        return true;
      },
    }),
    /destination write failed/
  );
  assert.equal(sourceWriterCalled, false, "destination failure keeps the source");
  assert.deepEqual(plugin.undoHistory, []);

  plugin.undoHistory = [];
  plugin.app.vault.modify = async () => {};
  const skippedResult = await plugin.applyRollover({
    sourceNote: sourceFile,
    destinationNote: destinationFile,
    sourceContent,
    sourceBlocks: [selectedBlock],
    prepared: preparedSelection,
    forceDeleteSource: true,
    sourceWriter: async () => false,
  });
  assert.equal(skippedResult.sourceWriteSkipped, true);
  assert.equal(skippedResult.sourceDeleted, false);
  assert.equal(
    plugin.undoHistory[0].changes.length,
    1,
    "a concurrent source edit leaves an undo entry for the destination only"
  );

  let fallbackReadCount = 0;
  let rebasedDestination = "";
  plugin.app.vault = {
    read: async () => {
      fallbackReadCount++;
      return fallbackReadCount === 1
        ? "## Tasks\n- [ ]"
        : "## Tasks\n- [ ] concurrent edit";
    },
    modify: async (_file, content) => {
      rebasedDestination = content;
    },
  };
  await plugin.insertIntoDestination(destinationFile, ["- [ ] moved task"]);
  assert.equal(
    rebasedDestination,
    ["## Tasks", "- [ ] concurrent edit", "- [ ] moved task"].join("\n"),
    "the fallback path rebases insertion on the latest destination content"
  );

  let unsafeSourceModifyCalled = false;
  plugin.app.vault = {
    read: async () => "source changed during destination I/O",
    modify: async () => {
      unsafeSourceModifyCalled = true;
    },
  };
  assert.equal(
    await plugin.writeSourceSafely(sourceFile, sourceContent, "updated"),
    false
  );
  assert.equal(unsafeSourceModifyCalled, false);

  const atomicContents = new Map([
    [sourceFile.path, sourceContent],
    [destinationFile.path, "## Tasks\n- [ ]"],
  ]);
  const atomicEvents = [];
  plugin.undoHistory = [];
  plugin.app.vault = {
    process: async (file, update) => {
      atomicEvents.push(file.path);
      atomicContents.set(file.path, update(atomicContents.get(file.path)));
    },
    read: async () => {
      throw new Error("atomic path should not call read");
    },
    modify: async () => {
      throw new Error("atomic path should not call modify");
    },
  };
  await plugin.applyRollover({
    sourceNote: sourceFile,
    destinationNote: destinationFile,
    sourceContent,
    sourceBlocks: [selectedBlock],
    prepared: preparedSelection,
    forceDeleteSource: true,
  });
  assert.deepEqual(atomicEvents, [destinationFile.path, sourceFile.path]);
  assert.equal(
    atomicContents.get(destinationFile.path),
    ["## Tasks", "- [ ] identical"].join("\n")
  );
  assert.equal(
    atomicContents.get(sourceFile.path),
    [
      "# Day",
      "## Tasks",
      "- [ ] selected",
      "- [ ] identical",
      "## Notes",
      "keep",
    ].join("\n")
  );

  plugin.undoHistory = [];
  const emptySourceContent = ["## Tasks", "- [ ]", ""].join("\n");
  plugin.app.vault = {
    read: async (file) => {
      assert.equal(file, sourceFile);
      return emptySourceContent;
    },
    modify: async (file, content) => {
      assert.equal(file, sourceFile);
      assert.equal(content, "");
    },
  };
  const emptySourceBlocks = plugin.getTodoBlocksFromContent(
    emptySourceContent,
    false
  );
  const emptyOnlyResult = await plugin.applyRollover({
    sourceNote: sourceFile,
    destinationNote: null,
    sourceContent: emptySourceContent,
    sourceBlocks: emptySourceBlocks,
    prepared: plugin.prepareTodoBlocks(emptySourceBlocks, false),
  });
  assert.equal(emptyOnlyResult.emptyCount, 1);
  assert.equal(plugin.undoHistory[0].changes.length, 1);

  const commandPlugin = Object.create(RolloverPlusPlugin.prototype);
  commandPlugin.loadData = async () => null;
  commandPlugin.app = {};
  commandPlugin.addSettingTab = () => {};
  const commands = [];
  commandPlugin.addCommand = (command) => commands.push(command);
  await commandPlugin.onload();
  assert.deepEqual(
    commands.map(({ id, name }) => ({ id, name })),
    [
      {
        id: "rollover-tomorrow",
        name: "Rollover to tomorrow",
      },
      {
        id: "rollover-today",
        name: "Rollover to today",
      },
      {
        id: "send-selection-to-tomorrow",
        name: "Rollover current selection to tomorrow",
      },
      {
        id: "undo-last-rollover",
        name: "Undo last rollover",
      },
    ]
  );

  console.log("Rollover regression tests passed.");
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
