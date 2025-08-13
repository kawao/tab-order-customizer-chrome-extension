/*!
 * Tab Order Customizer
 *
 * Copyright (c) 2025 Tomoyuki Kawao
 *
 * Released under the MIT license.
 * see https://opensource.org/licenses/MIT
 */

import { OpenMode, CloseMode, PopupAsTab } from "./common.js"

class Synchronizer {
    constructor() {
        this.promise = null;
    }
    async run(callback, ...args) {
        while (this.promise) {
            await this.promise.catch((error) => {
                if (error == "Error: Tabs cannot be edited right now (user may be dragging a tab).") {
                    console.log(error);
                } else {
                    console.error(error);
                }
            });
        }
        try {
            this.promise = callback(...args);
            await this.promise.catch((error) => {
                if (error == "Error: Tabs cannot be edited right now (user may be dragging a tab).") {
                    console.log(error);
                    setTimeout(() => synchronizer.run(callback, ...args), 100);
                } else {
                    console.error(error);
                }
            });
        } finally {
            this.promise = null;
        }
    }
}

class TabMap {
    constructor(windowId) {
        this.windowId = windowId;
        this.map = [];
    }
    async load() {
        const storage = await chrome.storage.session.get(this.getStorageKey());
        if (storage[this.getStorageKey()] === undefined) {
            console.error(this.getStorageKey() + " is not saved");
            return;
        }
        this.map = storage[this.getStorageKey()];
    }
    async save() {
        await chrome.storage.session.set({ [this.getStorageKey()]: this.map });
    }
    async clean() {
        await chrome.storage.session.remove( this.getStorageKey() );
    }
    async build() {
        this.map = [];
        const tabs = await chrome.tabs.query({ windowId: this.windowId });
        tabs.forEach((tab) => {
            if (tab.index < 0) {
                console.error("tab index is negative:" + tab.index, tab);
                return;
            }
            this.map[tab.index] = { id:tab.id, pinned:tab.pinned };
        });
    }
    getNumberOfTabs() {
        return this.map.length;
    }
    getId(index) {
        return this.map[index].id;
    }
    getIndex(tabId) {
        for (const index of this.map.keys()) {
            if (this.map[index].id === tabId) {
                return index;
            }
        }
        return -1;
    }
    getFirstNonPinnedIndex() {
        for (const index of this.map.keys()) {
            if (!this.map[index].pinned) {
                return index;
            }
        }
        return this.map.length;
    }
    getStorageKey() {
        return "M" + this.windowId;
    }
}

class ActHistory {
    constructor(windowId) {
        this.windowId = windowId;
        this.history = [];
    }
    async load() {
        const storage = await chrome.storage.session.get(this.getStorageKey());
        if (storage[this.getStorageKey()] === undefined) {
            console.error(this.getStorageKey() + " is not saved");
            return;
        }
        this.history = storage[this.getStorageKey()];
    }
    async save() {
        await chrome.storage.session.set({ [this.getStorageKey()]: this.history });
    }
    async clean() {
        await chrome.storage.session.remove( this.getStorageKey() );
    }
    async push(tabId) {
        if (tabId === undefined) {
            const tabs = await chrome.tabs.query({ windowId: this.windowId, active: true });
            if (tabs.length != 1) {
                console.log("number of active tab is not 1", tabs);
                return;
            }
            tabId = tabs[0].id
        }
        this.history = this.history.filter((element) => element !== tabId);
        this.history.push(tabId);
    }
    remove(tabId) {
        this.history = this.history.filter((element) => element !== tabId);
    }
    getCurrent() {
        return this.history.at(-1);
    }
    getPrevious() {
        return this.history.at(-2);
    }
    includes(tabId) {
        return this.history.includes(tabId);
    }
    getStorageKey() {
        return "A" + this.windowId;
    }
}

class PopupList {

    static async add(popup) {
        let list = await PopupList.load();
        list.push(popup);
        await PopupList.save(list);
    }

    static async remove(popup) {
        let list = await PopupList.load();
        list = list.filter((element) => element !== popup);
        await PopupList.save(list);
    }

    static async includes(popup) {
        const list = await PopupList.load();
        return list.includes(popup);
    }

    static get STORAGE_KEY() { return "popups"; }

    static async load() {
        const storage = await chrome.storage.session.get({[PopupList.STORAGE_KEY]:[]});
        return storage[PopupList.STORAGE_KEY];
    }

    static async save(popups) {
        await chrome.storage.session.set({[PopupList.STORAGE_KEY]:popups});
    }

}

let synchronizer = new Synchronizer();
let tabIdToSkipActivation = null;
let nextTabIdToBeActivated = null;

chrome.windows.onCreated.addListener((window) => {
    synchronizer.run(onWindowCreated, window);
}, { windowTypes: [chrome.windows.CreateType.NORMAL] });

const onWindowCreated = async (window) => {
    let map = new TabMap(window.id);
    await map.save();

    let actHistory = new ActHistory(window.id);
    await actHistory.save();
}

chrome.windows.onRemoved.addListener((windowId) => {
    synchronizer.run(onWindowRemoved, windowId);
}, { windowTypes: [chrome.windows.CreateType.NORMAL] });

