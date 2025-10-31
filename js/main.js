// js/main.js (已更新 - 2025/10/31 v4)

// --- ★★★ V5 移植過來的全域變數和輔助函式 ★★★ ---

// V5 [保留] openLink 函式 (快捷列會用到)
function openLink(url) {
    // [修改] 增加檢查，防止在編輯模式下點擊連結
    if (isWorkLinkEditing) return; 
    window.open(url, '_blank');
}

// 天氣 (V5)
const weatherCodes = {
  0:{emoji:'☀️',desc:'晴天'},1:{emoji:'🌤️',desc:'晴朗'},2:{emoji:'🌥️',desc:'多雲'},3:{emoji:'☁️',desc:'陰天'},
  45:{emoji:'🌫️',desc:'霧'},51:{emoji:'🌦️',desc:'小雨'},55:{emoji:'🌧️',desc:'大雨'},61:{emoji:'🌦️',desc:'小雨'},63:{emoji:'🌧️',desc:'中雨'},
  65:{emoji:'🌊',desc:'大雨'},80:{emoji:'🌦️',desc:'陣雨'},81:{emoji:'🌧️',desc:'陣雨'},82:{emoji:'🌊',desc:'大陣雨'},95:{emoji:'⛈️',desc:'雷雨'},
  99:{emoji:'🌪️',desc:'強雷雨'}
};

// 新聞 (V5)
const RSS_FEEDS = {
    tw: ['https://news.ltn.com.tw/rss/all.xml', 'https://www.cna.com.tw/rsspolitics.xml'],
    jp: ['https://www3.nhk.or.jp/rss/news/cat0.xml', 'https://www.asahi.com/rss/asahi/newsheadlines.rdf'],
    intl: ['https://feeds.bbci.co.uk/news/world/rss.xml']
};
let currentNewsTab = 'tw';

// 股票 (V5)
const stockWatchlist = {
  tw: ['2330','2317','2454','2603','0050'],
  us: ['AAPL','GOOGL','TSLA','NVDA','MSFT']
};
let stockCurrentMarket = 'tw';

// V5 日期函式
function updateDatetime() {
  const now = new Date();
  const targetMain = document.getElementById('datetime');
  if (targetMain) {
      targetMain.textContent = now.toLocaleDateString('zh-TW',{
        year:'numeric', month:'long', day:'numeric',weekday:'long',hour:'2-digit',minute:'2-digit'
      });
  }
}

// V5 天氣函式
function updateWeather(sourceSelectorId){
  const selectorMain = document.getElementById('locationSelectorMain');
  const targetRow = document.getElementById('weatherRow');
  if (!selectorMain || !targetRow) return;
  let v = selectorMain.value.split(',');
  targetRow.innerHTML = '<div class="weather-loading">載入天氣資料中...</div>';
  fetch(`https://api.open-meteo.com/v1/forecast?latitude=${v[0]}&longitude=${v[1]}&current_weather=true&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=Asia/Taipei&forecast_days=7`)
  .then(r=>r.json()).then(d=>{
    let html='';
    const wd=['週日','週一','週二','週三','週四','週五','週六'];
    for(let i=0;i<7;i++){
      const date= new Date (d.daily.time[i]);
      const dayName = i===0 ?'今天':wd[date.getDay()];
      const code = d.daily.weathercode[i];
      const w = weatherCodes[code] || { emoji:'🌥️', desc:'多雲'};
      const tMax = Math.round(d.daily.temperature_2m_max[i]);
      const tMin = Math.round(d.daily.temperature_2m_min[i]);
      const rainProb = d.daily.precipitation_probability_max[i] || 0;
      html+=`<div class="weather-day-h"><div class="weather-date-h">${dayName}</div><span class="weather-emoji-h">${w.emoji}</span><div class="weather-temp-h">${tMin}° - ${tMax}°</div><div class="weather-rain-h">🌧️ ${rainProb}%</div><div class="weather-desc-h">${w.desc}</div></div>`;
    }
    targetRow.innerHTML = html;
  }).catch(() => {
    targetRow.innerHTML='<div class="weather-loading">天氣資料載入失敗</div>';
  });
}

