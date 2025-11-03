/*
 * 檔案路徑: /functions/get-tw-stock.js (★ 更新版)
 * 強化標頭 (Headers) 並智慧檢查 Content-Type
 */
export async function onRequest(context) {
  const { searchParams } = new URL(context.request.url);
  const symbol = searchParams.get('symbol');

  if (!symbol) {
    return new Response(JSON.stringify({ error: 'Missing symbol' }), {
      status: 400, headers: { 'Content-Type': 'application/json' },
    });
  }

  const random = new Date().getTime();
  const url = `https://mis.twse.com.tw/stock/api/getStockInfo.jsp?ex_ch=tse_${symbol}.tw&json=1&delay=0&t=${random}`;

  try {
    const response = await fetch(url, {
      headers: {
        // ★ [修改] 強化模擬瀏覽器標頭
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.60 Safari/537.36',
        'Accept': 'application/json, text/javascript, */*; q=0.01',
        'Accept-Language': 'zh-TW,zh;q=0.9,en-US;q=0.8,en;q=0.7',
        'Referer': 'https://mis.twse.com.tw/stock/index.jsp',
        'X-Requested-With': 'XMLHttpRequest'
      }
    });

    if (!response.ok) {
        throw new Error(`TWSE API 伺服器錯誤: ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
        const data = await response.json();
        return new Response(JSON.stringify(data), {
          status: 200, headers: { 'Content-Type': 'application/json' },
        });
    } else {
        // 失敗：回傳的是 HTML (被阻擋)
        const errorText = await response.text();
        return new Response(JSON.stringify({ 
            error: '台股 API 錯誤 (回傳非 JSON)',
            details: errorText.substring(0, 100).replace(/<[^>]+>/g, '') + '...' 
        }), {
          status: 200, headers: { 'Content-Type': 'application/json' }
        });
    }

  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 502, headers: { 'Content-Type': 'application/json' },
    });
  }
}
