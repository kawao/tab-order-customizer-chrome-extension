/*!
 * Tab Order Customizer
 *
 * Copyright (c) 2025 Tomoyuki Kawao
 *
 * Released under the MIT license.
 * see https://opensource.org/licenses/MIT
 */

import { OpenMode, CloseMode, PopupAsTab } from "./common.js"

const ID_POPUPASTAB_ENABLED = "popupAsTab-enabled";
const ID_POPUPASTAB_EXCLUSIONLIST = "popupAsTab-exclusionList";

OpenMode.get().then((openMode) => {
    document.getElementById("open-"+openMode).checked = true;
});

CloseMode.get().then((closeMode) => {
    document.getElementById("close-"+closeMode).checked = true;
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

document.getElementById(ID_POPUPASTAB_ENABLED).addEventListener("change", (event) => {
    document.getElementById(ID_POPUPASTAB_EXCLUSIONLIST).disabled = !event.currentTarget.checked;
    savePopupAsTab();
});

document.getElementById(ID_POPUPASTAB_EXCLUSIONLIST).addEventListener("change", (event) => {
    savePopupAsTab();
});

window.addEventListener('unload', () => {
    savePopupAsTab();
});

const savePopupAsTab = () => {
    let popupAsTab = new PopupAsTab();
    popupAsTab.setEnabled(document.getElementById(ID_POPUPASTAB_ENABLED).checked);
    popupAsTab.setExclusionList(document.getElementById(ID_POPUPASTAB_EXCLUSIONLIST).value);
    popupAsTab.save();
}