// V5 新聞函式
function switchNewsTab(tab){
  currentNewsTab = tab;
  const contentArea = document.getElementById('content-area');
  if (!contentArea) return;
  contentArea.querySelectorAll('.news-tab').forEach(btn => btn.classList.remove('active'));
  const activeTab = contentArea.querySelector('#tab-'+tab);
  if (activeTab) activeTab.classList.add('active');
  loadNews();
}
function cleanCData(str) {
    if (str.startsWith('<![CDATA[') && str.endsWith(']]>')) {
        return str.substring(9, str.length - 3);
    }
    return str.replace(/&/g, '&').replace(/</g, '<').replace(/>/g, '>');
}
function parseRSS(xmlText) {
    const articles = [];
    const maxArticles = 5;
    let items = [...xmlText.matchAll(/<item>([\s\S]*?)<\/item>/g)];
    if (items.length === 0) items.push(...xmlText.matchAll(/<item [^>]+>([\s\S]*?)<\/item>/g));
    if (items.length === 0) {
         items.push(...xmlText.matchAll(/<item[^>]+rdf:about="([^"]+)"[\s\S]*?<title>([\s\S]*?)<\/title>[\s\S]*?<\/item>/g));
         for (let i = 0; i < items.length && i < maxArticles; i++) {
             articles.push({ title: cleanCData(items[i][2]), url: items[i][1], source: { name: '朝日新聞' }});
         }
         return articles;
    }
    for (let i = 0; i < items.length && i < maxArticles; i++) {
        const itemContent = items[i][1];
        const titleMatch = itemContent.match(/<title>([\s\S]*?)<\/title>/);
        const title = titleMatch ? cleanCData(titleMatch[1]) : '無標題';
        const linkMatch = itemContent.match(/<link>([\s\S]*?)<\/link>/);
        const link = linkMatch ? (linkMatch[1] || '#') : '#';
        let sourceName = null;
        const creatorMatch = itemContent.match(/<dc:creator>([\s\S]*?)<\/dc:creator>/);
        sourceName = creatorMatch ? cleanCData(creatorMatch[1]) : 'N/A';
        articles.push({ title: title, url: link.trim(), source: { name: sourceName } });
    }
    return articles;
}
async function loadNews(){
  const list = document.getElementById('newsList');
  if (!list) return;
  list.innerHTML = '<li class="news-loading">載入新聞中...</li>';
  const refreshBtn = document.getElementById('refreshNewsBtn');
  if (refreshBtn) refreshBtn.disabled = true;
  const urlsToTry = RSS_FEEDS[currentNewsTab] || RSS_FEEDS['tw'];
  let success = false;
  for (const rssUrl of urlsToTry) {
      try {
          const proxyUrl = `/functions/get-news?url=${encodeURIComponent(rssUrl)}`;
          const res = await fetch(proxyUrl);
          const xmlText = await res.text();
          if (!res.ok) { throw new Error(xmlText); }
          const articles = parseRSS(xmlText);
          if (articles && articles.length > 0) {
              list.innerHTML = '';
               articles.forEach(article => {
                  let sourceName = article.source.name;
                  if (sourceName === 'N/A' || !sourceName) {
                      if (rssUrl.includes('cna.com')) sourceName = '中央通訊社';
                      else if (rssUrl.includes('ltn.com')) sourceName = '自由時報';
                      else if (rssUrl.includes('nhk.or.jp')) sourceName = 'NHK';
                      else if (rssUrl.includes('bbci.co.uk')) sourceName = 'BBC News';
                      else sourceName = 'RSS 來源';
                  }
                  list.insertAdjacentHTML('beforeend', `
                      <li class="news-item" onclick="openLink('${article.url}')">
                          <div class="news-item-title">${article.title || '無標題'}</div>
                          <div class="news-item-meta"><span>${sourceName}</span></div>
                      </li>`);
              });
              success = true;
              break;
           } else { throw new Error('RSS 內容為空或無法解析'); }
      } catch(e) { 
          console.warn(`RSS 來源 ${rssUrl} 失敗: ${e.message}`); 
          list.innerHTML = `<li class="news-loading">新聞載入失敗: ${e.message}</li>`;
      }
  }
  if (!success && list.innerHTML.includes('載入新聞中')) { 
      list.innerHTML = `<li class="news-loading">新聞載入失敗。</li>`;
  }
  if (refreshBtn) refreshBtn.disabled = false;
}

