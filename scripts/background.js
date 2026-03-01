chrome.runtime.onInstalled.addListener(() => {
    // Feature B: Context menu for Text (LLM)
    chrome.contextMenus.create({
        id: "pollen_text",
        title: "Send text to Pollen LLM",
        contexts: ["selection"]
    });

    // Feature B: Context menu for Images (I2I/I2V)
    chrome.contextMenus.create({
        id: "pollen_image",
        title: "Send to Pollen (I2I/I2V)",
        contexts: ["image"]
    });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === "pollen_text") {
        chrome.storage.local.set({ pending_text: info.selectionText }, () => {
            console.log("Text saved to Pollen Bridge.");
        });
    } else if (info.menuItemId === "pollen_image") {
        chrome.storage.local.set({ pending_image: info.srcUrl }, () => {
            console.log("Image saved to Pollen Bridge.");
        });
    }
});