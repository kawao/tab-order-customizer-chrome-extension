/*!
 * Tab Order Customizer
 *
 * Copyright (c) 2025-2026 Tomoyuki Kawao
 *
 * Released under the MIT license.
 * see https://opensource.org/licenses/MIT
 */

import { OpenMode, CloseMode, PopupAsTab, OpenOptions } from "./common.js"

const ID_OPEN_IS_EXCLUDE_DUPLICATED = "open-isExcludeDuplicated";
const ID_OPEN_IS_FOCUS_ON_NEW_TAB = "open-isFocusOnNewTab";
const ID_POPUPASTAB_ENABLED = "popupAsTab-enabled";
const ID_POPUPASTAB_EXCLUSIONLIST = "popupAsTab-exclusionList";

OpenMode.get().then((openMode) => {
    document.getElementById("open-"+openMode).checked = true;
});

CloseMode.get().then((closeMode) => {
    document.getElementById("close-"+closeMode).checked = true;
});

OpenOptions.isExcludeDuplicated().then((isExcludeDuplicated) => {
    document.getElementById(ID_OPEN_IS_EXCLUDE_DUPLICATED).checked = isExcludeDuplicated;
});

OpenOptions.isFocusOnNewTab().then((isFocusOnNewTab) => {
    document.getElementById(ID_OPEN_IS_FOCUS_ON_NEW_TAB).checked = isFocusOnNewTab;
});

new PopupAsTab().load().then((popupAsTab) => {
    document.getElementById(ID_POPUPASTAB_ENABLED).checked = popupAsTab.isEnabled();
    let exclusionListElement = document.getElementById(ID_POPUPASTAB_EXCLUSIONLIST);
    exclusionListElement.value = popupAsTab.getExclusionList();
    if (!popupAsTab.isEnabled()) {
        exclusionListElement.disabled = true;
    }
});

document.getElementsByName("open").forEach((element) => {
    element.addEventListener("input", (event) => {
        OpenMode.set(event.currentTarget.value);
    });
});

document.getElementsByName("close").forEach((element) => {
    element.addEventListener("input", (event) => {
        CloseMode.set(event.currentTarget.value);
    });
});

document.getElementById(ID_OPEN_IS_EXCLUDE_DUPLICATED).addEventListener("change", (event) => {
    OpenOptions.setExcludeDuplicated(event.currentTarget.checked);
});

document.getElementById(ID_OPEN_IS_FOCUS_ON_NEW_TAB).addEventListener("change", (event) => {
    OpenOptions.setFocusOnNewTab(event.currentTarget.checked);
});

document.getElementById(ID_POPUPASTAB_ENABLED).addEventListener("change", (event) => {
    document.getElementById(ID_POPUPASTAB_EXCLUSIONLIST).disabled = !event.currentTarget.checked;
    savePopupAsTab();
});

document.getElementById(ID_POPUPASTAB_EXCLUSIONLIST).addEventListener("change", (event) => {
    savePopupAsTab();
});

window.addEventListener('pagehide', (event) => {
    if (!event.persisted) {
        savePopupAsTab();
    }
});

const savePopupAsTab = () => {
    let popupAsTab = new PopupAsTab();
    popupAsTab.setEnabled(document.getElementById(ID_POPUPASTAB_ENABLED).checked);
    popupAsTab.setExclusionList(document.getElementById(ID_POPUPASTAB_EXCLUSIONLIST).value);
    popupAsTab.save();
}