// V5 股票函式
function switchStockMarket(market){
  stockCurrentMarket=market;
  const contentArea = document.getElementById('content-area');
  if (!contentArea) return;
  contentArea.querySelectorAll('.stock-tab').forEach(b => b.classList.remove('active'));
  const activeTab = contentArea.querySelector('#stockTab_' + market);
  if (activeTab) activeTab.classList.add('active');
  loadStocks();
}
async function loadStocks(){
  const container = document.getElementById('stocksList');
  if (!container) return;
  const watchlist = stockWatchlist[stockCurrentMarket];
  container.innerHTML = '<div class="stocks-loading">載入股票資料中...</div>';
  if(stockCurrentMarket==='tw'){
    container.innerHTML = '';
    for(const symbol of watchlist){
      try{
        const proxyUrl = `/functions/get-tw-stock?symbol=${symbol}`;
        const res = await fetch(proxyUrl);
        const data = await res.json();
        if (data.error) { throw new Error(data.error); }
        if(data.msgArray && data.msgArray.length > 0) {
          const st = data.msgArray[0];
          const price = parseFloat(st.z) || 0;
          const prevClose = parseFloat(st.y) || price;
          const change = price - prevClose;
          const changePercent = prevClose!==0 ? (change/prevClose)*100 : 0;
          const c = change>0 ? 'stock-up' : change<0 ? 'stock-down' : 'stock-neutral';
          container.insertAdjacentHTML('beforeend', `<div class="stock-item"><div class="stock-info"><div class="stock-symbol">${symbol}</div><div class="stock-name">${st.n||symbol}</div></div><div class="stock-price-info"><div class="stock-price ${c}">$${price.toFixed(2)}</div><div class="stock-change ${c}">${change>0?'+':''}${change.toFixed(2)} (${changePercent>0?'+':''}${changePercent.toFixed(2)}%)</div></div></div>`);
        } else { container.insertAdjacentHTML('beforeend', `<div class="stock-item">無法取得 ${symbol} 資訊</div>`); }
      }catch(e){ container.insertAdjacentHTML('beforeend', `<div class="stock-item">載入 ${symbol} 失敗: ${e.message}</div>`); }
    }
  } else {
    container.innerHTML = '';
    for(const symbol of watchlist){
      try{
        const url = `/functions/get-stock?symbol=${symbol}`; 
        const response = await fetch(url);
        const data = await response.json();
        if (data.error) {
            let detail = data.details ? ` (${data.details})` : '';
            throw new Error(`${data.error}${detail}`);
        }
        if (data['Error Message']) { throw new Error(data['Error Message']); }
        if (data.Note) { throw new Error(data.Note); }
        if(data['Global Quote'] && Object.keys(data['Global Quote']).length > 0){
          const q = data['Global Quote'];
          const price = parseFloat(q["05. price"]) || 0;
          const change = parseFloat(q["09. change"]) || 0;
          const changePercent = parseFloat(q["10. change percent"]?.replace('%','')) || 0;
          const c = change > 0 ? 'stock-up' : change < 0 ? 'stock-down' : 'stock-neutral';
          container.insertAdjacentHTML('beforeend', `<div class="stock-item"><div class="stock-info"><div class="stock-symbol">${symbol}</div><div class="stock-name">${q["01. symbol"]||symbol}</div></div><div class="stock-price-info"><div class="stock-price ${c}">$${price.toFixed(2)}</div><div class="stock-change ${c}">${change>0?'+':''}${change.toFixed(2)} (${changePercent>0?'+':''}${changePercent.toFixed(2)}%)</div></div></div>`);
        } else { throw new Error('API 返回了空資料'); }
      }catch(e){ 
          console.error(`載入 ${symbol} 失敗:`, e);
          container.insertAdjacentHTML('beforeend', `<div class="stock-item">載入 ${symbol} 失敗: ${e.message}</div>`); 
      }
      await delay(1400); 
    }
  }
}
function delay(ms){return new Promise(r=>setTimeout(r,ms));}
function addStock() {
  const input = document.getElementById('stockInput');
  if (!input) return;
  let symbol=input.value.trim().toUpperCase();
  if(!symbol) return alert('請輸入股票代碼');
  if (stockCurrentMarket === 'tw') {
      const twSymbol = symbol.match(/\d+/);
      if (twSymbol) { symbol = twSymbol[0]; }
  }
  const list=stockWatchlist[stockCurrentMarket];
  if(list.includes(symbol)) return alert('股票已在清單');
  if(list.length >= 7) return alert('最多只能追蹤7支股票');
  list.push(symbol);
  input.value = '';
  loadStocks();
}


