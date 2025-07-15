/*!
 * Tab Order Customizer
 *
 * Copyright (c) 2025 Tomoyuki Kawao
 *
 * Released under the MIT license.
 * see https://opensource.org/licenses/MIT
 */

import { OpenMode, CloseMode } from "./common.js"

OpenMode.get().then((openMode) => {
    document.getElementById("open-"+openMode).checked = true;
});

CloseMode.get().then((closeMode) => {
    document.getElementById("close-"+closeMode).checked = true;
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
