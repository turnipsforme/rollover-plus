"use strict";

const assert = require("node:assert/strict");
const Module = require("node:module");

const originalLoad = Module._load;
Module._load = function (request, parent, isMain) {
  if (request === "obsidian") {
    return {
      Modal: class {},
      Notice: class {},
      Plugin: class {},
      PluginSettingTab: class {},
      Setting: class {},
      TFile: class {},
      normalizePath: (path) => path,
    };
  }
  return originalLoad.call(this, request, parent, isMain);
};

const RolloverToTomorrowPlugin = require("../main.js");
Module._load = originalLoad;

async function run() {
  const plugin = Object.create(RolloverToTomorrowPlugin.prototype);
  plugin.loadData = async () => null;
  await plugin.loadSettings();

  assert.deepEqual(plugin.settings, {
    dailyNoteFolder: "daily-notes",
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

  console.log("Rollover regression tests passed.");
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