// --- ★★★ 1. (修改) "工作" 分頁快捷列資料 ★★★ ---

// 預設連結 (僅在 localStorage 為空時使用)
const defaultWorkLinks = [
    { name: 'WACA', url: 'https://waca.com.tw', icon: 'GO' },
    { name: 'ヤクルト本社', url: 'https://www.yakult.co.jp', icon: '本社' },
    { name: '養楽多超人', url: 'https://www.yakult.com.tw', icon: '超人' },
    { name: 'Cloudflare', url: 'https://dash.cloudflare.com/', icon: 'CF' },
    { name: 'GitHub', url: 'https://github.com/', icon: 'GH' },
    { name: 'Gemini', url: 'https://gemini.google.com/', icon: 'AI' }
];

// 全域變數，用於儲存連結和編輯狀態
let workQuickLinks = [];
let isWorkLinkEditing = false;


// --- ★★★ 2. (修改) "工作" 分頁 JS 邏輯 (V5 移植 + 新增編輯功能) ★★★ ---

// 2a. 快捷列 (新增 載入/儲存/渲染/編輯 功能)
function loadWorkQuickLinks() {
    const storedLinks = localStorage.getItem('portalWorkLinks');
    if (storedLinks) {
        workQuickLinks = JSON.parse(storedLinks);
    } else {
        // 如果 localStorage 沒有，則使用預設值
        workQuickLinks = defaultWorkLinks;
        saveWorkQuickLinks();
    }
}
function saveWorkQuickLinks() {
    localStorage.setItem('portalWorkLinks', JSON.stringify(workQuickLinks));
}
function renderWorkQuickLinks() {
    const container = document.getElementById('workQuickLinksContainer');
    if (!container) return;
    container.innerHTML = ''; // 清空

    // 根據編輯狀態，切換容器的 class
    container.classList.toggle('editing', isWorkLinkEditing);
    
    workQuickLinks.forEach((link, index) => {
        container.innerHTML += `
            <a class="quick-link-item" onclick="openLink('${link.url}')" title="${link.name}">
                ${isWorkLinkEditing ? `<button class="quick-link-delete-btn" data-index="${index}">×</button>` : ''}
                <div class="quick-link-icon">${link.icon}</div>
                <div class="quick-link-name">${link.name}</div>
            </a>
        `;
    });

    // 在編輯模式下，顯示 "新增" 按鈕
    if (isWorkLinkEditing) {
        container.innerHTML += `
            <a class="quick-link-item quick-link-add-btn" id="addNewLinkBtn" title="新增連結">
                <div class="quick-link-icon">+</div>
                <div class="quick-link-name">新增連結</div>
            </a>
        `;
    }
}
function toggleEditMode() {
    isWorkLinkEditing = !isWorkLinkEditing; // 切換狀態
    const editBtn = document.getElementById('editLinksBtn');
    
    if (isWorkLinkEditing) {
        if(editBtn) editBtn.textContent = '完成';
        if(editBtn) editBtn.classList.add('editing');
    } else {
        if(editBtn) editBtn.textContent = '編輯';
        if(editBtn) editBtn.classList.remove('editing');
        hideLinkForm(); // 退出編輯模式時，隱藏表單
    }
    renderWorkQuickLinks(); // 重新渲染以顯示/隱藏 "X" 按鈕
}
function showLinkForm(index = -1) {
    const form = document.getElementById('quickLinkFormArea');
    const title = document.getElementById('quickFormTitle');
    const nameInput = document.getElementById('quickLinkName');
    const urlInput = document.getElementById('quickLinkUrl');
    const iconInput = document.getElementById('quickLinkIcon');
    const indexInput = document.getElementById('quickLinkIndex');
    
    if (!form || !title || !nameInput || !urlInput || !iconInput || !indexInput) return;

    if (index === -1) {
        // 新增
        title.textContent = '新增連結';
        indexInput.value = '-1';
        nameInput.value = '';
        urlInput.value = '';
        iconInput.value = '';
    } else {
        // 編輯 (目前未啟用，但為未來保留)
        // const link = workQuickLinks[index];
        // title.textContent = '編輯連結';
        // indexInput.value = index;
        // nameInput.value = link.name;
        // urlInput.value = link.url;
        // iconInput.value = link.icon;
    }
    form.style.display = 'flex'; // 顯示表單
}
function hideLinkForm() {
    const form = document.getElementById('quickLinkFormArea');
    if (form) form.style.display = 'none'; // 隱藏表單
}
function saveLink() {
    const nameInput = document.getElementById('quickLinkName');
    const urlInput = document.getElementById('quickLinkUrl');
    const iconInput = document.getElementById('quickLinkIcon');
    const indexInput = document.getElementById('quickLinkIndex');

    const name = nameInput.value.trim();
    let url = urlInput.value.trim();
    const icon = iconInput.value.trim() || name.substring(0, 2); // 如果圖示為空，取名稱前兩字
    const index = parseInt(indexInput.value, 10);

    if (!name || !url) {
        alert('名稱和網址為必填項。');
        return;
    }
    
    // 自動為網址加上 https:// (如果需要)
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
    }

    if (index === -1) {
        // 新增
        workQuickLinks.push({ name, url, icon });
    } else {
        // 編輯 (目前未啟用)
        // workQuickLinks[index] = { name, url, icon };
    }
    
    saveWorkQuickLinks();
    renderWorkQuickLinks();
    hideLinkForm();
}
function deleteLink(index) {
    if (confirm(`確定要刪除 "${workQuickLinks[index].name}" 嗎？`)) {
        workQuickLinks.splice(index, 1); // 從陣列中移除
        saveWorkQuickLinks();
        renderWorkQuickLinks(); // 重新渲染
    }
}


