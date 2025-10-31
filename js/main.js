// js/main.js

// 等待 HTML 文件完全載入後再執行
document.addEventListener('DOMContentLoaded', function() {
    
    // 1. 選取所有 "分頁按鈕" 和 "內容容器"
    const tabLinks = document.querySelectorAll('.tab-link');
    const contentArea = document.getElementById('content-area');

    /**
     * 2. 核心功能：載入內容
     * @param {string} pageName - 來自 data-tab 的名稱 (例如 "home", "news")
     */
    async function loadContent(pageName) {
        // (a) 開始載入前，先淡出舊內容 (透明度設為 0)
        contentArea.style.opacity = 0;

        try {
            // (b) 使用 fetch 取得對應的 HTML 檔案
            //     範例: fetch('pages/home.html')
            const response = await fetch(`pages/${pageName}.html`);

            // (c) 檢查請求是否成功
            if (!response.ok) {
                // 如果檔案不存在或伺服器錯誤 (例如 404)
                contentArea.innerHTML = `<h2>錯誤 (404)</h2><p>無法載入 <strong>pages/${pageName}.html</strong> 頁面內容。請檢查檔案是否存在。</p>`;
            } else {
                // (d) 取得 HTML 文字內容
                const html = await response.text();
                // (e) 將內容注入到 contentArea
                contentArea.innerHTML = html;
            }

        } catch (error) {
            // 處理網路錯誤 (例如本機測試時的 CORS 錯誤，或網路中斷)
            console.error('Fetch Error:', error);
            contentArea.innerHTML = `<h2>載入錯誤</h2><p>無法擷取內容。如果您是在本機測試，請確保您是透過 Web 伺服器 (例如 VS Code 的 Live Server) 執行，而不是直接打開 index.html 檔案。</p>`;
        }
        
        // (f) 載入完成後，淡入新內容 (透明度設為 1)
        contentArea.style.opacity = 1;
    }

    /**
     * 3. 處理分頁點擊事件
     */
    function handleTabClick(e) {
        e.preventDefault(); // 防止點擊 <a> 時頁面跳轉或重整

        const clickedTab = e.currentTarget;
        const pageName = clickedTab.getAttribute('data-tab');

        // (a) 移除所有按鈕的 "active" 樣式
        tabLinks.forEach(link => {
            link.classList.remove('active');
        });

        // (b) 只為 "被點擊的" 這個按鈕加上 "active" 樣式
        clickedTab.classList.add('active');

        // (c) 載入對應的內容
        loadContent(pageName);
    }

    // 4. 為每一個 "分頁按鈕" 加上點擊事件監聽
    tabLinks.forEach(link => {
        link.addEventListener('click', handleTabClick);
    });

    // 5. 初始載入：
    //    網頁一打開，自動載入 "首頁" (有 .active 的那個分頁)
    const initialTab = document.querySelector('.tab-link.active');
    if (initialTab) {
        loadContent(initialTab.getAttribute('data-tab'));
    } else {
        // 備用：如果沒有任何分頁是 active，預設載入 home
        loadContent('home');
    }
});
