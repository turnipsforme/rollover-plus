'use strict';

var obsidian = require('obsidian');

function _interopDefaultLegacy (e) { return e && typeof e === 'object' && 'default' in e ? e : { 'default': e }; }

var obsidian__default = /*#__PURE__*/_interopDefaultLegacy(obsidian);

function createCommonjsModule(fn, basedir, module) {
	return module = {
		path: basedir,
		exports: {},
		require: function (path, base) {
			return commonjsRequire(path, (base === undefined || base === null) ? module.path : base);
		}
	}, fn(module, module.exports), module.exports;
}

function commonjsRequire () {
	throw new Error('Dynamic requires are not currently supported by @rollup/plugin-commonjs');
}

var main = createCommonjsModule(function (module, exports) {

Object.defineProperty(exports, '__esModule', { value: true });



const DEFAULT_DAILY_NOTE_FORMAT = "YYYY-MM-DD";
const DEFAULT_WEEKLY_NOTE_FORMAT = "gggg-[W]ww";
const DEFAULT_MONTHLY_NOTE_FORMAT = "YYYY-MM";
const DEFAULT_QUARTERLY_NOTE_FORMAT = "YYYY-[Q]Q";
const DEFAULT_YEARLY_NOTE_FORMAT = "YYYY";

function shouldUsePeriodicNotesSettings(periodicity) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const periodicNotes = window.app.plugins.getPlugin("periodic-notes");
    return periodicNotes && periodicNotes.settings?.[periodicity]?.enabled;
}
/**
 * Read the user settings for the `daily-notes` plugin
 * to keep behavior of creating a new note in-sync.
 */
function getDailyNoteSettings() {
    try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { internalPlugins, plugins } = window.app;
        if (shouldUsePeriodicNotesSettings("daily")) {
            const { format, folder, template } = plugins.getPlugin("periodic-notes")?.settings?.daily || {};
            return {
                format: format || DEFAULT_DAILY_NOTE_FORMAT,
                folder: folder?.trim() || "",
                template: template?.trim() || "",
            };
        }
        const { folder, format, template } = internalPlugins.getPluginById("daily-notes")?.instance?.options || {};
        return {
            format: format || DEFAULT_DAILY_NOTE_FORMAT,
            folder: folder?.trim() || "",
            template: template?.trim() || "",
        };
    }
    catch (err) {
        console.info("No custom daily note settings found!", err);
    }
}
function getEffectiveDailyNoteSettings(overrideFolder = "") {
    const settings = getDailyNoteSettings() || {
        format: DEFAULT_DAILY_NOTE_FORMAT,
        folder: "",
        template: "",
    };
    const normalizedOverrideFolder = overrideFolder?.trim() || "";
    if (!normalizedOverrideFolder) {
        return settings;
    }
    return {
        ...settings,
        folder: normalizedOverrideFolder,
    };
}
/**
 * Read the user settings for the `weekly-notes` plugin
 * to keep behavior of creating a new note in-sync.
 */
function getWeeklyNoteSettings() {
    try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const pluginManager = window.app.plugins;
        const calendarSettings = pluginManager.getPlugin("calendar")?.options;
        const periodicNotesSettings = pluginManager.getPlugin("periodic-notes")?.settings?.weekly;
        if (shouldUsePeriodicNotesSettings("weekly")) {
            return {
                format: periodicNotesSettings.format || DEFAULT_WEEKLY_NOTE_FORMAT,
                folder: periodicNotesSettings.folder?.trim() || "",
                template: periodicNotesSettings.template?.trim() || "",
            };
        }
        const settings = calendarSettings || {};
        return {
            format: settings.weeklyNoteFormat || DEFAULT_WEEKLY_NOTE_FORMAT,
            folder: settings.weeklyNoteFolder?.trim() || "",
            template: settings.weeklyNoteTemplate?.trim() || "",
        };
    }
    catch (err) {
        console.info("No custom weekly note settings found!", err);
    }
}
/**
 * Read the user settings for the `periodic-notes` plugin
 * to keep behavior of creating a new note in-sync.
 */
function getMonthlyNoteSettings() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pluginManager = window.app.plugins;
    try {
        const settings = (shouldUsePeriodicNotesSettings("monthly") &&
            pluginManager.getPlugin("periodic-notes")?.settings?.monthly) ||
            {};
        return {
            format: settings.format || DEFAULT_MONTHLY_NOTE_FORMAT,
            folder: settings.folder?.trim() || "",
            template: settings.template?.trim() || "",
        };
    }
    catch (err) {
        console.info("No custom monthly note settings found!", err);
    }
}
/**
 * Read the user settings for the `periodic-notes` plugin
 * to keep behavior of creating a new note in-sync.
 */
function getQuarterlyNoteSettings() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pluginManager = window.app.plugins;
    try {
        const settings = (shouldUsePeriodicNotesSettings("quarterly") &&
            pluginManager.getPlugin("periodic-notes")?.settings?.quarterly) ||
            {};
        return {
            format: settings.format || DEFAULT_QUARTERLY_NOTE_FORMAT,
            folder: settings.folder?.trim() || "",
            template: settings.template?.trim() || "",
        };
    }
    catch (err) {
        console.info("No custom quarterly note settings found!", err);
    }
}
/**
 * Read the user settings for the `periodic-notes` plugin
 * to keep behavior of creating a new note in-sync.
 */
function getYearlyNoteSettings() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pluginManager = window.app.plugins;
    try {
        const settings = (shouldUsePeriodicNotesSettings("yearly") &&
            pluginManager.getPlugin("periodic-notes")?.settings?.yearly) ||
            {};
        return {
            format: settings.format || DEFAULT_YEARLY_NOTE_FORMAT,
            folder: settings.folder?.trim() || "",
            template: settings.template?.trim() || "",
        };
    }
    catch (err) {
        console.info("No custom yearly note settings found!", err);
    }
}

