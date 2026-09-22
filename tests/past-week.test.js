"use strict";

const assert = require("node:assert/strict");
const { test } = require("node:test");
const Module = require("node:module");
const moment = require("moment");
moment.now = () => new Date(2026, 8, 22, 12).getTime();

class TFile {
  constructor(path) {
    this.path = path;
    this.extension = path.split(".").pop();
    this.basename = path.split("/").pop().replace(/\.[^.]+$/, "");
  }
}
const notices = [];
const dropdowns = new Map();
class Setting {
  setName(name) { this.name = name; return this; }
  setDesc() { return this; }
  addText() { return this; }
  addToggle() { return this; }
  addDropdown(callback) {
    const control = {
      addOptions(options) { this.options = options; return this; },
      setValue(value) { this.value = value; return this; },
      onChange(handler) { this.change = handler; return this; },
    };
    callback(control);
    dropdowns.set(this.name, control);
    return this;
  }
}
const originalLoad = Module._load;
Module._load = function (request, ...args) {
  if (request === "obsidian") return {
    moment,
    TFile,
    Plugin: class {},
    Modal: class {},
    PluginSettingTab: class {
      constructor(app) { this.app = app; this.containerEl = { empty() {} }; }
    },
    Setting,
    Notice: class { constructor(text) { notices.push(text); } },
    normalizePath: (path) => path.replace(/\\/g, "/").replace(/\/+/g, "/").replace(/^\/|\/$/g, ""),
    Vault: class {
      static recurseChildren(root, callback) {
        for (const file of root.children || []) callback(file);
      }
    },
  };
  return originalLoad.call(this, request, ...args);
};
const Plugin = require("../main.js");
Module._load = originalLoad;

async function fixture(initial, settings = {}, options = {}) {
  const contents = new Map(Object.entries(initial));
  const files = new Map([...contents.keys()].map((path) => [path, new TFile(path)]));
  const writes = [];
  const reads = [];
  const commands = [];
  let settingTab;
  const folder = options.folder ?? "daily";
  const dailyOptions = { folder, format: options.format || "YYYY-MM-DD", template: options.template || "" };
  const dailyPlugin = { enabled: true, instance: { options: dailyOptions } };
  const vault = {
    getRoot: () => ({ children: [...files.values()] }),
    getAbstractFileByPath(path) {
      if (files.has(path)) return files.get(path);
      const children = [...files.values()].filter((file) => file.path.startsWith(path + "/"));
      if (children.length) return { children };
      return null;
    },
    async read(file) {
      reads.push(file.path);
      assert.ok(contents.has(file.path));
      return contents.get(file.path);
    },
    async cachedRead(file) { return this.read(file); },
    async modify(file, content) { writes.push(file.path); contents.set(file.path, content); },
    async process(file, callback) { await this.modify(file, callback(contents.get(file.path))); },
    async createFolder() {},
    async create(path, content) {
      assert.ok(!files.has(path), "must not recreate existing notes");
      const file = new TFile(path);
      files.set(path, file);
      await this.modify(file, content);
      return file;
    },
  };
  const plugin = Object.create(Plugin.prototype);
  plugin.app = {
    vault,
    internalPlugins: { getPluginById: () => dailyPlugin },
    plugins: { getPlugin: () => options.periodic || null },
    metadataCache: { getFirstLinkpathDest: (path) => files.get(path) || files.get(path + ".md") },
  };
  plugin.loadData = async () => settings;
  plugin.saveData = async (value) => { plugin.saved = { ...value }; };
  plugin.addSettingTab = (tab) => { settingTab = tab; };
  plugin.addCommand = (command) => commands.push(command);
  await plugin.onload();
  return { plugin, vault, contents, files, writes, reads, commands, settingTab, dailyPlugin };
}

const today = "daily/2026-09-22.md";
const dates = ["2026-09-21", "2026-09-19", "2026-09-15", "2026-09-12", "2026-09-07", "2026-08-30", "2026-08-01", "2026-07-28"];
const sourceNotes = () => Object.fromEntries(dates.map((date) => [`daily/${date}.md`, `## Tasks\n- [ ] ${date}`]));