// 2b. 待辦事項 (V5)
let todos = [];
function loadTodos() {
  const storedTodos = localStorage.getItem('portalTodos');
  if (storedTodos) { todos = JSON.parse(storedTodos); }
  renderTodos();
}
function saveTodos() {
  localStorage.setItem('portalTodos', JSON.stringify(todos));
}
function renderTodos() {
  const listElement = document.getElementById('todoList');
  if (!listElement) return;
  listElement.innerHTML = '';
  if (todos.length === 0) {
    listElement.innerHTML = '<li class="todo-item" style="color: #7a9794;">目前沒有待辦事項</li>';
    return;
  }
  todos.forEach((todo, index) => {
    const item = document.createElement('li');
    item.className = `todo-item ${todo.completed ? 'completed' : ''}`;
    item.innerHTML = `<span class="todo-item-text" data-index="${index}">${todo.text}</span><button class="todo-delete-btn" data-index="${index}">刪除</button>`;
    listElement.appendChild(item);
  });
}
function addTodo() {
  const input = document.getElementById('todoInput');
  if (!input) return;
  const text = input.value.trim();
  if (text) {
    todos.push({ text: text, completed: false });
    input.value = '';
    saveTodos();
    renderTodos();
  }
}
function handleTodoClick(e) {
  const target = e.target;
  const index = target.dataset.index;
  if (index === undefined) return;
  if (target.classList.contains('todo-item-text')) {
    todos[index].completed = !todos[index].completed;
  } else if (target.classList.contains('todo-delete-btn')) {
    todos.splice(index, 1);
  }
  saveTodos();
  renderTodos();
}

// 2c. 快速筆記 (V5)
function loadNotes() {
  const notesArea = document.getElementById('quickNotesArea');
  if (notesArea) {
    notesArea.value = localStorage.getItem('portalQuickNotes') || '';
  }
}
function saveNotes() {
  const notesArea = document.getElementById('quickNotesArea');
  const statusEl = document.getElementById('notesSavedStatus');
  if (notesArea) {
    localStorage.setItem('portalQuickNotes', notesArea.value);
    if(statusEl) {
        statusEl.textContent = '筆記已儲存。';
        setTimeout(() => { statusEl.textContent = '所有變更已自動儲存'; }, 2000);
    }
  }
}