// Credit: @creationix/path.js
function join(...partSegments) {
    // Split the inputs into a list of path commands.
    let parts = [];
    for (let i = 0, l = partSegments.length; i < l; i++) {
        parts = parts.concat(partSegments[i].split("/"));
    }
    // Interpret the path commands to get the new resolved path.
    const newParts = [];
    for (let i = 0, l = parts.length; i < l; i++) {
        const part = parts[i];
        // Remove leading and trailing slashes
        // Also remove "." segments
        if (!part || part === ".")
            continue;
        // Push new path segments.
        else
            newParts.push(part);
    }
    // Preserve the initial slash if there was one.
    if (parts[0] === "")
        newParts.unshift("");
    // Turn back into a single string path.
    return newParts.join("/");
}
function basename(fullPath) {
    let base = fullPath.substring(fullPath.lastIndexOf("/") + 1);
    if (base.lastIndexOf(".") != -1)
        base = base.substring(0, base.lastIndexOf("."));
    return base;
}
async function ensureFolderExists(path) {
    const dirs = path.replace(/\\/g, "/").split("/");
    dirs.pop(); // remove basename
    if (dirs.length) {
        const dir = join(...dirs);
        if (!window.app.vault.getAbstractFileByPath(dir)) {
            await window.app.vault.createFolder(dir);
        }
    }
}
async function getNotePath(directory, filename) {
    if (!filename.endsWith(".md")) {
        filename += ".md";
    }
    const path = obsidian__default["default"].normalizePath(join(directory, filename));
    await ensureFolderExists(path);
    return path;
}
async function getTemplateInfo(template) {
    const { metadataCache, vault } = window.app;
    const templatePath = obsidian__default["default"].normalizePath(template);
    if (templatePath === "/") {
        return Promise.resolve(["", null]);
    }
    try {
        const templateFile = metadataCache.getFirstLinkpathDest(templatePath, "");
        const contents = await vault.cachedRead(templateFile);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const IFoldInfo = window.app.foldManager.load(templateFile);
        return [contents, IFoldInfo];
    }
    catch (err) {
        console.error(`Failed to read the daily note template '${templatePath}'`, err);
        new obsidian__default["default"].Notice("Failed to read the daily note template");
        return ["", null];
    }
}

/**
 * dateUID is a way of weekly identifying daily/weekly/monthly notes.
 * They are prefixed with the granularity to avoid ambiguity.
 */
function getDateUID(date, granularity = "day") {
    const ts = date.clone().startOf(granularity).format();
    return `${granularity}-${ts}`;
}
function removeEscapedCharacters(format) {
    return format.replace(/\[[^\]]*\]/g, ""); // remove everything within brackets
}
/**
 * XXX: When parsing dates that contain both week numbers and months,
 * Moment choses to ignore the week numbers. For the week dateUID, we
 * want the opposite behavior. Strip the MMM from the format to patch.
 */
function isFormatAmbiguous(format, granularity) {
    if (granularity === "week") {
        const cleanFormat = removeEscapedCharacters(format);
        return (/w{1,2}/i.test(cleanFormat) &&
            (/M{1,4}/.test(cleanFormat) || /D{1,4}/.test(cleanFormat)));
    }
    return false;
}
function getDateFromFile(file, granularity) {
    return getDateFromFilename(file.basename, granularity);
}
function getDateFromPath(path, granularity) {
    return getDateFromFilename(basename(path), granularity);
}
function getDateFromFilename(filename, granularity) {
    const getSettings = {
        day: getDailyNoteSettings,
        week: getWeeklyNoteSettings,
        month: getMonthlyNoteSettings,
        quarter: getQuarterlyNoteSettings,
        year: getYearlyNoteSettings,
    };
    const format = getSettings[granularity]().format.split("/").pop();
    const noteDate = window.moment(filename, format, true);
    if (!noteDate.isValid()) {
        return null;
    }
    if (isFormatAmbiguous(format, granularity)) {
        if (granularity === "week") {
            const cleanFormat = removeEscapedCharacters(format);
            if (/w{1,2}/i.test(cleanFormat)) {
                return window.moment(filename, 
                // If format contains week, remove day & month formatting
                format.replace(/M{1,4}/g, "").replace(/D{1,4}/g, ""), false);
            }
        }
    }
    return noteDate;
}

class DailyNotesFolderMissingError extends Error {
}
/**
 * This function mimics the behavior of the daily-notes plugin
 * so it will replace {{date}}, {{title}}, and {{time}} with the
 * formatted timestamp.
 *
 * Note: it has an added bonus that it's not 'today' specific.
 */