test("collects exactly seven existing earlier notes across gaps, saves destination once and undoes the whole batch", async () => {
  const initial = {
    ...sourceNotes(), [today]: "## Tasks\n- [ ] today stays",
    "daily/2026-09-23.md": "- [ ] future stays",
    "daily/2026-09-20.png": "- [ ] not Markdown",
    "daily/not-a-date.md": "- [ ] not a daily note",
    "elsewhere/2026-09-20.md": "- [ ] outside the folder",
  };
  const f = await fixture(initial);
  await f.plugin.rolloverToToday(7);
  assert.equal(f.contents.get(today), "## Tasks\n- [ ] today stays\n" + dates.slice(0, 7).map((d) => `- [ ] ${d}`).join("\n"));
  assert.deepEqual(f.writes, [today, ...dates.slice(0, 7).map((d) => `daily/${d}.md`)]);
  assert.deepEqual(f.reads, dates.slice(0, 7).map((d) => `daily/${d}.md`));
  assert.equal(f.plugin.undoHistory[0].changes.length, 8);
  assert.equal(f.contents.get(`daily/${dates[7]}.md`), initial[`daily/${dates[7]}.md`]);
  await f.plugin.restoreUndoChanges(f.plugin.undoHistory[0]);
  assert.deepEqual(Object.fromEntries(f.contents), initial);
});

test("dropdown saves its choice, changes the default command, and disables the separate week command immediately", async () => {
  const f = await fixture({ ...sourceNotes(), [today]: "## Tasks" });
  await f.settingTab.display();
  const dropdown = dropdowns.get("Rollover to today source");
  assert.deepEqual(dropdown.options, { "previous-note": "Yesterday", "past-week": "Past week" });
  const week = f.commands.find((command) => command.id === "rollover-past-week");
  assert.equal(week.checkCallback(true), true);
  await dropdown.change("past-week");
  assert.equal(f.plugin.saved.rolloverToTodaySource, "past-week");
  assert.equal(week.checkCallback(true), false);
  assert.equal(week.checkCallback(false), false);
  assert.equal(f.writes.length, 0);
  await f.commands.find((command) => command.id === "rollover-today").callback();
  assert.equal(f.contents.get(today).split("\n").length, 8);
  await dropdown.change("previous-note");
  assert.equal(week.checkCallback(true), true);
  let requestedLimit;
  f.plugin.rolloverToToday = async (limit) => { requestedLimit = limit; };
  assert.equal(week.checkCallback(false), true);
  assert.equal(requestedLimit, 7);
});

test("default today command still uses only the closest earlier note", async () => {
  const f = await fixture({ ...sourceNotes(), [today]: "## Tasks" });
  await f.plugin.rolloverToToday();
  assert.equal(f.contents.get(today), `## Tasks\n- [ ] ${dates[0]}`);
  assert.equal(f.writes.length, 2);
});

test("uses all available notes when fewer than seven exist; empty notes still count toward the limit", async () => {
  const f = await fixture({ [today]: "## Tasks", "daily/2026-08-01.md": "- [ ] old task" });
  await f.plugin.rolloverToToday(7);
  assert.equal(f.contents.get(today), "## Tasks\n- [ ] old task");
  const initial = { ...sourceNotes(), [today]: "## Tasks" };
  for (const date of dates.slice(0, 7)) initial[`daily/${date}.md`] = "- [x] complete";
  const g = await fixture(initial);
  await g.plugin.rolloverToToday(7);
  assert.equal(g.writes.length, 0);
  assert.equal(g.reads.length, 7);
});

test("keeps filters, children, duplicate task text, custom statuses, newline style, and tomorrow labels", async () => {
  const source = "## Personal\r\n- [ ] leave\r\n## Work\r\n- [ ] Tomorrow: same\r\n  details\r\n- [/] finished\r\n- [x] done\r\n- [ ]\r\n## Notes\r\nkeep";
  const f = await fixture({ [today]: "## Tasks\r\n- [ ]", "daily/2026-09-21.md": source, "daily/2026-09-19.md": source }, {
    sourceHeading: "## Work", doneStatusMarkers: "xX-/",
  });
  await f.plugin.rolloverToToday(7);
  assert.equal(f.contents.get(today), "## Tasks\r\n- [ ] Tomorrow: same\r\n  details\r\n- [ ] Tomorrow: same\r\n  details");
  assert.equal(f.contents.get("daily/2026-09-21.md"), "## Personal\r\n- [ ] leave\r\n## Work\r\n- [/] finished\r\n- [x] done\r\n## Notes\r\nkeep");
  const copy = await fixture({ [today]: "## Tasks", "daily/2026-09-21.md": source }, {
    sourceHeading: "## Work", deleteOnComplete: false, rolloverChildren: false, removeEmptyTodos: false, doneStatusMarkers: "xX-/",
  });
  await copy.plugin.rolloverToToday(7);
  assert.equal(copy.contents.get("daily/2026-09-21.md"), source);
  assert.equal(copy.contents.get(today), "## Tasks\n- [ ] Tomorrow: same\n- [ ]");
  assert.deepEqual(copy.writes, [today]);
});

