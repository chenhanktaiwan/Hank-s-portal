/*
 * 檔案路徑: /functions/get-news.js (★ 更新版)
 * 強化模擬瀏覽器標頭 (Headers)
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
        // ★ [修改] 強化模擬瀏覽器標頭
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.60 Safari/537.36',
        'Accept': 'application/xml,application/xhtml+xml,text/html;q=0.9,text/plain;q=0.8,image/png,*/*;q=0.5',
        'Accept-Language': 'zh-TW,zh;q=0.9,en-US;q=0.8,en;q=0.7',
        'Referer': 'https://www.google.com/'
      }
    });
    
    if (!response.ok) {
        throw new Error(`RSS 伺服器錯誤: ${response.status} ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('xml') && !contentType.includes('rss') && !contentType.includes('rdf') && !contentType.includes('text/plain')) {
       throw new Error(`無效的 RSS 內容類型: ${contentType}`);
    }

    const feedText = await response.text();

    if (!feedText || feedText.trim().length === 0) {
        throw new Error('抓取的 RSS 內容為空');
    }

    return new Response(feedText, {
      status: 200,
      headers: { 'Content-Type': 'application/xml' },
    });

  } catch (e) {
    return new Response(`代理錯誤: ${e.message}`, { status: 502 });
  }
}
