/*
 * 檔案路徑: /functions/get-stock.js (★ 更新版)
 * 強化標頭並改善錯誤處理
 */
export async function onRequest(context) {
  const { searchParams } = new URL(context.request.url);
  const symbol = searchParams.get('symbol');
  if (!symbol) {
    return new Response(JSON.stringify({ error: 'Missing symbol' }), {
      status: 400, headers: { 'Content-Type': 'application/json' }
    });
  }

  // ★ [關鍵] 請確保您已在 Cloudflare 設定此環境變數
  const API_KEY = context.env.ALPHA_VANTAGE_KEY;
  if (!API_KEY) {
    return new Response(JSON.stringify({ error: 'API Key 未在伺服器上設定' }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    });
  }
  
  const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${API_KEY}`;
  
  try {
    const response = await fetch(url, {
        headers: {
            // ★ [修改] 強化模擬瀏覽器標頭
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.60 Safari/537.36'
        }
    });
    
    const contentType = response.headers.get('content-type') || '';
    
    if (contentType.includes('application/json')) {
        const data = await response.json();
        return new Response(JSON.stringify(data), {
          status: 200, headers: { 'Content-Type': 'application/json' }
        });
    } else {
        // 失敗：回傳的是 HTML (API Key 錯誤或已達上限)
        const errorText = await response.text();
        return new Response(JSON.stringify({ 
            error: '美股 API 錯誤 (Key 錯誤或已達上限)',
            details: errorText.substring(0, 200).replace(/<[^>]+>/g, '') + '...' 
        }), {
          status: response.status, headers: { 'Content-Type': 'application/json' }
        });
    }

  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 502, headers: { 'Content-Type': 'application/json' }
    });
  }
}
