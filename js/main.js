// js/main.js

// --- ★★★ V5 移植過來的全域變數和輔助函式 ★★★ ---

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
  // 我們只更新首頁的日期 (V5 的 nav-datetime 在新架構不存在)
  if (targetMain) {
      targetMain.textContent = now.toLocaleDateString('zh-TW',{
        year:'numeric', month:'long', day:'numeric',weekday:'long',hour:'2-digit',minute:'2-digit'
      });
  }
}

// V5 天氣函式
function updateWeather(sourceSelectorId){
  // 導覽列的選擇器 (locationSelectorNav) 在新架構不存在
  // 我們只使用首頁的 (locationSelectorMain)
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
  // 限制搜尋範圍在 content-area 內，避免抓到其他頁面的
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
          const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(rssUrl)}`;
          const res = await fetch(proxyUrl);
          if (!res.ok) throw new Error(`代理伺服器錯誤 (狀態: ${res.status})`);
          const data = await res.json();
          const xmlText = data.contents;
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
                      <li class="news-item" onclick="window.open('${article.url}','_blank')">
                          <div class="news-item-title">${article.title || '無標題'}</div>
                          <div class="news-item-meta"><span>${sourceName}</span></div>
                      </li>`);
              });
              success = true;
              break;
           } else { throw new Error('RSS 內容為空或無法解析'); }
      } catch(e) { console.warn(`RSS 來源 ${rssUrl} 失敗: ${e.message}`); }
  }
  if (!success) { list.innerHTML = `<li class="news-loading">新聞載入失敗。</li>`; }
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
        const twseUrl = `https://mis.twse.com.tw/stock/api/getStockInfo.jsp?ex_ch=tse_${symbol}.tw&json=1&delay=0`;
        const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(twseUrl)}`;
        const res = await fetch(proxyUrl);
        const jsonData = await res.json();
        const data = JSON.parse(jsonData.contents);
        
        if(data.msgArray && data.msgArray.length > 0) {
          const st = data.msgArray[0];
          const price = parseFloat(st.z) || 0;
          const prevClose = parseFloat(st.y) || price;
          const change = price - prevClose;
          const changePercent = prevClose!==0 ? (change/prevClose)*100 : 0;
          const c = change>0 ? 'stock-up' : change<0 ? 'stock-down' : 'stock-neutral';
          container.insertAdjacentHTML('beforeend', `<div class="stock-item"><div class="stock-info"><div class="stock-symbol">${symbol}</div><div class="stock-name">${st.n||symbol}</div></div><div class="stock-price-info"><div class="stock-price ${c}">$${price.toFixed(2)}</div><div class="stock-change ${c}">${change>0?'+':''}${change.toFixed(2)} (${changePercent>0?'+':''}${changePercent.toFixed(2)}%)</div></div></div>`);
        } else { container.insertAdjacentHTML('beforeend', `<div class="stock-item">無法取得 ${symbol} 資訊</div>`); }
      }catch(e){ container.insertAdjacentHTML('beforeend', `<div class="stock-item">載入 ${symbol} 失敗</div>`); }
    }
  } else {
    // ★★★ V5 美股 (使用 Cloudflare Function) ★★★
    container.innerHTML = '';
    for(const symbol of watchlist){
      try{
        // 呼叫我們自己的代理
        const url = `/functions/get-stock?symbol=${symbol}`; 
        const response = await fetch(url);
        const data = await response.json();
        if (data.error || data['Error Message']) { throw new Error(data.error || data['Error Message'] || 'API 限制'); }

        if(data['Global Quote']){
          const q = data['Global Quote'];
          const price = parseFloat(q["05. price"]) || 0;
          const change = parseFloat(q["09. change"]) || 0;
          const changePercent = parseFloat(q["10. change percent"]?.replace('%','')) || 0;
          const c = change > 0 ? 'stock-up' : change < 0 ? 'stock-down' : 'stock-neutral';
          container.insertAdjacentHTML('beforeend', `<div class="stock-item"><div class="stock-info"><div class="stock-symbol">${symbol}</div><div class="stock-name">${q["01. symbol"]||symbol}</div></div><div class="stock-price-info"><div class="stock-price ${c}">$${price.toFixed(2)}</div><div class="stock-change ${c}">${change>0?'+':''}${change.toFixed(2)} (${changePercent>0?'+':''}${changePercent.toFixed(2)}%)</div></div></div>`);
        } else { container.insertAdjacentHTML('beforeend', `<div class="stock-item">無法取得 ${symbol} 資訊 (API 限制)</div>`); }
      }catch(e){ container.insertAdjacentHTML('beforeend', `<div class="stock-item">載入 ${symbol} 失敗: ${e.message}</div>`); }
      await delay(1400); // 保留 V5 的延遲
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

// --- ★★★ 新架構的 JS 邏輯 (已修改) ★★★ ---

document.addEventListener('DOMContentLoaded', function() {
    
    const tabLinks = document.querySelectorAll('.tab-link');
    const contentArea = document.getElementById('content-area');

    /**
     * 核心功能：載入內容 (★ 已修改 ★)
     */
    async function loadContent(pageName) {
        contentArea.style.opacity = 0;
        try {
            const response = await fetch(`pages/${pageName}.html`);
            if (!response.ok) {
                contentArea.innerHTML = `<h2>錯誤 (404)</h2><p>無法載入 <strong>pages/${pageName}.html</strong></p>`;
            } else {
                const html = await response.text();
                contentArea.innerHTML = html;
                
                // ★★★ 關鍵點 ★★★
                // 如果載入的是首頁，就執行首頁的初始化
                if (pageName === 'home') {
                    initHomePage();
                }
            }
        } catch (error) {
            console.error('Fetch Error:', error);
            contentArea.innerHTML = `<h2>載入錯誤</h2><p>無法擷取內容。</p>`;
        }
        contentArea.style.opacity = 1;
    }

    /**
     * 新函式：初始化首頁 (V5 功能啟動點)
     */
    function initHomePage() {
        // 1. 載入 V5 資料
        updateDatetime();
        updateWeather('locationSelectorMain');
        loadStocks();
        loadNews();

        // 2. 綁定 V5 按鈕事件 (因為是動態載入，必須在這裡重新綁定)
        // (使用 #content-area 作為事件代理，確保元素存在)
        const homeContent = document.getElementById('content-area');

        // 綁定天氣選擇器
        const weatherSelector = homeContent.querySelector('#locationSelectorMain');
        if (weatherSelector) weatherSelector.onchange = () => updateWeather('locationSelectorMain');
        
        // 綁定新聞按鈕
        const newsTw = homeContent.querySelector('#tab-tw');
        if (newsTw) newsTw.onclick = () => switchNewsTab('tw');
        
        const newsJp = homeContent.querySelector('#tab-jp');
        if (newsJp) newsJp.onclick = () => switchNewsTab('jp');
        
        const newsIntl = homeContent.querySelector('#tab-intl');
        if (newsIntl) newsIntl.onclick = () => switchNewsTab('intl');
        
        const refreshNews = homeContent.querySelector('#refreshNewsBtn');
        if (refreshNews) refreshNews.onclick = loadNews;

        // 綁定股票按鈕
        const stockTw = homeContent.querySelector('#stockTab_tw');
        if (stockTw) stockTw.onclick = () => switchStockMarket('tw');
        
        const stockUs = homeContent.querySelector('#stockTab_us');
        if (stockUs) stockUs.onclick = () => switchStockMarket('us');
        
        const addStockBtn = homeContent.querySelector('#stockAddBtn');
        if (addStockBtn) addStockBtn.onclick = addStock;
    }

    /**
     * 處理分頁點擊事件 (新架構)
     */
    function handleTabClick(e) {
        e.preventDefault();
        const clickedTab = e.currentTarget;
        const pageName = clickedTab.getAttribute('data-tab');

        tabLinks.forEach(link => link.classList.remove('active'));
        clickedTab.classList.add('active');
        loadContent(pageName);
    }

    // 為所有莫蘭迪導覽列按鈕綁定事件
    tabLinks.forEach(link => {
        link.addEventListener('click', handleTabClick);
    });

    // 初始載入 "首頁"
    loadContent('home');
});
