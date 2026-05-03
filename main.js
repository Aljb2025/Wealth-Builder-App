import './styles.css';
import { isSupabaseConfigured, supabase, getSessionId } from './supabaseClient.js';

const assetClasses = [
  { key: 'real_estate_home', label: 'Home', group: 'Real estate', liquidity: 'low', color: '#2f5d7c' },
  { key: 'real_estate_rental', label: 'Rental', group: 'Real estate', liquidity: 'low', color: '#3f7899' },
  { key: 'real_estate_land', label: 'Land', group: 'Real estate', liquidity: 'low', color: '#6a8ea4' },
  { key: 'stocks', label: 'Stocks', group: 'Markets', liquidity: 'high', color: '#58bfa3' },
  { key: 'gold_silver', label: 'Gold & silver', group: 'Commodities', liquidity: 'medium', color: '#f2b84b' },
  { key: 'crypto', label: 'Crypto', group: 'Digital', liquidity: 'high', color: '#d96c5f' },
  { key: 'treasury_bills', label: 'Treasury bills', group: 'Cash', liquidity: 'high', color: '#7aa6b8' },
  { key: 'mutual_funds', label: 'Mutual funds', group: 'Markets', liquidity: 'high', color: '#4f9d8a' },
  { key: '401k', label: '401k', group: 'Retirement', liquidity: 'low', color: '#7c8fa3' },
  { key: 'cds', label: 'CDs', group: 'Cash', liquidity: 'medium', color: '#e2a93b' },
  { key: 'business', label: 'Personal business', group: 'Ownership', liquidity: 'low', color: '#b85d56' },
  { key: 'art', label: 'Art', group: 'Collectibles', liquidity: 'low', color: '#8d7a6b' }
];

const defaultBudget = {
  name: 'My wealth plan',
  monthly_income: 9200,
  fixed_expenses: 3650,
  variable_expenses: 1600,
  debt_balance: 4200,
  debt_apr: 12.5,
  emergency_current: 18500,
  emergency_monthly_need: 5200,
  emergency_apy: 4.2,
  monthly_contribution: 1900,
  risk_profile: 'balanced',
  timeline_years: 12
};

const defaultAllocations = assetClasses.map((asset, index) => ({
  asset_key: asset.key,
  asset_label: asset.label,
  current_value: [165000, 0, 0, 18500, 7200, 4800, 11000, 26000, 78000, 9000, 15000, 2500][index],
  owed_debt: 0,
  target_percent: [22, 12, 4, 18, 6, 5, 8, 10, 10, 3, 2, 0][index],
  focus_rank: ['stocks', 'treasury_bills', 'mutual_funds'].includes(asset.key)
    ? ['stocks', 'treasury_bills', 'mutual_funds'].indexOf(asset.key) + 1
    : null,
  account_type: asset.key === '401k' ? 'tax-advantaged' : 'taxable',
  liquidity: asset.liquidity,
  notes: ''
}));

const fallbackNews = [
  {
    title: 'Savings rates remain central to emergency fund decisions in 2026',
    source: 'Bankrate',
    url: 'https://www.bankrate.com/banking/savings/savings-money-market-account-rate-forecast/',
    published_at: '2026-02-03',
    summary: 'High-yield savings may still outpace traditional bank savings, but expected rate cuts can reduce future APY.'
  },
  {
    title: 'CDs, high-yield savings, and money market accounts compete for short-term cash',
    source: 'CBS News',
    url: 'https://www.cbsnews.com/news/18000-cd-vs-high-yield-savings-account-money-market-account-earn-most-2026/',
    published_at: '2026-04-27',
    summary: 'Liquid accounts keep flexibility while CDs can lock yield, making liquidity a key emergency-fund tradeoff.'
  },
  {
    title: 'Treasury issuance and bill yields remain a watch item for cash allocations',
    source: 'Wolf Street',
    url: 'https://wolfstreet.com/2026/05/03/the-us-government-sold-723-billion-of-treasury-securities-this-week-inflation-jumped-and-met-t-bill-yields/',
    published_at: '2026-05-03',
    summary: 'Short-term Treasury supply and yield changes matter for investors comparing bills, CDs, and high-yield savings.'
  }
];

