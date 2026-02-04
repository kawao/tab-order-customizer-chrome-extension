/*!
 * Tab Order Customizer
 *
 * Copyright (c) 2025-2026 Tomoyuki Kawao
 *
 * Released under the MIT license.
 * see https://opensource.org/licenses/MIT
 */

(async () => {
    const storage = await chrome.storage.local.get({debug:false});
    if (!storage.debug) {
        ["log", "debug", "warn", "info"].forEach((method) => {
            console[method] = () => {};
        });
    }
})();

export class OpenMode {
    static get DEFAULT() { return "d"; }
    static get LEFT_END() { return "L"; }
    static get LEFT() { return "l"; }
    static get RIGHT() { return "r"; }
    static get RIGHT_END() { return "R"; }

    static get STORAGE_KEY() { return "open"; }

    static async get() {
        const storage = await chrome.storage.local.get(this.STORAGE_KEY);
        if (storage[this.STORAGE_KEY] === undefined) {
            console.error("Option " + this.STORAGE_KEY + " is not saved");
            return this.DEFAULT;
        }
        return storage[this.STORAGE_KEY];
    }
    static async set(openMode) {
        await chrome.storage.local.set({ [this.STORAGE_KEY]: openMode });
    }
}

export class CloseMode {
    static get DEFAULT() { return"d"; }
    static get LEFTMOST() { return"L"; }
    static get LEFT() { return"l"; }
    static get RIGHT() { return"r"; }
    static get RIGHTMOST() { return"R"; }
    static get ORDER() { return"o"; }

    static get STORAGE_KEY() { return"close"; }

    static async get() {
        const storage = await chrome.storage.local.get(this.STORAGE_KEY);
        if (storage[this.STORAGE_KEY] === undefined) {
            console.error("Option " + this.STORAGE_KEY + " is not saved");
            return this.DEFAULT;
        }
        return storage[this.STORAGE_KEY];
    }
    static async set(closeMode) {
        await chrome.storage.local.set({ [this.STORAGE_KEY]: closeMode });
    }
}

export class PopupAsTab {

    static get STORAGE_KEY() { return "popupAsTab"; }

    constructor() {
        this.setEnabled(false);
        this.setExclusionList([]);
    }

    async load() {
        const storage = await chrome.storage.local.get(PopupAsTab.STORAGE_KEY);
        if (storage[PopupAsTab.STORAGE_KEY] === undefined) {
            console.log("Option " + PopupAsTab.STORAGE_KEY + " is not saved");
            return null;
        }
        for (const key in this) {
            this[key] = storage[PopupAsTab.STORAGE_KEY][key];
        }
        return this;
    }

    async save () {
        await chrome.storage.local.set({ [PopupAsTab.STORAGE_KEY]: this });
    }

    setEnabled(enabled) {
        this.enabled = enabled;
    }

    isEnabled() {
        return this.enabled;
    }

    setExclusionList(exclusionList) {
        if (typeof exclusionList === "string" || exclusionList instanceof String) {
            exclusionList = exclusionList.trim();
            exclusionList = (exclusionList === "") ? [] : exclusionList.split(/\s+/);
        }
        this.exclusionList = exclusionList;
    }

    getExclusionList() {
        return this.exclusionList.join("\n");
    }

    isInExclusionList(url) {
        for (const exclusion of this.exclusionList) {
            if (url.startsWith(exclusion)) {
                return true;
            }
        }
        return false;
    }

}

export class OpenOptions {

    static get IS_EXCLUDE_DUPLICATED_STORAGE_KEY() {
        return "o_isExcludeDuplicated";
    }
    static async isExcludeDuplicated() {
        const storage = await chrome.storage.local.get(this.IS_EXCLUDE_DUPLICATED_STORAGE_KEY);
        if (storage[this.IS_EXCLUDE_DUPLICATED_STORAGE_KEY] === undefined) {
            return false;
        }
        return storage[this.IS_EXCLUDE_DUPLICATED_STORAGE_KEY];
    }
    static async setExcludeDuplicated(isExcludeDuplicated) {
        await chrome.storage.local.set({ [this.IS_EXCLUDE_DUPLICATED_STORAGE_KEY]: isExcludeDuplicated });
    }

    static get IS_FOCUS_ON_NEW_TAB_STORAGE_KEY() {
        return  "o_isFocusOnNewTab";
    }
    static async isFocusOnNewTab() {
        const storage = await chrome.storage.local.get(this.IS_FOCUS_ON_NEW_TAB_STORAGE_KEY);
        if (storage[this.IS_FOCUS_ON_NEW_TAB_STORAGE_KEY] === undefined) {
            return false;
        }
        return storage[this.IS_FOCUS_ON_NEW_TAB_STORAGE_KEY];
    }
    static async setFocusOnNewTab(isFocusOnNewTab) {
        await chrome.storage.local.set({ [this.IS_FOCUS_ON_NEW_TAB_STORAGE_KEY]: isFocusOnNewTab });
    }

}