async function createDailyNote(date, overrideFolder = "") {
    const app = window.app;
    const { vault } = app;
    const moment = window.moment;
    const { template, format, folder } = getEffectiveDailyNoteSettings(overrideFolder);
    const [templateContents, IFoldInfo] = await getTemplateInfo(template);
    const filename = date.format(format);
    const normalizedPath = await getNotePath(folder, filename);
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        app.foldManager.save(createdFile, IFoldInfo);
        return createdFile;
    }
    catch (err) {
        console.error(`Failed to create file: '${normalizedPath}'`, err);
        new obsidian__default["default"].Notice("Unable to create new file.");
    }
}
function getDailyNote(date, dailyNotes) {
    return dailyNotes[getDateUID(date, "day")] ?? null;
}
function getAllDailyNotes(overrideFolder = "") {
    /**
     * Find all daily notes in the daily note folder
     */
    const { vault } = window.app;
    const { folder } = getEffectiveDailyNoteSettings(overrideFolder);
    const dailyNotesFolder = vault.getAbstractFileByPath(obsidian__default["default"].normalizePath(folder));
    if (!dailyNotesFolder) {
        throw new DailyNotesFolderMissingError("Failed to find daily notes folder");
    }
    const dailyNotes = {};
    obsidian__default["default"].Vault.recurseChildren(dailyNotesFolder, (note) => {
        if (note instanceof obsidian__default["default"].TFile) {
            const date = getDateFromFile(note, "day");
            if (date) {
                const dateString = getDateUID(date, "day");
                dailyNotes[dateString] = note;
            }
        }
    });
    return dailyNotes;
}
async function createOrGetDailyNote(date, overrideFolder = "") {
    const app = window.app;
    const settings = getEffectiveDailyNoteSettings(overrideFolder);
    const filename = date.format(settings.format);
    const normalizedPath = await getNotePath(settings.folder, filename);
    const existingFile = app.vault.getAbstractFileByPath(normalizedPath);
    if (existingFile instanceof obsidian__default["default"].TFile) {
        return existingFile;
    }
    if (!overrideFolder) {
        try {
            const dailyNotesPlugin = app.internalPlugins?.getPluginById?.("daily-notes")?.instance;
            if (dailyNotesPlugin?.createDailyNote) {
                const nativeFile = await dailyNotesPlugin.createDailyNote(date.clone());
                if (nativeFile) {
                    return nativeFile;
                }
            }
        }
        catch (err) {
            console.info("Unable to create daily note with native daily-notes plugin, falling back.", err);
        }
        try {
            const periodicNotesPlugin = app.plugins.getPlugin("periodic-notes");
            if (shouldUsePeriodicNotesSettings("daily") && periodicNotesPlugin?.createDailyNote) {
                const nativeFile = await periodicNotesPlugin.createDailyNote(date.clone());
                if (nativeFile) {
                    return nativeFile;
                }
            }
        }
        catch (err) {
            console.info("Unable to create daily note with periodic-notes plugin, falling back.", err);
        }
    }
    return createDailyNote(date, overrideFolder);
}