const state = {
  budget: structuredClone(defaultBudget),
  allocations: structuredClone(defaultAllocations),
  news: fallbackNews,
  profileId: null,
  status: isSupabaseConfigured ? 'Supabase ready' : 'Local draft mode',
  saving: false,
  visibleAssetKeys: defaultAllocations
    .filter((item) => item.focus_rank)
    .sort((a, b) => a.focus_rank - b.focus_rank)
    .map((item) => item.asset_key)
};

const app = document.querySelector('#app');
let saveTimer;

function money(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
  }).format(Number(value) || 0);
}

function pct(value) {
  return `${Math.round((Number(value) || 0) * 10) / 10}%`;
}

function formatDate(value) {
  if (!value) return '';

  const [year, month, day] = String(value).slice(0, 10).split('-').map(Number);
  return new Intl.DateTimeFormat('en-US', {
    month: 'numeric',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC'
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

function numberValue(value) {
  return Number(value) || 0;
}

function editableValue(value) {
  return value ?? '';
}

function activeAllocations() {
  return state.allocations.filter((item) => state.visibleAssetKeys.includes(item.asset_key));
}

function netAssetValue(item) {
  return Math.max(numberValue(item.current_value) - numberValue(item.owed_debt), 0);
}

function calculatePlan() {
  const activeAssets = activeAllocations();
  const income = numberValue(state.budget.monthly_income);
  const expenses = numberValue(state.budget.fixed_expenses) + numberValue(state.budget.variable_expenses);
  const monthlyFunFund = numberValue(state.budget.emergency_monthly_need);
  const cashflow = income - expenses - monthlyFunFund;
  const monthlyNeed = Math.max(expenses, 1);
  const emergencyCurrent = numberValue(state.budget.emergency_current);
  const emergencyMonths = emergencyCurrent / monthlyNeed;
  const debt = numberValue(state.budget.debt_balance);
  const contribution = Math.max(numberValue(state.budget.monthly_contribution), 0);
  const portfolioTotal = activeAssets.reduce((sum, item) => sum + netAssetValue(item), 0);
  const readiness = {
    cashflow: cashflow > 0,
    debt: debt < 5000,
    emergency: emergencyMonths >= 3
  };
  const investReady = readiness.cashflow && readiness.debt && readiness.emergency;

  const emergencyContribution = Math.min(contribution, Math.max(cashflow, 0));
  const debtContribution = 0;
  const investContribution = Math.max(cashflow - emergencyContribution - debtContribution, 0);

  return {
    income,
    expenses,
    cashflow,
    monthlyFunFund,
    monthlyNeed,
    emergencyMonths,
    debt,
    contribution,
    portfolioTotal,
    readiness,
    investReady,
    emergencyContribution,
    debtContribution,
    investContribution
  };
}

function allocationSegments(total) {
  if (!total) return '';

  let cursor = 0;
  return activeAllocations()
    .filter((item) => netAssetValue(item) > 0)
    .map((item) => {
      const asset = assetClasses.find((entry) => entry.key === item.asset_key);
      const value = netAssetValue(item);
      const span = (value / total) * 100;
      const segment = `${asset?.color || '#7aa6b8'} ${cursor}% ${cursor + span}%`;
      cursor += span;
      return segment;
    })
    .join(', ');
}

function readinessItem(label, passed, detail) {
  return `
    <div class="gate ${passed ? 'passed' : 'blocked'}">
      <span>${passed ? '✓' : '!'}</span>
      <div>
        <strong>${label}</strong>
        <small>${detail}</small>
      </div>
    </div>
  `;
}

function render() {
  const plan = calculatePlan();
  const activeAssets = activeAllocations();
  const focus = state.allocations
    .filter((item) => item.focus_rank)
    .sort((a, b) => a.focus_rank - b.focus_rank);
  const topAssets = [...activeAssets]
    .sort((a, b) => netAssetValue(b) - netAssetValue(a))
    .slice(0, 6);
  const totalTarget = activeAssets.reduce((sum, item) => sum + numberValue(item.target_percent), 0);
  const cashflowPercent = Math.max(0, Math.min(100, (plan.cashflow / Math.max(plan.income, 1)) * 100));
  const emergencyPercent = Math.max(0, Math.min(100, (plan.emergencyMonths / 12) * 100));
  const debtPercent = Math.max(0, Math.min(100, 100 - (plan.debt / Math.max(plan.income * 2, 1)) * 100));

  app.innerHTML = `
    <div class="app-shell">
      <aside class="sidebar">
        <div class="brand">
          <span class="brand-mark">W</span>
          <div>
            <strong>WealthBuilder</strong>
            <small>Command Center</small>
          </div>
        </div>
        <nav>
          <a href="#budget">Budget</a>
          <a href="#readiness">Readiness</a>
          <a href="#assets">Assets</a>
          <a href="#news">Research</a>
        </nav>
      </aside>

      <main>
        <header class="hero">
          <div>
            <h1>Wealth Tracker</h1>
            <p>All-In-One Wealth Building App</p>
          </div>
        </header>

        <section class="metric-grid" aria-label="Plan metrics">
          <article class="metric-card featured">
            <span>Monthly cashflow</span>
            <strong>${money(plan.cashflow)}</strong>
            <div class="bar"><i style="width:${cashflowPercent}%"></i></div>
          </article>
          <article class="metric-card">
            <span>Emergency runway</span>
            <strong>${plan.emergencyMonths.toFixed(1)} months</strong>
            <div class="bar mint"><i style="width:${emergencyPercent}%"></i></div>
          </article>
          <article class="metric-card">
            <span>Debt threshold</span>
            <strong>${money(plan.debt)}</strong>
            <div class="bar coral"><i style="width:${debtPercent}%"></i></div>
          </article>
          <article class="metric-card">
            <span>Portfolio tracked</span>
            <strong>${money(plan.portfolioTotal)}</strong>
            <small>${pct(totalTarget)} target assigned</small>
          </article>
        </section>

        <section class="workbench">
          <form id="budget" class="panel budget-form">
            <div class="section-title">
              <strong>Budget Calculator</strong>
            </div>
            ${field('Plan name', 'name', 'text')}
            ${field('Monthly income', 'monthly_income')}
            ${field('Fixed expenses', 'fixed_expenses')}
            ${field('Variable expenses', 'variable_expenses')}
            ${field('Debt balance', 'debt_balance')}
            ${field('Debt APR', 'debt_apr')}
            ${field('Emergency Fund', 'emergency_current')}
            ${field('Monthly Fun Fund', 'emergency_monthly_need')}
            ${field('Emergency Fund Savings Account APY', 'emergency_apy')}
            ${field('Monthly contribution', 'monthly_contribution')}
            <label>
              <span>Risk profile</span>
              <select name="risk_profile">
                ${['conservative', 'balanced', 'growth'].map((item) => `<option value="${item}" ${state.budget.risk_profile === item ? 'selected' : ''}>${item}</option>`).join('')}
              </select>
            </label>
            ${field('Timeline years', 'timeline_years')}
          </form>

          <section id="readiness" class="panel readiness-panel">
            <div class="section-title">
              <strong>Financial Health</strong>
            </div>
            <div class="gates">
              ${readinessItem('Cashflow positive', plan.readiness.cashflow, `${money(plan.cashflow)} after expenses`)}
              ${readinessItem('Debt under $5,000', plan.readiness.debt, `${money(plan.debt)} current balance`)}
              ${readinessItem('3 months saved', plan.readiness.emergency, `${plan.emergencyMonths.toFixed(1)} months in liquid savings`)}
            </div>
            <div class="split-plan">
              <div>
                <span>Emergency Fund Monthly Allocation</span>
                <strong>${money(plan.emergencyContribution)}</strong>
              </div>
              <div>
                <span>Debt Payoff</span>
                <strong>${money(plan.debtContribution)}</strong>
              </div>
              <div>
                <span>Monthly Investing Amount</span>
                <strong>${money(plan.investContribution)}</strong>
              </div>
            </div>
            <div class="tier-track">
              <span style="left:25%">3 mo</span>
              <span style="left:50%">6 mo</span>
              <span style="left:100%">1 yr</span>
              <i style="width:${emergencyPercent}%"></i>
            </div>
            <p class="note">Emergency contributions automatically step down after 3 and 6 months. At 12 months, new emergency-fund allocation drops to zero.</p>
          </section>
        </section>

        <section id="assets" class="portfolio-grid">
          <article class="panel chart-panel">
            <div class="section-title">
              <strong>Allocation map</strong>
            </div>
            <div class="donut" style="background: conic-gradient(${allocationSegments(plan.portfolioTotal) || '#dbe5eb 0 100%'})">
              <div><strong>${money(plan.portfolioTotal)}</strong><span>Total</span></div>
            </div>
            <div class="legend">
              ${topAssets.map((item) => {
                const asset = assetClasses.find((entry) => entry.key === item.asset_key);
                const percent = plan.portfolioTotal ? (netAssetValue(item) / plan.portfolioTotal) * 100 : 0;
                return `<div><i style="background:${asset?.color || '#7aa6b8'}"></i><span>${item.asset_label}</span><strong>${pct(percent)}</strong></div>`;
              }).join('')}
            </div>
          </article>

          <article class="panel focus-panel">
            <div class="section-title">
              <strong>${plan.investReady ? 'My Top Performing Assets' : 'Locked until ready'}</strong>
            </div>
            <div class="focus-list">
              ${focus.map((item) => `<div><span>${item.focus_rank}</span><strong>${item.asset_label}</strong><small>${money(netAssetValue(item))} net</small></div>`).join('')}
            </div>
          </article>
        </section>

        <section class="panel asset-editor">
          <div class="section-title asset-editor-title">
            <strong>Asset Classes</strong>
          </div>
          <div class="asset-table">
            ${state.visibleAssetKeys.map((assetKey, index) => {
              const rank = index + 1;
              const item = state.allocations.find((allocation) => allocation.asset_key === assetKey) || state.allocations[0];
              const asset = assetClasses.find((entry) => entry.key === item.asset_key);
              return `
                <div class="asset-row">
                  <div class="asset-name">
                    <i style="background:${asset?.color || '#7aa6b8'}"></i>
                    <div><strong>${item.asset_label}</strong><span>${asset?.group || 'Asset'} · ${item.liquidity} liquidity</span></div>
                  </div>
                  <label><span>Asset class</span><select data-focus-slot="${rank}">
                    <option value="__remove__">Remove</option>
                    ${assetClasses.map((option) => `<option value="${option.key}" ${item.asset_key === option.key ? 'selected' : ''}>${option.label}</option>`).join('')}
                  </select></label>
                  <label><span>Value</span><input data-asset="${item.asset_key}" data-field="current_value" type="number" min="0" step="any" inputmode="decimal" value="${editableValue(item.current_value)}"></label>
                  <label><span>Owed Debt</span><input data-asset="${item.asset_key}" data-field="owed_debt" type="number" min="0" step="any" inputmode="decimal" value="${editableValue(item.owed_debt)}"></label>
                  <label><span>Target %</span><input data-asset="${item.asset_key}" data-field="target_percent" type="number" min="0" max="100" step="any" inputmode="decimal" value="${editableValue(item.target_percent)}"></label>
                </div>
              `;
            }).join('')}
          </div>
          <button class="add-asset-btn" type="button" data-action="add-asset">Add</button>
        </section>

        <section id="news" class="panel news-panel">
          <div class="section-title">
            <span class="news-title">Wealth Builder News</span>
          </div>
          <div class="news-list">
            ${state.news.slice(0, 3).map((item) => `
              <a href="${item.url}" rel="noreferrer" title="Read article: ${item.title}">
                <span>${item.source} · ${formatDate(item.published_at)}</span>
                <strong>${item.title}</strong>
                <small>${item.summary}</small>
                <em>Read article</em>
              </a>
            `).join('')}
          </div>
        </section>

        <footer>
          Planning tool only. It does not provide personalized financial, investment, tax, or legal advice.
        </footer>
      </main>
    </div>
  `;

  bindEvents();
}

function field(label, name, type = 'number') {
  return `
    <label>
      <span>${label}</span>
      <input name="${name}" type="${type}" ${type === 'number' ? 'min="0" step="any" inputmode="decimal"' : ''} value="${editableValue(state.budget[name])}">
    </label>
  `;
}

function bindEvents() {
  document.querySelectorAll('#budget input, #budget select').forEach((input) => {
    input.addEventListener('input', (event) => {
      const { name, value, type } = event.target;
      state.budget[name] = value;
      persistLocal();
      scheduleSave();
    });
    input.addEventListener('change', render);
  });

  document.querySelectorAll('[data-focus-slot]').forEach((select) => {
    select.addEventListener('change', (event) => {
      const rank = Number(event.target.dataset.focusSlot);
      const selectedKey = event.target.value;
      const previousKey = state.visibleAssetKeys[rank - 1];
      const existingIndex = state.visibleAssetKeys.indexOf(selectedKey);

      if (selectedKey === '__remove__') {
        const removedAllocation = state.allocations.find((item) => item.asset_key === previousKey);
        if (removedAllocation) {
          removedAllocation.current_value = '';
          removedAllocation.owed_debt = '';
          removedAllocation.target_percent = 0;
          removedAllocation.focus_rank = null;
        }

        state.visibleAssetKeys = state.visibleAssetKeys.filter((_, index) => index !== rank - 1);
        syncVisibleAssets();
        persistLocal();
        scheduleSave();
        render();
        return;
      }

      const selectedAllocation = state.allocations.find((item) => item.asset_key === selectedKey);

      state.allocations.forEach((item) => {
        if (item.focus_rank === rank || item.asset_key === selectedKey) item.focus_rank = null;
      });

      if (rank <= 3) selectedAllocation.focus_rank = rank;

      if (existingIndex >= 0 && existingIndex !== rank - 1) {
        state.visibleAssetKeys[existingIndex] = previousKey;
      }

      state.visibleAssetKeys[rank - 1] = selectedKey;
      syncVisibleAssets();
      persistLocal();
      scheduleSave();
      render();
    });
  });

  document.querySelector('[data-action="add-asset"]')?.addEventListener('click', () => {
    const unusedAsset = state.allocations.find((item) => !state.visibleAssetKeys.includes(item.asset_key));
    if (!unusedAsset) return;

    state.visibleAssetKeys.push(unusedAsset.asset_key);
    syncVisibleAssets();
    persistLocal();
    scheduleSave();
    render();
  });

  document.querySelectorAll('[data-asset]').forEach((input) => {
    input.addEventListener('input', (event) => {
      const { asset, field: assetField } = event.target.dataset;
      const allocation = state.allocations.find((item) => item.asset_key === asset);
      const value = event.target.value;

      if (assetField === 'focus_rank') {
        const rank = value ? Number(value) : null;
        if (rank) {
          state.allocations.forEach((item) => {
            if (item.asset_key !== asset && item.focus_rank === rank) item.focus_rank = null;
          });
        }
        allocation.focus_rank = rank;
      } else {
        allocation[assetField] = value;
      }

      persistLocal();
      scheduleSave();
    });
    input.addEventListener('change', render);
  });
}

function scheduleSave() {
  window.clearTimeout(saveTimer);
  saveTimer = window.setTimeout(savePlan, 700);
}

function syncVisibleAssets() {
  state.visibleAssetKeys = state.visibleAssetKeys.filter((key, index, keys) => (
    key && keys.indexOf(key) === index && state.allocations.some((item) => item.asset_key === key)
  ));

  state.allocations.forEach((item) => {
    const visibleIndex = state.visibleAssetKeys.indexOf(item.asset_key);
    item.focus_rank = visibleIndex >= 0 && visibleIndex < 3 ? visibleIndex + 1 : null;
  });
}

function persistLocal() {
  localStorage.setItem('wealthbuilder-plan', JSON.stringify({
    budget: state.budget,
    allocations: state.allocations,
    profileId: state.profileId,
    visibleAssetKeys: state.visibleAssetKeys
  }));
}

function loadLocal() {
  const saved = localStorage.getItem('wealthbuilder-plan');
  if (!saved) return;

  try {
    const parsed = JSON.parse(saved);
    state.budget = { ...state.budget, ...parsed.budget };
    state.allocations = state.allocations.map((item) => ({
      ...item,
      ...(parsed.allocations || []).find((savedItem) => savedItem.asset_key === item.asset_key)
    }));
    state.profileId = parsed.profileId || null;
    state.visibleAssetKeys = Array.isArray(parsed.visibleAssetKeys)
      ? parsed.visibleAssetKeys
      : state.allocations.filter((item) => item.focus_rank).sort((a, b) => a.focus_rank - b.focus_rank).map((item) => item.asset_key);
    syncVisibleAssets();
  } catch {
    state.status = 'Local draft mode';
  }
}

async function loadSupabaseData() {
  if (!supabase) return;

  const sessionId = getSessionId();
  const { data: profile, error } = await supabase
    .from('wealth_profiles')
    .select('*, asset_allocations(*)')
    .eq('session_id', sessionId)
    .maybeSingle();

  if (error) {
    state.status = 'Supabase needs schema';
    render();
    return;
  }

  if (profile) {
    const localVisibleAssetKeys = [...state.visibleAssetKeys];
    state.profileId = profile.id;
    Object.keys(state.budget).forEach((key) => {
      if (profile[key] !== undefined && profile[key] !== null) state.budget[key] = profile[key];
    });

    state.allocations = state.allocations.map((item) => ({
      ...item,
      ...(profile.asset_allocations || []).find((savedItem) => savedItem.asset_key === item.asset_key)
    }));
    const profileFocusAssetKeys = state.allocations
      .filter((item) => item.focus_rank)
      .sort((a, b) => a.focus_rank - b.focus_rank)
      .map((item) => item.asset_key);
    state.visibleAssetKeys = localVisibleAssetKeys.length ? localVisibleAssetKeys : profileFocusAssetKeys;
    syncVisibleAssets();
    state.status = 'Synced with Supabase';
  }

  const { data: news } = await supabase
    .from('news_items')
    .select('title, source, url, published_at, summary')
    .order('published_at', { ascending: false })
    .limit(3);

  if (news?.length) state.news = news;
  render();
}

async function savePlan() {
  persistLocal();

  if (!supabase) {
    state.status = 'Saved locally';
    render();
    return;
  }

  state.saving = true;
  render();

  const sessionId = getSessionId();
  const payload = {
    session_id: sessionId,
    ...state.budget,
    updated_at: new Date().toISOString()
  };

  const { data: profile, error } = await supabase
    .from('wealth_profiles')
    .upsert(payload, { onConflict: 'session_id' })
    .select('id')
    .single();

  if (error) {
    state.status = 'Supabase save failed';
    state.saving = false;
    render();
    return;
  }

  state.profileId = profile.id;

  const allocationPayload = state.allocations.map((item) => ({
    profile_id: profile.id,
    asset_key: item.asset_key,
    asset_label: item.asset_label,
    current_value: item.current_value,
    owed_debt: item.owed_debt,
    target_percent: item.target_percent,
    focus_rank: item.focus_rank,
    account_type: item.account_type,
    liquidity: item.liquidity,
    notes: item.notes,
    updated_at: new Date().toISOString()
  }));

  let { error: allocationError } = await supabase
    .from('asset_allocations')
    .upsert(allocationPayload, { onConflict: 'profile_id,asset_key' });

  if (allocationError && String(allocationError.message || '').includes('owed_debt')) {
    const fallbackPayload = allocationPayload.map(({ owed_debt: _owedDebt, ...item }) => item);
    const fallbackResult = await supabase
      .from('asset_allocations')
      .upsert(fallbackPayload, { onConflict: 'profile_id,asset_key' });

    allocationError = fallbackResult.error;
    state.status = allocationError ? 'Allocation save failed' : 'Supabase needs owed debt column';
  } else {
    state.status = allocationError ? 'Allocation save failed' : 'Synced with Supabase';
  }

  state.saving = false;
  persistLocal();
  render();
}

loadLocal();
render();
loadSupabaseData();
