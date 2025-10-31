
/*
 * 檔案路徑: /functions/get-news.js
 * 這是 Cloudflare Function (後端代理) - 負責 RSS 新聞
 */
export async function onRequest(context) {
  const { searchParams } = new URL(context.request.url);
  const feedUrl = searchParams.get('url'); // 取得要抓取的 RSS 網址

  if (!feedUrl) {
    return new Response('Missing feed URL', { status: 400 });
  }

  try {
    // 1. 替前端去呼叫 RSS 網址
    const response = await fetch(feedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36'
      }
    });
    
    if (!response.ok) {
        throw new Error(`Failed to fetch RSS: ${response.statusText}`);
    }

    const feedText = await response.text();
    
    // 2. 將 RSS (XML/Text) 內容傳回給前端
    return new Response(feedText, {
      status: 200,
      headers: { 'Content-Type': 'application/xml' }, // 回傳為 XML 格式
    });

  } catch (e) {
    return new Response(`Failed to proxy RSS: ${e.message}`, { status: 502 });
  }
}
