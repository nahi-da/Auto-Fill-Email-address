browser.contextMenus.create({
    id: "show-email-suggestions",
    title: "メールアドレス候補を表示",
    contexts: ["editable"]
});

browser.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === "show-email-suggestions") {
        browser.tabs.sendMessage(tab.id, { action: "showSuggestions" });
    }
});