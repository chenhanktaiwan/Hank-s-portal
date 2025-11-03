/*
 * 檔案路徑: /functions/get-tw-stock.js (★ 更新版)
 * 智慧檢查 Content-Type，防止解析 HTML 時崩潰
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

  const random = new Date().getTime();
  const url = `https://mis.twse.com.tw/stock/api/getStockInfo.jsp?ex_ch=tse_${symbol}.tw&json=1&delay=0&t=${random}`;

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36',
        'Accept': 'application/json, text/javascript, */*; q=0.01',
        'Referer': 'https://mis.twse.com.tw/stock/index.jsp'
      }
    });

    if (!response.ok) {
        throw new Error(`TWSE API error: ${response.statusText}`);
    }

    // ★ [關鍵修改] ★
    // 檢查回傳的是否為 JSON
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
        const data = await response.json();
        // 成功：回傳 JSON
        return new Response(JSON.stringify(data), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
    } else {
        // 失敗：回傳的是 HTML (被阻擋或錯誤)
        const errorText = await response.text();
        return new Response(JSON.stringify({ 
            error: 'TWSE API 錯誤 (回傳非 JSON)',
            details: errorText.substring(0, 100).replace(/<[^>]+>/g, '') + '...' 
        }), {
          status: response.status, // 可能是 200，但內容是錯的
          headers: { 'Content-Type': 'application/json' }
        });
    }

  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 502, // Bad Gateway
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