test("missing selected heading never falls back to other tasks", async () => {
  const f = await fixture({ [today]: "## Tasks", "daily/2026-09-21.md": "## Personal\n- [ ] leave" }, { sourceHeading: "## Work" });
  await f.plugin.rolloverToToday(7);
  assert.equal(f.writes.length, 0);
});

test("missing today and missing earlier notes leave the vault untouched", async () => {
  for (const initial of [sourceNotes(), { [today]: "## Tasks", "daily/2026-09-23.md": "- [ ] future" }]) {
    const f = await fixture(initial);
    await f.plugin.rolloverToToday(7);
    assert.equal(f.writes.length, 0);
    assert.equal(f.reads.length, 0);
  }
});

test("empty-only batches clean sources without writing today", async () => {
  const f = await fixture({ [today]: "## Tasks", "daily/2026-09-21.md": "## Tasks\n- [ ]" });
  await f.plugin.rolloverToToday(7);
  assert.equal(f.contents.get("daily/2026-09-21.md"), "");
  assert.deepEqual(f.writes, ["daily/2026-09-21.md"]);
});

test("read or destination failure cannot remove source tasks", async () => {
  for (const failure of ["read", "destination"]) {
    const initial = { ...sourceNotes(), [today]: "## Tasks" };
    const f = await fixture(initial);
    if (failure === "read") f.vault.read = async () => { throw new Error("read failed"); };
    else f.vault.process = async () => { throw new Error("save failed"); };
    await assert.rejects(f.plugin.rolloverToToday(7));
    assert.deepEqual(Object.fromEntries(f.contents), initial);
    assert.equal(f.plugin.undoHistory.length, 0);
  }
});

test("partial source failure keeps all collected tasks in today and one undo for completed writes", async () => {
  const initial = { ...sourceNotes(), [today]: "## Tasks" };
  const f = await fixture(initial);
  const process = f.vault.process.bind(f.vault);
  f.vault.process = async (file, callback) => {
    if (file.path === `daily/${dates[1]}.md`) throw new Error("source save failed");
    return process(file, callback);
  };
  await assert.rejects(f.plugin.rolloverToToday(7), /source save failed/);
  assert.equal(f.contents.get(today).split("\n").length, 8);
  assert.equal(f.contents.get(`daily/${dates[0]}.md`), "");
  assert.equal(f.contents.get(`daily/${dates[1]}.md`), initial[`daily/${dates[1]}.md`]);
  assert.equal(f.plugin.undoHistory[0].changes.length, 2);
  await f.plugin.restoreUndoChanges(f.plugin.undoHistory[0]);
  assert.deepEqual(Object.fromEntries(f.contents), initial);
});

test("concurrent destination edits survive and changed sources are kept", async () => {
  const f = await fixture({ ...sourceNotes(), [today]: "## Tasks" });
  const process = f.vault.process.bind(f.vault);
  f.vault.process = async (file, callback) => {
    if (file.path === today) {
      f.contents.set(today, "## Tasks\n- [ ] newly typed");
      f.contents.set(`daily/${dates[0]}.md`, "- [ ] edited during save");
    }
    return process(file, callback);
  };
  await f.plugin.rolloverToToday(7);
  assert.ok(f.contents.get(today).startsWith("## Tasks\n- [ ] newly typed\n"));
  assert.equal(f.contents.get(`daily/${dates[0]}.md`), "- [ ] edited during save");
  assert.ok(notices.at(-1).includes("source changed"));
});

test("an old or expired undo cannot overwrite a newer rollover", async () => {
  const f = await fixture({ ...sourceNotes(), [today]: "## Tasks" });
  await f.plugin.rolloverToToday();
  const oldUndo = f.plugin.undoHistory[0];
  await f.plugin.rolloverToToday();
  // Latest source is now empty, so complete another actual rollover first.
  await f.plugin.rolloverToToday(7);
  const snapshot = Object.fromEntries(f.contents);
  await f.plugin.restoreUndoChanges(oldUndo);
  assert.deepEqual(Object.fromEntries(f.contents), snapshot);
  f.plugin.undoHistoryTime = new Date(Date.now() - 121000);
  await f.plugin.restoreUndoChanges(f.plugin.undoHistory[0]);
  assert.deepEqual(Object.fromEntries(f.contents), snapshot);
});

