import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-wealth-session-id',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
};

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=900'
    }
  });
}

function articleSource(article) {
  if (typeof article.source === 'string') return article.source;
  if (article.source && typeof article.source === 'object' && article.source.name) {
    return String(article.source.name);
  }
  return 'Marketaux';
}

function todayStartIso() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString();
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const token = Deno.env.get('MARKETAUX_API_TOKEN');
  if (!token) {
    return jsonResponse({ error: 'Missing MARKETAUX_API_TOKEN Supabase secret.' }, 500);
  }

  try {
    const requestUrl = new URL(req.url);
    const symbols = requestUrl.searchParams.get('symbols') || 'AAPL,MSFT,NVDA,SPY,QQQ,BTC';
    const keywords = requestUrl.searchParams.get('keywords');
    const limit = Math.min(Number(requestUrl.searchParams.get('limit') || 3), 3);
    const forceRefresh = requestUrl.searchParams.get('force_refresh') === 'true';

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabase = supabaseUrl && serviceRoleKey ? createClient(supabaseUrl, serviceRoleKey) : null;

    if (supabase && !forceRefresh) {
      const { data: cachedArticles, error: cacheError } = await supabase
        .from('news_items')
        .select('title, source, url, published_at, summary, topic')
        .gte('created_at', todayStartIso())
        .order('created_at', { ascending: false })
        .limit(limit);

      if (!cacheError && cachedArticles && cachedArticles.length >= limit) {
        return jsonResponse({ articles: cachedArticles, cached: true });
      }
    }

    const marketauxUrl = new URL('https://api.marketaux.com/v1/news/all');
    marketauxUrl.searchParams.set('api_token', token);
    marketauxUrl.searchParams.set('symbols', symbols);
    marketauxUrl.searchParams.set('filter_entities', 'true');
    marketauxUrl.searchParams.set('language', 'en');
    marketauxUrl.searchParams.set('countries', 'us');
    marketauxUrl.searchParams.set('limit', String(limit));
    if (keywords) marketauxUrl.searchParams.set('search', keywords);

    let marketauxResponse = await fetch(marketauxUrl);
    let payload = await marketauxResponse.json();

    if (!marketauxResponse.ok) {
      return jsonResponse({ error: 'Marketaux request failed.', detail: payload }, marketauxResponse.status);
    }

    if (!payload.data || !payload.data.length) {
      const fallbackUrl = new URL('https://api.marketaux.com/v1/news/all');
      fallbackUrl.searchParams.set('api_token', token);
      fallbackUrl.searchParams.set('language', 'en');
      fallbackUrl.searchParams.set('countries', 'us');
      fallbackUrl.searchParams.set('limit', String(limit));

      marketauxResponse = await fetch(fallbackUrl);
      payload = await marketauxResponse.json();

      if (!marketauxResponse.ok) {
        return jsonResponse({ error: 'Marketaux fallback request failed.', detail: payload }, marketauxResponse.status);
      }
    }

    const fetchedAt = new Date().toISOString();
    const articles = (payload.data || [])
      .filter((article) => article.title && article.url)
      .slice(0, limit)
      .map((article) => ({
        title: article.title,
        source: articleSource(article),
        url: article.url,
        published_at: article.published_at ? article.published_at.slice(0, 10) : new Date().toISOString().slice(0, 10),
        summary: article.description || article.snippet || 'Market news update for wealth-building decisions.',
        topic: 'markets',
        created_at: fetchedAt
      }));

    if (supabase && articles.length) {
      await supabase
        .from('news_items')
        .upsert(articles, { onConflict: 'url', ignoreDuplicates: false });
    }

    return jsonResponse({ articles, cached: false });
  } catch (error) {
    return jsonResponse({
      error: 'Unable to fetch Marketaux news.',
      detail: error instanceof Error ? error.message : String(error)
    }, 500);
  }
});
