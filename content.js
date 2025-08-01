let suggestionBox = null;

function ensureSuggestionBoxStyle() {
    if (document.getElementById('email-suggestion-style')) return;

    const style = document.createElement('style');
    style.id = 'email-suggestion-style';
    style.textContent = `
    ul.email-suggestion-box {
        position: absolute;
        z-index: 9999;
        background: #fff;
        color: #000;
        border: 1px solid #ccc;
        list-style: none;
        padding: 4px;
        margin: 0;
        font-size: 14px;
        max-height: 200px;
        overflow-y: auto;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        min-width: 150px;
    }

    ul.email-suggestion-box li {
        padding: 4px 8px;
        cursor: pointer;
    }

    ul.email-suggestion-box li:hover {
        background-color: #eef;
    }

    @media (prefers-color-scheme: dark) {
        ul.email-suggestion-box {
            background: #222;
            color: #eee;
            border-color: #555;
        }

        ul.email-suggestion-box li:hover {
            background-color: #444;
        }
    }
    `;
    document.head.appendChild(style);
}

function createSuggestionBox(input, emails) {
    removeSuggestionBox();
    ensureSuggestionBoxStyle();

    suggestionBox = document.createElement('ul');
    suggestionBox.className = 'email-suggestion-box';
    suggestionBox.style.visibility = 'hidden'; // 高さを測るまで非表示

    emails.forEach(({ email }) => {
        const item = document.createElement('li');
        item.textContent = email;
        item.addEventListener('click', () => {
            input.value = email;
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true}));
            removeSuggestionBox();
        });
        suggestionBox.appendChild(item);
    });

    document.body.appendChild(suggestionBox);

    const rect = input.getBoundingClientRect();
    const boxHeight = suggestionBox.offsetHeight;

    suggestionBox.style.left = `${window.scrollX + rect.left}px`;
    suggestionBox.style.top = `${window.scrollY + rect.top - boxHeight - 4}px`;
    suggestionBox.style.minWidth = `${rect.width}px`;
    suggestionBox.style.visibility = 'visible'; // 表示
}

function removeSuggestionBox() {
    if (suggestionBox && suggestionBox.parentNode) {
        suggestionBox.parentNode.removeChild(suggestionBox);
        suggestionBox = null;
    }
}

function focusEvent(inputElem) {
    browser.storage.local.get('emailList').then(result => {
        const list = result.emailList || [];
        if (list.length > 0) {
            createSuggestionBox(inputElem, list);
        }
    });
}

function isEmailInput(elem) {
    const type = elem.getAttribute('type');
    const name = elem.getAttribute('name');
    const id = elem.getAttribute('id');
    const autocomplete = elem.getAttribute('autocomplete');
    const placeholder = elem.getAttribute('placeholder');
    const inputmode = elem.getAttribute('inputmode');
    const ariaLabel = elem.getAttribute('aria-label');
    const className = elem.className;

    if (type !== null && type.toLowerCase() === 'email') return true;
    if (name !== null && (name.toLowerCase().includes('mail') || name.toLowerCase().includes('username'))) return true;
    if (id !== null && (id.toLowerCase().includes('mail') || id.toLowerCase().includes('username'))) return true;
    if (autocomplete !== null && (autocomplete.toLowerCase().includes('email') || autocomplete.toLowerCase().includes('username'))) return true;
    if (placeholder !== null && (placeholder.toLowerCase().includes('mail') || placeholder.toLowerCase().includes('username'))) return true;
    if (inputmode !== null && inputmode.toLowerCase() === 'email') return true;
    if (ariaLabel !== null && (ariaLabel.toLowerCase().includes('mail') || ariaLabel.toLowerCase().includes('username'))) return true;
    if (className && (className.toLowerCase().includes('mail') || className.toLowerCase().includes('username'))) return true;
    if (elem.hasAttribute('data-email') || elem.hasAttribute('data-mail') || elem.hasAttribute('data-username')) return true;

    // ラベル要素のテキストも判定材料にする場合は追加実装が必要

    return false;
}

// ページ内のメールアドレス欄を監視して補完表示
function attachListenersToEmailInputs() {
    // dummyを作ることで動的なページで要素をクリアするようなサイトにも対応
    // jsで変数によるフラグ管理を行うと、動的なページで動作しない可能性がある
    const dummy = document.getElementById('autofill-dummyelem');
    if (dummy === null) {
        const dummy_elem = document.createElement('div');
        dummy_elem.id = 'autofill-dummyelem';
        dummy_elem.style.visibility = 'hidden';
        document.body.appendChild(dummy_elem);
        const inputs = document.querySelectorAll('input');
        inputs.forEach(input => {
            if (isEmailInput(input)) {
                input.addEventListener('focus', () => {
                    focusEvent(input);
                });
                input.addEventListener('blur', () => {
                    setTimeout(removeSuggestionBox, 200); // クリック後に消す猶予
                });
                input.addEventListener('click', () => {
                    focusEvent(input);
                });
            }
        });
    }
    const activeElem = document.activeElement;
    if (activeElem && activeElem.tagName === 'INPUT' && isEmailInput(activeElem)) {
        focusEvent(activeElem);
    }
}

// 初回 + 動的要素にも対応
const observer = new MutationObserver(() => {
    attachListenersToEmailInputs();
});
observer.observe(document.body, { childList: true, subtree: true });

// 初期実行
attachListenersToEmailInputs();

browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "showSuggestions") {
        const active = document.activeElement;
        if (active && active.tagName === "INPUT") {
            focusEvent(active);
        }
    }
});