test("code fences and frontmatter cannot supply task headings or source tasks", async () => {
  const { plugin } = await fixture({});
  const content = "---\ntemplate: |\n  ## Tasks\n  - [ ] YAML example\n---\n```md\n## Tasks\n- [ ] fenced example\n```\n## Tasks\n- [ ] real\n```md\n## Notes\n```\n- [ ] also real\n## Notes\nkeep";
  assert.deepEqual(plugin.getTodoBlocksFromContent(content).map((block) => block.lines[0]), ["- [ ] real", "- [ ] also real"]);
  plugin.settings.sourceHeading = "## Tasks";
  assert.equal(plugin.getRolloverTodoBlocksFromContent(content).length, 2);
  const inserted = plugin.insertTodosInNote(content, ["- [ ] inserted"], "## Tasks").content;
  assert.ok(inserted.endsWith("- [ ] also real\n- [ ] inserted\n## Notes\nkeep"));
  assert.deepEqual(plugin.extractTemplateHeadings(content), ["## Tasks", "## Notes"]);
});

test("nested date formats, folder override and root-folder notes are recognized", async () => {
  for (const folder of ["daily", ""]) {
    const prefix = folder ? folder + "/" : "";
    const initial = { [`${prefix}2026/09/22.md`]: "## Tasks", [`prefix-wrong/2026/09/21.md`]: "- [ ] wrong", [`${prefix}2026/08/07.md`]: "- [ ] nested" };
    const f = await fixture(initial, {}, { folder, format: "YYYY/MM/DD" });
    await f.plugin.rolloverToToday(7);
    assert.equal(f.contents.get(`${prefix}2026/09/22.md`), "## Tasks\n- [ ] nested");
  }
  const f = await fixture({ "override/2026-09-22.md": "## Tasks", "override/2026-09-01.md": "- [ ] override", "daily/2026-09-21.md": "- [ ] leave" }, { dailyNoteFolder: "/override/" });
  await f.plugin.rolloverToToday(7);
  assert.equal(f.contents.get("override/2026-09-22.md"), "## Tasks\n- [ ] override");
});

test("tomorrow creation uses Periodic Notes when enabled, and respects existing notes", async () => {
  let nativeCalls = 0;
  const periodic = { settings: { daily: { enabled: true, folder: "periodic", format: "YYYY-MM-DD" } } };
  const f = await fixture({ "periodic/2026-09-22.md": "- [ ] task" }, {}, { periodic });
  periodic.createDailyNote = async () => {
    nativeCalls++;
    await f.vault.create("periodic/2026-09-23.md", "## Tasks");
    // Native APIs may create the note without returning it.
  };
  f.dailyPlugin.instance.createDailyNote = () => { throw new Error("wrong provider"); };
  await f.plugin.rolloverToTomorrow();
  assert.equal(f.contents.get("periodic/2026-09-23.md"), "## Tasks\n- [ ] task");
  await f.plugin.createOrGetDailyNote(moment().add(1, "day"));
  assert.equal(nativeCalls, 1);
});

test("fallback tomorrow creation expands templates and missing templates keep sources intact", async () => {
  const template = "# {{date:YYYY-MM-DD}}\n{{title}}\n{{yesterday}} / {{tomorrow}}\n## Tasks\n- [ ]";
  const f = await fixture({ [today]: "- [ ] Tomorrow: task", "Templates/Daily.md": template }, {}, { template: "Templates/Daily" });
  await f.plugin.rolloverToTomorrow();
  assert.equal(f.contents.get("daily/2026-09-23.md"), "# 2026-09-23\n2026-09-23\n2026-09-22 / 2026-09-24\n## Tasks\n- [ ] task");
  const g = await fixture({ [today]: "- [ ] keep" }, {}, { template: "Missing" });
  await assert.rejects(g.plugin.rolloverToTomorrow(), /template not found/);
  assert.equal(g.contents.get(today), "- [ ] keep");
  assert.equal(g.writes.length, 0);
});

test("root-folder tomorrow creation never treats the filename as a folder", async () => {
  const f = await fixture({ "2026-09-22.md": "- [ ] root task" }, {}, { folder: "" });
  f.vault.createFolder = () => { throw new Error("root notes need no folder"); };
  await f.plugin.rolloverToTomorrow();
  assert.equal(f.contents.get("2026-09-23.md"), "- [ ] root task");
});

test("rollover lock prevents duplicate runs and hides undo during a move", async () => {
  const f = await fixture({ ...sourceNotes(), [today]: "## Tasks" });
  let finish;
  const waiting = new Promise((resolve) => { finish = resolve; });
  let calls = 0;
  const first = f.plugin.runRolloverOperation("first", async () => {
    calls++;
    await waiting;
    await f.plugin.rolloverToToday(7);
  });
  await f.plugin.runRolloverOperation("second", async () => { calls++; });
  assert.equal(calls, 1);
  const undo = f.commands.find((command) => command.id === "undo-last-rollover");
  assert.equal(undo.checkCallback(true), false);
  finish();
  await first;
  assert.equal(f.plugin.rolloverInProgress, false);
  assert.equal(undo.checkCallback(true), true);
});
