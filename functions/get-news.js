/*
 * 檔案路徑: /functions/get-news.js (★ 更新版)
 * 再次強化模擬瀏覽器標頭
 */
export async function onRequest(context) {
  const { searchParams } = new URL(context.request.url);
  const feedUrl = searchParams.get('url');
  if (!feedUrl) {
    return new Response('Missing feed URL', { status: 400 });
  }

  try {
    const response = await fetch(feedUrl, {
      headers: {
        // ★ [修改] ★
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/99.0.4844.51 Safari/537.36',
        'Accept': 'application/xml,application/xhtml+xml,text/html;q=0.9,text/plain;q=0.8,image/png,*/*;q=0.5',
        'Referer': 'https://www.google.com/' // 偽裝成從 Google 過來的
      }
    });
    
    if (!response.ok) {
        throw new Error(`Failed to fetch RSS: ${response.status} ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('xml') && !contentType.includes('rss') && !contentType.includes('rdf') && !contentType.includes('text/plain')) {
       throw new Error(`Invalid content type from source: ${contentType}`);
    }

    const feedText = await response.text();

    if (!feedText || feedText.trim().length === 0) {
        throw new Error('Fetched feed is empty');
    }

    return new Response(feedText, {
      status: 200,
      headers: { 'Content-Type': 'application/xml' },
    });

  } catch (e) {
    return new Response(`Proxy Error: ${e.message}`, { status: 502 });
  }
}