const onWindowRemoved = async (windowId) => {
    let map = new TabMap(windowId);
    await map.clean();

    let actHistory = new ActHistory(windowId);
    await actHistory.clean();
}

chrome.windows.onRemoved.addListener((windowId) => {
    synchronizer.run(onPopupRemoved, windowId);
}, { windowTypes: [chrome.windows.CreateType.POPUP] });

const onPopupRemoved = async (windowId) => {
    await PopupList.remove(windowId);
}

chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === chrome.runtime.OnInstalledReason.INSTALL) {
        synchronizer.run(onInstall);
    } else if (details.reason === chrome.runtime.OnInstalledReason.UPDATE) {
        synchronizer.run(onUpdate);
    }
});

const onInstall = async () => {
    await OpenMode.set(OpenMode.DEFAULT);
    await CloseMode.set(CloseMode.DEFAULT);
    await new PopupAsTab().save();
    chrome.runtime.openOptionsPage();
}

const onUpdate = async () => {
    let popupAsTab = new PopupAsTab();
    if (!await popupAsTab.load()) {
        await popupAsTab.save();
        chrome.runtime.openOptionsPage();
    }
}

chrome.tabs.onCreated.addListener((tab) => {
    synchronizer.run(onTabCreated, tab);
});

const onTabCreated = async (tab) => {
    if (await getWindowType(tab.windowId) !== chrome.windows.CreateType.NORMAL) {
        return;
    }

    let map = new TabMap(tab.windowId);
    await map.load();
    if (map.getIndex(tab.id) >= 0) {
        return;
    }

    let actHistory = new ActHistory(tab.windowId);
    await actHistory.load();

    let newIndex = tab.index;
    if (actHistory.includes(tab.id)) {
        console.log("new tab already included in actHistory:" + tab.id);
    } else {
        let activeIndex = -1;
        const activeTabId = actHistory.getCurrent();
        if (activeTabId === undefined) {
            console.log("active tab is undefined");
        } else {
            activeIndex = map.getIndex(activeTabId);
            if (activeIndex < 0) {
                console.error("active tab index is undefined");
            }
        }
        const openMode = await OpenMode.get();
        switch(openMode) {
        case OpenMode.DEFAULT:
            break;
        case OpenMode.LEFT_END:
            newIndex = 0;
            break;
        case OpenMode.LEFT:
            if (activeIndex >= 0) {
                newIndex = activeIndex;
            }
            break;
        case OpenMode.RIGHT:
            if (activeIndex >= 0) {
                newIndex = activeIndex + 1;
            }
            break;
        case OpenMode.RIGHT_END:
            newIndex = map.getNumberOfTabs();
            break;
        default:
            console.error("illegal openMode: " + openMode);
            break;
        }
        if (!tab.pinned) {
            const firstNonPinnedIndex = map.getFirstNonPinnedIndex();
            if (newIndex < firstNonPinnedIndex) {
                newIndex = firstNonPinnedIndex;
            }
        }
    }
    if (newIndex != tab.index) {
        console.log("move:"+tab.index+"=>"+newIndex)
        await chrome.tabs.move(tab.id, { index: newIndex });
    } else {
        await map.build();
        await map.save();
    }
}

chrome.tabs.onRemoved.addListener((tabId, info) => {
    synchronizer.run(onTabRemoved, tabId, info.windowId);
});

const onTabRemoved = async (tabId, windowId) => {
    if (await getWindowType(windowId) !== chrome.windows.CreateType.NORMAL) {
        return;
    }

    let actHistory = new ActHistory(windowId);
    await actHistory.load();

    let map = new TabMap(windowId);
    await map.load();

    if (map.getNumberOfTabs() <= 1) {
        console.log("removed last tab");
    } else if (tabId === actHistory.getCurrent()) {
        let currentIndex;
        const closeMode = await CloseMode.get();
        switch (closeMode) {
        case CloseMode.DEFAULT:
            break;
        case CloseMode.LEFTMOST:
            nextTabIdToBeActivated = map.getId(0);
            if (nextTabIdToBeActivated === tabId) {
                nextTabIdToBeActivated = map.getId(1);
            }
            break;
        case CloseMode.LEFT:
            currentIndex = map.getIndex(tabId);
            if (currentIndex < 0) {
                console.error("active tab index is undefined");
            } else if (currentIndex === 0) {
                nextTabIdToBeActivated = map.getId(1);
            } else {
                nextTabIdToBeActivated = map.getId(currentIndex - 1);
            }
            break;
        case CloseMode.RIGHT:
            currentIndex = map.getIndex(tabId);
            if (currentIndex < 0) {
                console.error("active tab index is undefined");
            } else if (currentIndex === map.getNumberOfTabs() - 1) {
                nextTabIdToBeActivated = map.getId(currentIndex - 1);
            } else {
                nextTabIdToBeActivated = map.getId(currentIndex + 1);
            }
            break;
        case CloseMode.RIGHTMOST:
            nextTabIdToBeActivated = map.getId(map.getNumberOfTabs() - 1);
            if (nextTabIdToBeActivated === tabId) {
                nextTabIdToBeActivated = map.getId(map.getNumberOfTabs() - 2);
            }
            break;
        case CloseMode.ORDER:
            nextTabIdToBeActivated = actHistory.getPrevious();
            if (!nextTabIdToBeActivated) {
                console.log("last active tab is not exist");
            }
            break;
        default:
            console.error("illegal closeMode: " + closeMode);
            break;
        }
    }

    actHistory.remove(tabId);
    await map.build();

    if (nextTabIdToBeActivated) {
        if (map.getIndex(nextTabIdToBeActivated) < 0) {
            console.error("next tab id to be activated may have been removed");
            nextTabIdToBeActivated = null;
        } else {
            const activeTabId = (await chrome.tabs.query({ windowId: windowId, active: true }))[0].id;
            if (nextTabIdToBeActivated !== activeTabId) {
                tabIdToSkipActivation = activeTabId;
                console.log("activate:"+tabIdToSkipActivation+"=>"+nextTabIdToBeActivated);
                await chrome.tabs.update(nextTabIdToBeActivated, { active:true });
            }
            if (actHistory.getCurrent() !== nextTabIdToBeActivated) {
                actHistory.push(nextTabIdToBeActivated);
            }
        }
    }

    await actHistory.save();
    await map.save();
}