// 2d. 番茄鐘 (V5)
let pomoInterval;
let pomoTimeLeft = 25 * 60;
let pomoMode = 'work';
let isPomoRunning = false;
function updatePomoDisplay() {
  const pomoTimerDisplay = document.getElementById('pomodoroTimer');
  if (!pomoTimerDisplay) return;
  const minutes = Math.floor(pomoTimeLeft / 60);
  const seconds = pomoTimeLeft % 60;
  pomoTimerDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}
function startPausePomo() {
  const pomoStartPauseBtn = document.getElementById('pomoStartPauseBtn');
  if (isPomoRunning) {
    clearInterval(pomoInterval);
    isPomoRunning = false;
    if (pomoStartPauseBtn) pomoStartPauseBtn.textContent = '繼續';
  } else {
    isPomoRunning = true;
    if (pomoStartPauseBtn) pomoStartPauseBtn.textContent = '暫停';
    pomoInterval = setInterval(() => {
      pomoTimeLeft--;
      updatePomoDisplay();
      if (pomoTimeLeft < 0) {
        clearInterval(pomoInterval);
        const pomoStatusDisplay = document.getElementById('pomodoroStatus');
        if (pomoMode === 'work') {
          pomoMode = 'break';
          pomoTimeLeft = 5 * 60;
          if (pomoStatusDisplay) pomoStatusDisplay.textContent = '休息時間 ☕';
          alert('工作時間結束！休息 5 分鐘。');
        } else {
          pomoMode = 'work';
          pomoTimeLeft = 25 * 60;
          if (pomoStatusDisplay) pomoStatusDisplay.textContent = '準備開始工作 🧑‍💻';
          alert('休息結束！準備開始工作。');
        }
        isPomoRunning = false;
        if (pomoStartPauseBtn) pomoStartPauseBtn.textContent = '開始';
        updatePomoDisplay();
      }
    }, 1000);
  }
}
function resetPomo() {
  clearInterval(pomoInterval);
  isPomoRunning = false;
  pomoMode = 'work';
  pomoTimeLeft = 25 * 60;
  updatePomoDisplay();
  const pomoStartPauseBtn = document.getElementById('pomoStartPauseBtn');
  const pomoStatusDisplay = document.getElementById('pomodoroStatus');
  if (pomoStartPauseBtn) pomoStartPauseBtn.textContent = '開始';
  if (pomoStatusDisplay) pomoStatusDisplay.textContent = '準備開始工作 🧑‍💻';
}

// --- ★★★ 3. (修改) 新架構的 JS 邏輯 ★★★ ---

