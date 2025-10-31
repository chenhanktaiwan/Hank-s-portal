/*
 * 檔案路徑: /functions/get-news.js (★ v3 更新版)
 * 模擬瀏覽器 User-Agent 來嘗試繞過 RSS 伺服器阻擋
 */
export async function onRequest(context) {
  const { searchParams } = new URL(context.request.url);
  const feedUrl = searchParams.get('url');
  if (!feedUrl) {
    return new Response('Missing feed URL', { status: 400 });
  }

  try {
    // [新功能] 模擬成 Windows 上的 Chrome 瀏覽器
    const response = await fetch(feedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/99.0.4844.51 Safari/537.36'
      }
    });
    
    if (!response.ok) {
        throw new Error(`Failed to fetch RSS: ${response.status} ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type') || '';
    // [修改] 允許 text/plain (某些 RSS 來源設定不正確)
    if (!contentType.includes('xml') && !contentType.includes('rss') && !contentType.includes('rdf') && !contentType.includes('text/plain')) {
       throw new Error(`Invalid content type from source: ${contentType}`);
    }

    const feedText = await response.text();

    if (!feedText || feedText.trim().length === 0) {
        throw new Error('Fetched feed is empty');
    }

    return new Response(feedText, {
      status: 200,
      headers: { 'Content-Type': 'application/xml' }, // 統一回傳 XML
    });

  } catch (e) {
    return new Response(`Proxy Error: ${e.message}`, { status: 502 });
  }
}