chrome.tabs.onDetached.addListener((tabId, info) => {
    synchronizer.run(onTabRemoved, tabId, info.oldWindowId);
});

chrome.tabs.onAttached.addListener((tabId, info) => {
    synchronizer.run(onTabAttached, tabId, info);
});

const onTabAttached = async (tabId, info) => {
    await onTabCreated(await chrome.tabs.get(tabId));
}

chrome.tabs.onMoved.addListener((tabId, info) => {
    synchronizer.run(onTabUpdated, tabId, info.windowId);
});

chrome.tabs.onUpdated.addListener((tabId, info, tab) => {
    if ("pinned" in info) {
        synchronizer.run(onTabUpdated, tabId, tab.windowId);
    }
    if ("url" in info) {
        synchronizer.run(onUrlUpdated, tab);
    }
});

const onTabUpdated = async (tabId, windowId) => {
    if (await getWindowType(windowId) !== chrome.windows.CreateType.NORMAL) {
        return;
    }

    let map = new TabMap(windowId);
    await map.build();
    await map.save();
}

const onUrlUpdated = async (tab) => {
    if (tab.url === "about:blank") {
        return;
    }
    if (await getWindowType(tab.windowId) !== chrome.windows.CreateType.POPUP) {
        return;
    }
    if (await PopupList.includes(tab.windowId)) {
        return;
    }
    await PopupList.add(tab.windowId);
    const popupAsTab = await new PopupAsTab().load();
    if (popupAsTab.isEnabled() && !popupAsTab.isInExclusionList(tab.url)) {
        const parent = await chrome.windows.getLastFocused({ windowTypes: [chrome.windows.CreateType.NORMAL] });
        if (parent === null) {
            console.error("failed to get last focused window");
        } else {
            await chrome.tabs.move(tab.id, { windowId: parent.id, index: -1 });
            await chrome.tabs.update(tab.id, { active: true });
        }
    }
}

chrome.tabs.onActivated.addListener((info) => {
    synchronizer.run(onTabActivated, info);
});

const onTabActivated = async (info) => {
    if (await getWindowType(info.windowId) !== chrome.windows.CreateType.NORMAL) {
        return;
    }

    if (nextTabIdToBeActivated && nextTabIdToBeActivated === info.tabId) {
        console.log("skip onActivated event: " + info.tabId);
        nextTabIdToBeActivated = null;
        return;
    }
    if (tabIdToSkipActivation && tabIdToSkipActivation === info.tabId) {
        console.log("skip onActivated event: " + info.tabId);
        tabIdToSkipActivation = null;
        return;
    }
    if (nextTabIdToBeActivated || tabIdToSkipActivation) {
        console.error("unexpected tabId:%d nextTabIdToBeActivated:%d tabIdToSkipActivation:%d", info.tabId, tabIdToSkipActivation, nextTabIdToBeActivated);
    }
    let actHistory = new ActHistory(info.windowId);
    await actHistory.load();
    await actHistory.push(info.tabId);
    await actHistory.save();
}

const getWindowType = async (windowId) => {
    const window = await chrome.windows.get(windowId).catch((error) => {
        console.log(error);
        return null;
    });
    if (window === null) {
        return null;
    }
    return window.type;
}

const initialize = async () => {
    const storage = await chrome.storage.session.get({initialized:false});
    if (!storage.initialized) {
        const windows = await chrome.windows.getAll();
        for (const window of windows) {
            switch (window.type) {
            case chrome.windows.CreateType.NORMAL:
                let map = new TabMap(window.id);
                await map.build();
                await map.save();

                let actHistory = new ActHistory(window.id);
                await actHistory.push();
                await actHistory.save();
                break;
            case chrome.windows.CreateType.POPUP:
                await PopupList.add(window.id);
                break;
            }
        }
        await chrome.storage.session.set({initialized:true});
    }
}
synchronizer.run(initialize);
