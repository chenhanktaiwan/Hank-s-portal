/*
 * 檔案路徑: /functions/get-tw-stock.js
 * 這是 Cloudflare Function (後端代理) - 負責台股
 */
export async function onRequest(context) {
  const { searchParams } = new URL(context.request.url);
  const symbol = searchParams.get('symbol');

  if (!symbol) {
    return new Response(JSON.stringify({ error: 'Missing symbol' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // 1. 替前端呼叫真正的台股 API
  // 我們加上一個隨機數 (t=) 來避免快取
  const random = new Date().getTime();
  const url = `https://mis.twse.com.tw/stock/api/getStockInfo.jsp?ex_ch=tse_${symbol}.tw&json=1&delay=0&t=${random}`;

  try {
    const response = await fetch(url, {
      headers: {
        // 模擬瀏覽器請求
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36',
        'Accept': 'application/json, text/javascript, */*; q=0.01',
        'Referer': 'https://mis.twse.com.tw/stock/index.jsp'
      }
    });

    if (!response.ok) {
        throw new Error(`TWSE API error: ${response.statusText}`);
    }

    const data = await response.json();
    
    // 2. 將台股 API 的回應原封不動地傳回給前端
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 502, // Bad Gateway
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