document.addEventListener('DOMContentLoaded', function() {
    
    const tabLinks = document.querySelectorAll('.tab-link');
    const contentArea = document.getElementById('content-area');

    async function loadContent(pageName) {
        contentArea.style.opacity = 0;
        try {
            const response = await fetch(`pages/${pageName}.html`);
            if (!response.ok) {
                contentArea.innerHTML = `<h2>錯誤 (404)</h2><p>無法載入 <strong>pages/${pageName}.html</strong></p>`;
            } else {
                const html = await response.text();
                contentArea.innerHTML = html;
                
                if (pageName === 'home') {
                    initHomePage();
                } else if (pageName === 'work') {
                    initWorkPage();
                }
            }
        } catch (error) {
            console.error('Fetch Error:', error);
            contentArea.innerHTML = `<h2>載入錯誤</h2><p>無法擷取內容。</p>`;
        }
        contentArea.style.opacity = 1;
    }

    // "首頁" 啟動函式 (V5 移植)
    function initHomePage() {
        updateDatetime();
        updateWeather('locationSelectorMain');
        loadStocks();
        loadNews();
        const homeContent = document.getElementById('content-area');
        if (!homeContent) return; 
        const weatherSelector = homeContent.querySelector('#locationSelectorMain');
        if (weatherSelector) weatherSelector.onchange = () => updateWeather('locationSelectorMain');
        const newsTw = homeContent.querySelector('#tab-tw');
        if (newsTw) newsTw.onclick = () => switchNewsTab('tw');
        const newsJp = homeContent.querySelector('#tab-jp');
        if (newsJp) newsJp.onclick = () => switchNewsTab('jp');
        const newsIntl = homeContent.querySelector('#tab-intl');
        if (newsIntl) newsIntl.onclick = () => switchNewsTab('intl');
        const refreshNews = homeContent.querySelector('#refreshNewsBtn');
        if (refreshNews) refreshNews.onclick = loadNews;
        const stockTw = homeContent.querySelector('#stockTab_tw');
        if (stockTw) stockTw.onclick = () => switchStockMarket('tw');
        const stockUs = homeContent.querySelector('#stockTab_us');
        if (stockUs) stockUs.onclick = () => switchStockMarket('us');
        const addStockBtn = homeContent.querySelector('#stockAddBtn');
        if (addStockBtn) addStockBtn.onclick = addStock;
    }
    
    // (修改) "工作" 頁面啟動函式
    function initWorkPage() {
        // 1. 啟動快捷列
        loadWorkQuickLinks(); // 從 localStorage 載入
        renderWorkQuickLinks(); // 渲染到畫面上

        // 2. 啟動 V5 功能
        loadTodos();
        loadNotes();
        updatePomoDisplay();
        
        // 3. 綁定所有 "工作" 頁面的事件
        const workContent = document.getElementById('content-area');
        if (!workContent) return;

        // 綁定快捷列按鈕
        const editLinksBtn = workContent.querySelector('#editLinksBtn');
        if (editLinksBtn) editLinksBtn.onclick = toggleEditMode;

        const saveLinkBtn = workContent.querySelector('#saveLinkBtn');
        if (saveLinkBtn) saveLinkBtn.onclick = saveLink;

        const cancelLinkBtn = workContent.querySelector('#cancelLinkBtn');
        if (cancelLinkBtn) cancelLinkBtn.onclick = hideLinkForm;
        
        // 使用事件委派來處理動態產生的 "刪除" 和 "新增" 按鈕
        const linksContainer = workContent.querySelector('#workQuickLinksContainer');
        if (linksContainer) {
            linksContainer.onclick = function(e) {
                const deleteBtn = e.target.closest('.quick-link-delete-btn');
                const addBtn = e.target.closest('#addNewLinkBtn');
                
                if (deleteBtn) {
                    e.stopPropagation(); // 防止觸發 openLink
                    e.preventDefault();
                    deleteLink(deleteBtn.dataset.index);
                } else if (addBtn) {
                    e.stopPropagation();
                    e.preventDefault();
                    showLinkForm(-1); // 顯示 "新增" 表單
                }
            };
        }

        // 綁定待辦事項
        const addTodoBtn = workContent.querySelector('#addTodoBtn');
        if (addTodoBtn) addTodoBtn.onclick = addTodo;
        const todoInput = workContent.querySelector('#todoInput');
        if (todoInput) todoInput.addEventListener('keypress', e => { if (e.key === 'Enter') addTodo(); });
        const todoList = workContent.querySelector('#todoList');
        if (todoList) todoList.addEventListener('click', handleTodoClick);

        // 綁定快速筆記
        const notesArea = workContent.querySelector('#quickNotesArea');
        if (notesArea) notesArea.addEventListener('input', saveNotes); 

        // 綁定番茄鐘
        const pomoStartBtn = workContent.querySelector('#pomoStartPauseBtn');
        if (pomoStartBtn) pomoStartBtn.onclick = startPausePomo;
        const pomoResetBtn = workContent.querySelector('#pomoResetBtn');
        if (pomoResetBtn) pomoResetBtn.onclick = resetPomo;
    }

    // 處理分頁點擊
    function handleTabClick(e) {
        e.preventDefault();
        const clickedTab = e.currentTarget;
        const pageName = clickedTab.getAttribute('data-tab');
        tabLinks.forEach(link => link.classList.remove('active'));
        clickedTab.classList.add('active');
        loadContent(pageName);
    }

    // 初始綁定
    tabLinks.forEach(link => {
        link.addEventListener('click', handleTabClick);
    });

    // 初始載入 "首頁"
    loadContent('home');
});