class WeeklyNotesFolderMissingError extends Error {
}
function getDaysOfWeek() {
    const { moment } = window;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let weekStart = moment.localeData()._week.dow;
    const daysOfWeek = [
        "sunday",
        "monday",
        "tuesday",
        "wednesday",
        "thursday",
        "friday",
        "saturday",
    ];
    while (weekStart) {
        daysOfWeek.push(daysOfWeek.shift());
        weekStart--;
    }
    return daysOfWeek;
}
function getDayOfWeekNumericalValue(dayOfWeekName) {
    return getDaysOfWeek().indexOf(dayOfWeekName.toLowerCase());
}
async function createWeeklyNote(date) {
    const { vault } = window.app;
    const { template, format, folder } = getWeeklyNoteSettings();
    const [templateContents, IFoldInfo] = await getTemplateInfo(template);
    const filename = date.format(format);
    const normalizedPath = await getNotePath(folder, filename);
    try {
        const createdFile = await vault.create(normalizedPath, templateContents
            .replace(/{{\s*(date|time)\s*(([+-]\d+)([yqmwdhs]))?\s*(:.+?)?}}/gi, (_, _timeOrDate, calc, timeDelta, unit, momentFormat) => {
            const now = window.moment();
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
            .replace(/{{\s*title\s*}}/gi, filename)
            .replace(/{{\s*time\s*}}/gi, window.moment().format("HH:mm"))
            .replace(/{{\s*(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\s*:(.*?)}}/gi, (_, dayOfWeek, momentFormat) => {
            const day = getDayOfWeekNumericalValue(dayOfWeek);
            return date.weekday(day).format(momentFormat.trim());
        }));
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        window.app.foldManager.save(createdFile, IFoldInfo);
        return createdFile;
    }
    catch (err) {
        console.error(`Failed to create file: '${normalizedPath}'`, err);
        new obsidian__default["default"].Notice("Unable to create new file.");
    }
}
function getWeeklyNote(date, weeklyNotes) {
    return weeklyNotes[getDateUID(date, "week")] ?? null;
}
function getAllWeeklyNotes() {
    const weeklyNotes = {};
    if (!appHasWeeklyNotesPluginLoaded()) {
        return weeklyNotes;
    }
    const { vault } = window.app;
    const { folder } = getWeeklyNoteSettings();
    const weeklyNotesFolder = vault.getAbstractFileByPath(obsidian__default["default"].normalizePath(folder));
    if (!weeklyNotesFolder) {
        throw new WeeklyNotesFolderMissingError("Failed to find weekly notes folder");
    }
    obsidian__default["default"].Vault.recurseChildren(weeklyNotesFolder, (note) => {
        if (note instanceof obsidian__default["default"].TFile) {
            const date = getDateFromFile(note, "week");
            if (date) {
                const dateString = getDateUID(date, "week");
                weeklyNotes[dateString] = note;
            }
        }
    });
    return weeklyNotes;
}

class MonthlyNotesFolderMissingError extends Error {
}
/**
 * This function mimics the behavior of the daily-notes plugin
 * so it will replace {{date}}, {{title}}, and {{time}} with the
 * formatted timestamp.
 *
 * Note: it has an added bonus that it's not 'today' specific.
 */
async function createMonthlyNote(date) {
    const { vault } = window.app;
    const { template, format, folder } = getMonthlyNoteSettings();
    const [templateContents, IFoldInfo] = await getTemplateInfo(template);
    const filename = date.format(format);
    const normalizedPath = await getNotePath(folder, filename);
    try {
        const createdFile = await vault.create(normalizedPath, templateContents
            .replace(/{{\s*(date|time)\s*(([+-]\d+)([yqmwdhs]))?\s*(:.+?)?}}/gi, (_, _timeOrDate, calc, timeDelta, unit, momentFormat) => {
            const now = window.moment();
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
            .replace(/{{\s*date\s*}}/gi, filename)
            .replace(/{{\s*time\s*}}/gi, window.moment().format("HH:mm"))
            .replace(/{{\s*title\s*}}/gi, filename));
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        window.app.foldManager.save(createdFile, IFoldInfo);
        return createdFile;
    }
    catch (err) {
        console.error(`Failed to create file: '${normalizedPath}'`, err);
        new obsidian__default["default"].Notice("Unable to create new file.");
    }
}
function getMonthlyNote(date, monthlyNotes) {
    return monthlyNotes[getDateUID(date, "month")] ?? null;
}
function getAllMonthlyNotes() {
    const monthlyNotes = {};
    if (!appHasMonthlyNotesPluginLoaded()) {
        return monthlyNotes;
    }
    const { vault } = window.app;
    const { folder } = getMonthlyNoteSettings();
    const monthlyNotesFolder = vault.getAbstractFileByPath(obsidian__default["default"].normalizePath(folder));
    if (!monthlyNotesFolder) {
        throw new MonthlyNotesFolderMissingError("Failed to find monthly notes folder");
    }
    obsidian__default["default"].Vault.recurseChildren(monthlyNotesFolder, (note) => {
        if (note instanceof obsidian__default["default"].TFile) {
            const date = getDateFromFile(note, "month");
            if (date) {
                const dateString = getDateUID(date, "month");
                monthlyNotes[dateString] = note;
            }
        }
    });
    return monthlyNotes;
}

class QuarterlyNotesFolderMissingError extends Error {
}
/**
 * This function mimics the behavior of the daily-notes plugin
 * so it will replace {{date}}, {{title}}, and {{time}} with the
 * formatted timestamp.
 *
 * Note: it has an added bonus that it's not 'today' specific.
 */
async function createQuarterlyNote(date) {
    const { vault } = window.app;
    const { template, format, folder } = getQuarterlyNoteSettings();
    const [templateContents, IFoldInfo] = await getTemplateInfo(template);
    const filename = date.format(format);
    const normalizedPath = await getNotePath(folder, filename);
    try {
        const createdFile = await vault.create(normalizedPath, templateContents
            .replace(/{{\s*(date|time)\s*(([+-]\d+)([yqmwdhs]))?\s*(:.+?)?}}/gi, (_, _timeOrDate, calc, timeDelta, unit, momentFormat) => {
            const now = window.moment();
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
            .replace(/{{\s*date\s*}}/gi, filename)
            .replace(/{{\s*time\s*}}/gi, window.moment().format("HH:mm"))
            .replace(/{{\s*title\s*}}/gi, filename));
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        window.app.foldManager.save(createdFile, IFoldInfo);
        return createdFile;
    }
    catch (err) {
        console.error(`Failed to create file: '${normalizedPath}'`, err);
        new obsidian__default["default"].Notice("Unable to create new file.");
    }
}
function getQuarterlyNote(date, quarterly) {
    return quarterly[getDateUID(date, "quarter")] ?? null;
}
function getAllQuarterlyNotes() {
    const quarterly = {};
    if (!appHasQuarterlyNotesPluginLoaded()) {
        return quarterly;
    }
    const { vault } = window.app;
    const { folder } = getQuarterlyNoteSettings();
    const quarterlyFolder = vault.getAbstractFileByPath(obsidian__default["default"].normalizePath(folder));
    if (!quarterlyFolder) {
        throw new QuarterlyNotesFolderMissingError("Failed to find quarterly notes folder");
    }
    obsidian__default["default"].Vault.recurseChildren(quarterlyFolder, (note) => {
        if (note instanceof obsidian__default["default"].TFile) {
            const date = getDateFromFile(note, "quarter");
            if (date) {
                const dateString = getDateUID(date, "quarter");
                quarterly[dateString] = note;
            }
        }
    });
    return quarterly;
}

class YearlyNotesFolderMissingError extends Error {
}
/**
 * This function mimics the behavior of the daily-notes plugin
 * so it will replace {{date}}, {{title}}, and {{time}} with the
 * formatted timestamp.
 *
 * Note: it has an added bonus that it's not 'today' specific.
 */
async function createYearlyNote(date) {
    const { vault } = window.app;
    const { template, format, folder } = getYearlyNoteSettings();
    const [templateContents, IFoldInfo] = await getTemplateInfo(template);
    const filename = date.format(format);
    const normalizedPath = await getNotePath(folder, filename);
    try {
        const createdFile = await vault.create(normalizedPath, templateContents
            .replace(/{{\s*(date|time)\s*(([+-]\d+)([yqmwdhs]))?\s*(:.+?)?}}/gi, (_, _timeOrDate, calc, timeDelta, unit, momentFormat) => {
            const now = window.moment();
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
            .replace(/{{\s*date\s*}}/gi, filename)
            .replace(/{{\s*time\s*}}/gi, window.moment().format("HH:mm"))
            .replace(/{{\s*title\s*}}/gi, filename));
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        window.app.foldManager.save(createdFile, IFoldInfo);
        return createdFile;
    }
    catch (err) {
        console.error(`Failed to create file: '${normalizedPath}'`, err);
        new obsidian__default["default"].Notice("Unable to create new file.");
    }
}
function getYearlyNote(date, yearlyNotes) {
    return yearlyNotes[getDateUID(date, "year")] ?? null;
}
function getAllYearlyNotes() {
    const yearlyNotes = {};
    if (!appHasYearlyNotesPluginLoaded()) {
        return yearlyNotes;
    }
    const { vault } = window.app;
    const { folder } = getYearlyNoteSettings();
    const yearlyNotesFolder = vault.getAbstractFileByPath(obsidian__default["default"].normalizePath(folder));
    if (!yearlyNotesFolder) {
        throw new YearlyNotesFolderMissingError("Failed to find yearly notes folder");
    }
    obsidian__default["default"].Vault.recurseChildren(yearlyNotesFolder, (note) => {
        if (note instanceof obsidian__default["default"].TFile) {
            const date = getDateFromFile(note, "year");
            if (date) {
                const dateString = getDateUID(date, "year");
                yearlyNotes[dateString] = note;
            }
        }
    });
    return yearlyNotes;
}

function appHasDailyNotesPluginLoaded() {
    const { app } = window;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dailyNotesPlugin = app.internalPlugins.plugins["daily-notes"];
    if (dailyNotesPlugin && dailyNotesPlugin.enabled) {
        return true;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const periodicNotes = app.plugins.getPlugin("periodic-notes");
    return periodicNotes && periodicNotes.settings?.daily?.enabled;
}
/**
 * XXX: "Weekly Notes" live in either the Calendar plugin or the periodic-notes plugin.
 * Check both until the weekly notes feature is removed from the Calendar plugin.
 */
function appHasWeeklyNotesPluginLoaded() {
    const { app } = window;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (app.plugins.getPlugin("calendar")) {
        return true;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const periodicNotes = app.plugins.getPlugin("periodic-notes");
    return periodicNotes && periodicNotes.settings?.weekly?.enabled;
}
function appHasMonthlyNotesPluginLoaded() {
    const { app } = window;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const periodicNotes = app.plugins.getPlugin("periodic-notes");
    return periodicNotes && periodicNotes.settings?.monthly?.enabled;
}
function appHasQuarterlyNotesPluginLoaded() {
    const { app } = window;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const periodicNotes = app.plugins.getPlugin("periodic-notes");
    return periodicNotes && periodicNotes.settings?.quarterly?.enabled;
}
function appHasYearlyNotesPluginLoaded() {
    const { app } = window;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const periodicNotes = app.plugins.getPlugin("periodic-notes");
    return periodicNotes && periodicNotes.settings?.yearly?.enabled;
}
function getPeriodicNoteSettings(granularity) {
    const getSettings = {
        day: getDailyNoteSettings,
        week: getWeeklyNoteSettings,
        month: getMonthlyNoteSettings,
        quarter: getQuarterlyNoteSettings,
        year: getYearlyNoteSettings,
    }[granularity];
    return getSettings();
}
function createPeriodicNote(granularity, date) {
    const createFn = {
        day: createDailyNote,
        month: createMonthlyNote,
        week: createWeeklyNote,
    };
    return createFn[granularity](date);
}

exports.DEFAULT_DAILY_NOTE_FORMAT = DEFAULT_DAILY_NOTE_FORMAT;
exports.DEFAULT_MONTHLY_NOTE_FORMAT = DEFAULT_MONTHLY_NOTE_FORMAT;
exports.DEFAULT_QUARTERLY_NOTE_FORMAT = DEFAULT_QUARTERLY_NOTE_FORMAT;
exports.DEFAULT_WEEKLY_NOTE_FORMAT = DEFAULT_WEEKLY_NOTE_FORMAT;
exports.DEFAULT_YEARLY_NOTE_FORMAT = DEFAULT_YEARLY_NOTE_FORMAT;
exports.appHasDailyNotesPluginLoaded = appHasDailyNotesPluginLoaded;
exports.appHasMonthlyNotesPluginLoaded = appHasMonthlyNotesPluginLoaded;
exports.appHasQuarterlyNotesPluginLoaded = appHasQuarterlyNotesPluginLoaded;
exports.appHasWeeklyNotesPluginLoaded = appHasWeeklyNotesPluginLoaded;
exports.appHasYearlyNotesPluginLoaded = appHasYearlyNotesPluginLoaded;
exports.createDailyNote = createDailyNote;
exports.createOrGetDailyNote = createOrGetDailyNote;
exports.createMonthlyNote = createMonthlyNote;
exports.createPeriodicNote = createPeriodicNote;
exports.createQuarterlyNote = createQuarterlyNote;
exports.createWeeklyNote = createWeeklyNote;
exports.createYearlyNote = createYearlyNote;
exports.DailyNotesFolderMissingError = DailyNotesFolderMissingError;
exports.getAllDailyNotes = getAllDailyNotes;
exports.getAllMonthlyNotes = getAllMonthlyNotes;
exports.getAllQuarterlyNotes = getAllQuarterlyNotes;
exports.getAllWeeklyNotes = getAllWeeklyNotes;
exports.getAllYearlyNotes = getAllYearlyNotes;
exports.getDailyNote = getDailyNote;
exports.getEffectiveDailyNoteSettings = getEffectiveDailyNoteSettings;
exports.getDailyNoteSettings = getDailyNoteSettings;
exports.getDateFromFile = getDateFromFile;
exports.getDateFromPath = getDateFromPath;
exports.getDateUID = getDateUID;
exports.getMonthlyNote = getMonthlyNote;
exports.getMonthlyNoteSettings = getMonthlyNoteSettings;
exports.getPeriodicNoteSettings = getPeriodicNoteSettings;
exports.getQuarterlyNote = getQuarterlyNote;
exports.getQuarterlyNoteSettings = getQuarterlyNoteSettings;
exports.getTemplateInfo = getTemplateInfo;
exports.getWeeklyNote = getWeeklyNote;
exports.getWeeklyNoteSettings = getWeeklyNoteSettings;
exports.getYearlyNote = getYearlyNote;
exports.getYearlyNoteSettings = getYearlyNoteSettings;
});

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
    await this.plugin.restoreUndoChanges(undoHistoryInstance);
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
        .setButtonText('Confirm Undo')
        .onClick(async (e) => {
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
    const { template } = main.getDailyNoteSettings();
    if (!template) return [];

    let file = this.app.vault.getAbstractFileByPath(template);

    if (file === null) {
      file = this.app.vault.getAbstractFileByPath(template + ".md");
    }

    if (file === null) {
      // file not available, no template-heading can be returned
      return [];
    }

    const templateContents = await this.app.vault.read(file);
    const allHeadings = Array.from(templateContents.matchAll(/#{1,} .*/g)).map(
      ([heading]) => heading
    );
    return allHeadings;
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
      .setName("Template heading")
      .setDesc(
        "Choose a preferred template heading, or let the plugin automatically find the first heading containing the word task or tasks."
      )
      .addDropdown((dropdown) =>
        dropdown
          .addOptions({
            ...templateHeadings.reduce((acc, heading) => {
              acc[heading] = heading;
              return acc;
            }, {}),
            none: "Auto-detect Tasks heading",
          })
          .setValue(this.plugin?.settings.templateHeading)
          .onChange((value) => {
            this.plugin.settings.templateHeading = value;
            this.plugin.saveSettings();
          })
      );

    new obsidian.Setting(this.containerEl)
      .setName("Delete tasks from source note")
      .setDesc(
        `After tasks are safely added to the destination, remove their exact source blocks. When disabled, the bulk today and tomorrow commands copy tasks instead. The current-selection command always moves its selected task.`
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

class TodoParser {
  // Support all unordered list bullet symbols as per spec (https://daringfireball.net/projects/markdown/syntax#list)
  bulletSymbols = ["-", "*", "+"];

  // Default completed status markers
  doneStatusMarkers = ["x", "X", "-"];

  // List of strings that include the Markdown content
  #lines;

  // Boolean that encodes whether nested items should be rolled over
  #withChildren;

  // Reuse one segmenter for the whole parse instead of creating one per task.
  #segmenter;

  // Parse content with segmentation to allow for Unicode grapheme clusters
  #parseIntoChars(content, contentType = "content") {
    // Use Intl.Segmenter to properly split grapheme clusters if available,
    // otherwise fall back to Array.from. The fallback should not trigger in
    // Obsidian since it uses Electron which supports Intl.Segmenter.
    if (this.#segmenter) {
      return Array.from(this.#segmenter.segment(content), (s) => s.segment);
    } else {
      // Array.from() splits surrogate pairs correctly but not complex grapheme clusters
      // (e.g., 👨‍👩‍👧‍👦 would be split incorrectly) and fail to match.
      console.error(
        `Intl.Segmenter not available, falling back to Array.from() for ${contentType}`
      );
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
        doneStatusMarkers,
        "done status markers"
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
      checkboxContent,
      "checkbox content"
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
    let fence = null;
    for (let l = 0; l < this.#lines.length; l++) {
      const line = this.#lines[l];
      const fenceMatch = line.match(/^\s*(`{3,}|~{3,})/);
      if (fenceMatch) {
        const marker = fenceMatch[1];
        if (!fence) {
          fence = { character: marker[0], length: marker.length };
        } else if (
          marker[0] === fence.character &&
          marker.length >= fence.length
        ) {
          fence = null;
        }
        continue;
      }
      if (fence) {
        continue;
      }
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

  // Returns a flat list for compatibility with the original parser API.
  getTodos() {
    return this.getTodoBlocks().flatMap((block) => block.lines);
  }
}

// Utility-function that acts as a thin wrapper around `TodoParser`
const getTodos = ({
  lines,
  withChildren = false,
  doneStatusMarkers = null,
}) => {
  const todoParser = new TodoParser(lines, withChildren, doneStatusMarkers);
  return todoParser.getTodos();
};

const getTodoBlocks = ({
  lines,
  withChildren = false,
  doneStatusMarkers = null,
}) => {
  const todoParser = new TodoParser(lines, withChildren, doneStatusMarkers);
  return todoParser.getTodoBlocks();
};

class RolloverToTomorrowPlugin extends obsidian.Plugin {
  async loadSettings() {
    const DEFAULT_SETTINGS = {
      dailyNoteFolder: "",
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

  async getAllUnfinishedTodos(file) {
    const dn = await this.app.vault.read(file);
    return this.getTodoBlocksFromContent(dn).flatMap((block) => block.lines);
  }

  getTodoBlocksFromContent(content, withChildren = this.settings.rolloverChildren) {
    const { lines } = this.splitNoteContent(content);
    return getTodoBlocks({
      lines,
      withChildren,
      doneStatusMarkers: this.settings.doneStatusMarkers,
    });
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
      /^\s*#{1,}\s+/.test(line) &&
      /\btasks?\b/i.test(this.normalizeHeading(line))
    );
  }

  getHeadingLevel(line) {
    const match = line.match(/^\s*(#{1,})\s+/);
    return match ? match[1].length : 0;
  }

  isRolloverHeading(line) {
    if (this.isTaskHeading(line)) {
      return true;
    }

    const selectedHeading = (this.settings.templateHeading || "").trim();
    return (
      selectedHeading !== "" &&
      selectedHeading !== "none" &&
      this.getHeadingLevel(line) > 0 &&
      this.normalizeHeading(line) === this.normalizeHeading(selectedHeading)
    );
  }

  findTemplateHeadingIndex(lines, templateHeading) {
    const selectedHeading = (templateHeading || "").trim();
    if (selectedHeading && selectedHeading !== "none") {
      const exactMatchIndex = lines.findIndex(
        (line) => line.trim() === selectedHeading
      );
      if (exactMatchIndex !== -1) {
        return exactMatchIndex;
      }

      const normalizedHeading = this.normalizeHeading(selectedHeading);
      const normalizedMatchIndex = lines.findIndex(
        (line) =>
          /^\s*#{1,}\s+/.test(line) &&
          this.normalizeHeading(line) === normalizedHeading
      );
      if (normalizedMatchIndex !== -1) {
        return normalizedMatchIndex;
      }
    }

    return lines.findIndex((line) => this.isTaskHeading(line));
  }

  removeRolledOverTodos(content, todos) {
    const { lines, newline } = this.splitNoteContent(content);
    const remainingCounts = new Map();

    todos.forEach((line) => {
      remainingCounts.set(line, (remainingCounts.get(line) || 0) + 1);
    });

    for (let i = lines.length - 1; i >= 0; i--) {
      const line = lines[i];
      const remaining = remainingCounts.get(line) || 0;
      if (remaining > 0) {
        lines.splice(i, 1);
        remainingCounts.set(line, remaining - 1);
      }
    }

    this.removeEmptyTasksHeadings(lines);
    return lines.join(newline);
  }

  findContainingHeadingIndex(lines, lineIndex) {
    for (let i = lineIndex - 1; i >= 0; i--) {
      if (this.getHeadingLevel(lines[i]) > 0) {
        return i;
      }
    }
    return -1;
  }

  removeTodoBlocksFromContent(content, blocks) {
    const { lines, newline } = this.splitNoteContent(content);
    const removedLineIndices = new Set();
    const touchedHeadingIndices = new Set();

    blocks.forEach((block) => {
      for (let i = block.startLine; i <= block.endLine; i++) {
        removedLineIndices.add(i);
      }

      const headingIndex = this.findContainingHeadingIndex(lines, block.startLine);
      if (headingIndex !== -1 && this.isRolloverHeading(lines[headingIndex])) {
        touchedHeadingIndices.add(headingIndex);
      }
    });

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
        if (!hasContentBefore && !hasContentAfter) {
          [...leftBlanks, ...rightBlanks].forEach((entry) =>
            removeOriginalIndices.add(entry.originalIndex)
          );
        } else if (!hasContentBefore) {
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
    const headingLineIndex = this.findTemplateHeadingIndex(
      lines,
      templateHeading
    );

    let insertionIndex = lines.length;
    if (headingLineIndex !== -1) {
      for (let i = headingLineIndex + 1; i < lines.length; i++) {
        if (/^\s*#{1,}\s+/.test(lines[i])) {
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

  removeEmptyTasksHeadings(lines) {
    const entries = lines.map((text, originalIndex) => ({ text, originalIndex }));
    const candidates = new Set(
      entries
        .filter((entry) => this.isRolloverHeading(entry.text))
        .map((entry) => entry.originalIndex)
    );
    this.removeEmptyRolloverHeadingEntries(entries, candidates);
    lines.splice(0, lines.length, ...entries.map((entry) => entry.text));
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
    let { folder, format } = main.getEffectiveDailyNoteSettings(dailyNoteFolder);
    folder = this.getCleanFolder(folder);
    const notePath = obsidian.normalizePath(
      `${folder}${folder === "" ? "" : "/"}${date.format(format)}.md`
    );
    const file = this.app.vault.getAbstractFileByPath(notePath);
    return file instanceof obsidian.TFile ? file : null;
  }

  getAllConfiguredDailyNotes() {
    const effectiveSettings = main.getEffectiveDailyNoteSettings(
      this.settings.dailyNoteFolder
    );
    const folder = this.getCleanFolder(effectiveSettings.folder);
    const root =
      folder === ""
        ? this.app.vault.getRoot()
        : this.app.vault.getAbstractFileByPath(obsidian.normalizePath(folder));
    if (!root) {
      throw new main.DailyNotesFolderMissingError(
        "Failed to find daily notes folder"
      );
    }

    const files = [];
    obsidian.Vault.recurseChildren(root, (file) => {
      if (file instanceof obsidian.TFile && file.extension === "md") {
        files.push(file);
      }
    });

    return files
      .map((file) => ({
        file,
        date: this.getDateFromDailyNote(file, effectiveSettings),
      }))
      .filter((entry) => entry.date !== null);
  }

  getDailyNoteFromCollection(date, dailyNotes) {
    for (const item of Object.values(dailyNotes)) {
      const file = item.file || item;
      const fileDate = item.date || this.getDateFromDailyNote(file);
      if (fileDate && fileDate.isSame(date, "day")) {
        return file;
      }
    }
    return null;
  }

  getDateFromDailyNote(file, effectiveSettings = null) {
    let { folder, format } =
      effectiveSettings ||
      main.getEffectiveDailyNoteSettings(this.settings.dailyNoteFolder);
    folder = this.getCleanFolder(folder);
    const prefix = folder === "" ? "" : `${folder}/`;
    if (!file.path.startsWith(prefix) || !file.path.endsWith(".md")) {
      return null;
    }

    const relativePath = file.path.slice(prefix.length, -3);
    const date = window.moment(relativePath, format, true);
    return date.isValid() ? date : null;
  }

  createOrGetDailyNote(date) {
    return main.createOrGetDailyNote(date, this.settings.dailyNoteFolder);
  }

  getMostRecentDailyNoteBefore(date, dailyNotes) {
    let latestFile = null;
    let latestTime = -Infinity;

    Object.values(dailyNotes).forEach((item) => {
      const file = item.file || item;
      const fileDate = item.date || this.getDateFromDailyNote(file);
      if (!fileDate || !fileDate.isBefore(date, "day")) {
        return;
      }
      const fileTime = fileDate.valueOf();
      if (fileTime > latestTime) {
        latestFile = file;
        latestTime = fileTime;
      }
    });

    return latestFile;
  }

  recordUndo(changes) {
    if (changes.length === 0) {
      return;
    }
    this.undoHistoryTime = new Date();
    this.undoHistory = [{ changes }];
  }

  async restoreUndoChanges(undoHistoryInstance) {
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

  async applyRollover({
    sourceNote,
    destinationNote,
    sourceContent,
    sourceBlocks,
    prepared,
    forceDeleteSource = false,
    sourceWriter = null,
  }) {
    const changes = [];
    let headingFound = true;
    let sourceWriteSkipped = false;

    if (prepared.lines.length > 0) {
      if (!destinationNote) {
        throw new Error("A destination note is required for non-empty tasks.");
      }
      if (sourceNote.path === destinationNote.path) {
        throw new Error("The source and destination notes are the same file.");
      }

      const destinationUpdate = await this.insertIntoDestination(
        destinationNote,
        prepared.lines
      );
      headingFound = destinationUpdate.headingFound;
      if (destinationUpdate.changed) {
        changes.push({
          file: destinationNote,
          oldContent: destinationUpdate.oldContent,
        });
      }
    }

    const shouldDeleteSource = forceDeleteSource || this.settings.deleteOnComplete;
    if (shouldDeleteSource) {
      const updatedSource = this.removeTodoBlocksFromContent(
        sourceContent,
        sourceBlocks
      );
      if (updatedSource !== sourceContent) {
        try {
          if (sourceWriter) {
            const written = await sourceWriter(updatedSource);
            sourceWriteSkipped = written === false;
          } else {
            const written = await this.writeSourceSafely(
              sourceNote,
              sourceContent,
              updatedSource
            );
            sourceWriteSkipped = written === false;
          }
        } catch (error) {
          this.recordUndo(changes);
          throw error;
        }

        if (!sourceWriteSkipped) {
          changes.push({ file: sourceNote, oldContent: sourceContent });
        }
      }
    }

    this.recordUndo(changes);
    return {
      ...prepared,
      headingFound,
      sourceDeleted: shouldDeleteSource && !sourceWriteSkipped,
      sourceWriteSkipped,
      changed: changes.length > 0,
    };
  }

  showRolloverResult(result, destinationLabel) {
    const parts = [];
    if (!result.headingFound && result.taskCount > 0) {
      parts.push(
        `Rollover+ couldn't find a task heading in ${destinationLabel}. Tasks were added to the end of the note.`
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
      new obsidian.Notice("Rollover+ is already moving tasks.", 4000);
      return;
    }

    this.rolloverInProgress = true;
    try {
      return await operation();
    } catch (error) {
      console.error(`Rollover+: ${name} failed`, error);
      new obsidian.Notice(
        `Rollover+: ${name} failed. Source tasks were kept unless the destination had already been saved.`,
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
      "Rollover+ needs Daily Notes, or Periodic Notes with daily notes enabled.",
      10000
    );
    return false;
  }

  async rolloverToTomorrow() {
    if (!this.checkDailyNotesEnabled()) {
      return;
    }

    const now = window.moment();
    const currentDailyNote = this.getDailyNoteAtDate(now);
    if (!currentDailyNote) {
      new obsidian.Notice("Rollover+ couldn't find today's daily note.", 6000);
      return;
    }

    const sourceContent = await this.app.vault.read(currentDailyNote);
    const sourceBlocks = this.getTodoBlocksFromContent(sourceContent);
    if (sourceBlocks.length === 0) {
      new obsidian.Notice("Rollover+: No unfinished tasks found in today's note.", 4000);
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
          "Rollover+ couldn't create tomorrow's daily note. Today's tasks were kept.",
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

  async rolloverToToday() {
    if (!this.checkDailyNotesEnabled()) {
      return;
    }

    const today = window.moment();
    const todayNote = this.getDailyNoteAtDate(today);
    if (!todayNote) {
      new obsidian.Notice(
        "Rollover+ couldn't find today's daily note. Create or open it first, then run this command again.",
        7000
      );
      return;
    }

    let allDailyNotes;
    try {
      allDailyNotes = this.getAllConfiguredDailyNotes();
    } catch (error) {
      if (!(error instanceof main.DailyNotesFolderMissingError)) {
        throw error;
      }
      new obsidian.Notice("Rollover+ couldn't find the daily notes folder.", 6000);
      return;
    }

    const previousNote = this.getMostRecentDailyNoteBefore(today, allDailyNotes);
    if (!previousNote) {
      new obsidian.Notice("Rollover+: No earlier daily note found.", 4000);
      return;
    }

    const sourceContent = await this.app.vault.read(previousNote);
    const sourceBlocks = this.getTodoBlocksFromContent(sourceContent);
    if (sourceBlocks.length === 0) {
      new obsidian.Notice(
        `Rollover+: No unfinished tasks found in ${previousNote.basename}.md.`,
        4000
      );
      return;
    }

    const prepared = this.prepareTodoBlocks(sourceBlocks, false);
    const result = await this.applyRollover({
      sourceNote: previousNote,
      destinationNote: todayNote,
      sourceContent,
      sourceBlocks,
      prepared,
    });
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
      new obsidian.Notice("Rollover+: Open a Markdown note and select a task first.", 5000);
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
        "Rollover+: Put the cursor on one unfinished Markdown task, or select it.",
        5000
      );
      return;
    }
    if (selectedBlocks.length > 1) {
      new obsidian.Notice("Rollover+: Select one task at a time.", 5000);
      return;
    }

    const prepared = this.prepareTodoBlocks(selectedBlocks, true);
    const tomorrow = window.moment().add(1, "day");
    let tomorrowNote = null;
    if (prepared.lines.length > 0) {
      tomorrowNote = this.getDailyNoteAtDate(tomorrow);
      if (!tomorrowNote) {
        tomorrowNote = await this.createOrGetDailyNote(tomorrow);
      }
      if (!tomorrowNote) {
        new obsidian.Notice(
          "Rollover+ couldn't create tomorrow's daily note. The selected task was kept.",
          6000
        );
        return;
      }
      if (sourceNote.path === tomorrowNote.path) {
        new obsidian.Notice(
          "Rollover+: The selected task is already in tomorrow's daily note.",
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
      id: "rollover-to-tomorrow-rollover",
      name: "Rollover to tomorrow",
      callback: () =>
        this.runRolloverOperation("Rollover to tomorrow", () =>
          this.rolloverToTomorrow()
        ),
    });

    this.addCommand({
      id: "rollover-to-tomorrow-rollover-to-today",
      name: "Rollover to today",
      callback: () =>
        this.runRolloverOperation("Rollover to today", () =>
          this.rolloverToToday()
        ),
    });

    this.addCommand({
      id: "rollover-to-tomorrow-rollover-current-selection",
      name: "Rollover current selection to tomorrow",
      editorCallback: (editor, view) =>
        this.runRolloverOperation("Selection rollover", () =>
          this.rolloverCurrentSelection(editor, view)
        ),
    });

    this.addCommand({
      id: "rollover-to-tomorrow-undo",
      name: "Undo last rollover",
      checkCallback: (checking) => {
        // no history, don't allow undo
        if (this.undoHistory.length > 0) {
          const now = window.moment();
          const lastUse = window.moment(this.undoHistoryTime);
          const diff = now.diff(lastUse, "seconds");
          // 2+ mins since use: don't allow undo
          if (diff > 2 * 60) {
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

module.exports = RolloverToTomorrowPlugin;


/* nosourcemap */
