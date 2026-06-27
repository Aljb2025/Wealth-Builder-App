import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-wealth-session-id',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
};

type MarketauxArticle = {
  title?: string;
  description?: string;
  snippet?: string;
  url?: string;
  published_at?: string;
  source?: unknown;
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=900'
    }
  });
}

function articleSource(article: MarketauxArticle) {
  if (typeof article.source === 'string') return article.source;
  if (article.source && typeof article.source === 'object' && 'name' in article.source) {
    return String((article.source as { name?: string }).name || 'Marketaux');
  }
  return 'Marketaux';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const token = Deno.env.get('MARKETAUX_API_TOKEN');
  if (!token) {
    return jsonResponse({ error: 'Missing MARKETAUX_API_TOKEN Supabase secret.' }, 500);
  }

  const requestUrl = new URL(req.url);
  const symbols = requestUrl.searchParams.get('symbols') || 'SPY,QQQ,DIA,GLD,BTC';
  const keywords = requestUrl.searchParams.get('keywords') || 'stocks,markets,personal finance,treasury bills,high yield savings';
  const limit = Math.min(Number(requestUrl.searchParams.get('limit') || 3), 3);

  const marketauxUrl = new URL('https://api.marketaux.com/v1/news/all');
  marketauxUrl.searchParams.set('api_token', token);
  marketauxUrl.searchParams.set('symbols', symbols);
  marketauxUrl.searchParams.set('filter_entities', 'true');
  marketauxUrl.searchParams.set('language', 'en');
  marketauxUrl.searchParams.set('limit', String(limit));
  marketauxUrl.searchParams.set('search', keywords);

  try {
    const marketauxResponse = await fetch(marketauxUrl);
    const payload = await marketauxResponse.json();

    if (!marketauxResponse.ok) {
      return jsonResponse({ error: 'Marketaux request failed.', detail: payload }, marketauxResponse.status);
    }

    const articles = (payload.data || [])
      .filter((article: MarketauxArticle) => article.title && article.url)
      .slice(0, limit)
      .map((article: MarketauxArticle) => ({
        title: article.title,
        source: articleSource(article),
        url: article.url,
        published_at: article.published_at ? article.published_at.slice(0, 10) : new Date().toISOString().slice(0, 10),
        summary: article.description || article.snippet || 'Market news update for wealth-building decisions.',
        topic: 'markets'
      }));

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (supabaseUrl && serviceRoleKey && articles.length) {
      const supabase = createClient(supabaseUrl, serviceRoleKey);
      await supabase
        .from('news_items')
        .upsert(articles, { onConflict: 'url', ignoreDuplicates: false });
    }

    return jsonResponse({ articles });
  } catch (error) {
    return jsonResponse({
      error: 'Unable to fetch Marketaux news.',
      detail: error instanceof Error ? error.message : String(error)
    }, 500);
  }
});
