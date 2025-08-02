// Default SortableJS
// import Sortable from 'SortableJS';

// Q.なぜUUIDの生成用の関数を定義しているのか？（直接crypto.randomUUID()を実行していない理由）
// A.将来的にUUIDの生成方法を変更したい場合に修正箇所を減らすため、関数として定義している。
function generateId() {
    return crypto.randomUUID();
}

// メールアドレスリストを描画する関数
function renderEmailList(emails) {
    const ul = document.getElementById('email-list');
    ul.innerHTML = '';

    emails.forEach(({ id, email }) => {
        const li = document.createElement('li');
        li.setAttribute('data-id', id);

        const span = document.createElement('span');
        span.textContent = email;

        const delBtn = document.createElement('button');
        delBtn.textContent = browser.i18n.getMessage('removeButton');
        delBtn.setAttribute('data-i18n', 'removeButton');
        delBtn.onclick = () => deleteEmail(id);

        li.appendChild(span);
        li.appendChild(delBtn);
        ul.appendChild(li);

        // const sortable = Sortable.create(li, {
        //     animation: 150,
        //     onEnd: () => {
        //         const newOrder = Array.from(document.querySelectorAll('#email-list li'))
        //             .map(li => li.getAttribute('data-id'));

        //         browser.storage.local.get('emailList').then(result => {
        //             const list = result.emailList || [];
        //             const sorted = newOrder.map(id => list.find(item => item.id === id));
        //             browser.storage.local.set({ emailList: sorted });
        //         });
        //     }
        // });
    });
}

// 保存したメールアドレスを取得する
function loadEmails() {
    browser.storage.local.get('emailList').then(result => {
        const emails = result.emailList || [];
        renderEmailList(emails);
    });
}

// メールアドレス形式チェック用関数
function isValidEmail(email) {
    // 一般的なメールアドレスの正規表現
    const emailRegex = /^[a-zA-Z0-9]+[a-zA-Z0-9\._+-]*@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
    return emailRegex.test(email);
}

// メールアドレスを追加（保存）する
function addEmail() {
    const input = document.getElementById('new-email');
    const email = input.value.trim();
    if (!email) return;

    if (!isValidEmail(email)) {
        alert('正しいメールアドレス形式で入力してください');
        return;
    }

    browser.storage.local.get('emailList').then(result => {
        const list = result.emailList || [];
        if (list.some(e => e.email === email)) {
            alert(browser.i18n.getMessage('duplicateWarning'));
            return;
        }
        list.push({ id: generateId(), email });
        browser.storage.local.set({ emailList: list }).then(() => {
            input.value = '';
            loadEmails();
        });
    });
}

// メールアドレスを削除する
function deleteEmail(id) {
    browser.storage.local.get('emailList').then(result => {
        const list = result.emailList || [];
        const filtered = list.filter(item => item.id !== id);
        browser.storage.local.set({ emailList: filtered }).then(loadEmails);
    });
}

// メールアドレスを並び替え可能にするための魔法
function setupSortable() {
    new Sortable(document.getElementById('email-list'), {
        animation: 150,
        onEnd: () => {
            const newOrder = Array.from(document.querySelectorAll('#email-list li'))
                .map(li => li.getAttribute('data-id'));

            browser.storage.local.get('emailList').then(result => {
                const list = result.emailList || [];
                const sorted = newOrder.map(id => list.find(item => item.id === id));
                browser.storage.local.set({ emailList: sorted });
            });
        }
    });
}

// 翻訳を読み込む関数
function i18nReplace() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        const msg = browser.i18n.getMessage(key);
        if (msg) el.textContent = msg;
    });
}

// エクスポート処理
function exportEmails() {
    browser.storage.local.get('emailList').then(result => {
        const emails = result.emailList || [];
        const blob = new Blob([JSON.stringify(emails, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = 'emails.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });
}

// インポート処理
function importEmailsFromFile(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const imported = JSON.parse(e.target.result);
            if (!Array.isArray(imported)) throw new Error("Invalid format");
            // id, email の形式かチェック
            if (!imported.every(item => typeof item.email === "string")) throw new Error("Invalid data");
            browser.storage.local.set({ emailList: imported }).then(loadEmails);
        } catch (err) {
            alert("インポート失敗: " + err.message);
        }
    };
    reader.readAsText(file);
}

// ボタンイベント登録
document.addEventListener('DOMContentLoaded', () => {
    i18nReplace();
    document.getElementById('add-email').addEventListener('click', addEmail);
    document.getElementById('new-email').addEventListener('keypress', function (e) {
        if (e.key === 'Enter') {
            addEmail();
        }
    })
    document.getElementById('export-emails').addEventListener('click', exportEmails);
    document.getElementById('import-emails-btn').addEventListener('click', () => {
        document.getElementById('import-emails').click();
    });
    document.getElementById('import-emails').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) importEmailsFromFile(file);
        e.target.value = ''; // 同じファイルを連続で選択できるように
    });
    loadEmails();
    setupSortable();
});
