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
  saving: false
};

const app = document.querySelector('#app');

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

function numberValue(value) {
  return Number(value) || 0;
}

function calculatePlan() {
  const income = numberValue(state.budget.monthly_income);
  const expenses = numberValue(state.budget.fixed_expenses) + numberValue(state.budget.variable_expenses);
  const cashflow = income - expenses;
  const monthlyNeed = numberValue(state.budget.emergency_monthly_need) || Math.max(expenses, 1);
  const emergencyCurrent = numberValue(state.budget.emergency_current);
  const emergencyMonths = emergencyCurrent / monthlyNeed;
  const debt = numberValue(state.budget.debt_balance);
  const contribution = Math.max(numberValue(state.budget.monthly_contribution), 0);
  const portfolioTotal = state.allocations.reduce((sum, item) => sum + numberValue(item.current_value), 0);
  const readiness = {
    cashflow: cashflow > 0,
    debt: debt < 5000,
    emergency: emergencyMonths >= 3
  };
  const investReady = readiness.cashflow && readiness.debt && readiness.emergency;

  let emergencyRate = 0;
  if (emergencyMonths < 3) emergencyRate = 0.55;
  else if (emergencyMonths < 6) emergencyRate = 0.35;
  else if (emergencyMonths < 12) emergencyRate = 0.15;

  const debtRate = debt >= 5000 ? 0.35 : debt > 0 ? 0.15 : 0;
  const investRate = Math.max(0, 1 - emergencyRate - debtRate);

  return {
    income,
    expenses,
    cashflow,
    monthlyNeed,
    emergencyMonths,
    debt,
    contribution,
    portfolioTotal,
    readiness,
    investReady,
    emergencyContribution: contribution * emergencyRate,
    debtContribution: contribution * debtRate,
    investContribution: contribution * investRate
  };
}

function allocationSegments(total) {
  if (!total) return '';

  let cursor = 0;
  return state.allocations
    .filter((item) => numberValue(item.current_value) > 0)
    .map((item) => {
      const asset = assetClasses.find((entry) => entry.key === item.asset_key);
      const value = numberValue(item.current_value);
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
  const focus = state.allocations
    .filter((item) => item.focus_rank)
    .sort((a, b) => a.focus_rank - b.focus_rank);
  const topAssets = [...state.allocations]
    .sort((a, b) => numberValue(b.current_value) - numberValue(a.current_value))
    .slice(0, 6);
  const totalTarget = state.allocations.reduce((sum, item) => sum + numberValue(item.target_percent), 0);
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
        <div class="sync-card">
          <small>Storage</small>
          <strong>${state.status}</strong>
          <span>${isSupabaseConfigured ? 'Connected using Vite env vars' : 'Add Supabase env vars to sync'}</span>
        </div>
      </aside>

      <main>
        <header class="hero">
          <div>
            <h1>Wealth Building Tracker</h1>
            <p>Budget, debt payoff, emergency savings, and asset focus.</p>
          </div>
          <div class="hero-actions">
            <button class="secondary" data-action="reset">Reset</button>
            <button class="primary" data-action="save">${state.saving ? 'Saving...' : 'Save plan'}</button>
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
              <span>Budget inputs</span>
              <strong>Readiness calculator</strong>
            </div>
            ${field('Plan name', 'name', 'text')}
            ${field('Monthly income', 'monthly_income')}
            ${field('Fixed expenses', 'fixed_expenses')}
            ${field('Variable expenses', 'variable_expenses')}
            ${field('Debt balance', 'debt_balance')}
            ${field('Debt APR', 'debt_apr')}
            ${field('Emergency saved', 'emergency_current')}
            ${field('Monthly emergency need', 'emergency_monthly_need')}
            ${field('HYSA APY', 'emergency_apy')}
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
              <span>Readiness gates</span>
              <strong>${plan.investReady ? 'Asset focus unlocked' : 'Build the base first'}</strong>
            </div>
            <div class="gates">
              ${readinessItem('Cashflow positive', plan.readiness.cashflow, `${money(plan.cashflow)} after expenses`)}
              ${readinessItem('Debt under $5,000', plan.readiness.debt, `${money(plan.debt)} current balance`)}
              ${readinessItem('3 months saved', plan.readiness.emergency, `${plan.emergencyMonths.toFixed(1)} months in liquid savings`)}
            </div>
            <div class="split-plan">
              <div>
                <span>Emergency fund</span>
                <strong>${money(plan.emergencyContribution)}</strong>
              </div>
              <div>
                <span>Debt payoff</span>
                <strong>${money(plan.debtContribution)}</strong>
              </div>
              <div>
                <span>Investing</span>
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
              <span>Portfolio</span>
              <strong>Allocation map</strong>
            </div>
            <div class="donut" style="background: conic-gradient(${allocationSegments(plan.portfolioTotal) || '#dbe5eb 0 100%'})">
              <div><strong>${money(plan.portfolioTotal)}</strong><span>Total</span></div>
            </div>
            <div class="legend">
              ${topAssets.map((item) => {
                const asset = assetClasses.find((entry) => entry.key === item.asset_key);
                const percent = plan.portfolioTotal ? (numberValue(item.current_value) / plan.portfolioTotal) * 100 : 0;
                return `<div><i style="background:${asset?.color || '#7aa6b8'}"></i><span>${item.asset_label}</span><strong>${pct(percent)}</strong></div>`;
              }).join('')}
            </div>
          </article>

          <article class="panel focus-panel">
            <div class="section-title">
              <span>Top 3 focus</span>
              <strong>${plan.investReady ? 'Choose priorities' : 'Locked until ready'}</strong>
            </div>
            <div class="focus-list">
              ${focus.map((item) => `<div><span>${item.focus_rank}</span><strong>${item.asset_label}</strong><small>${money(item.current_value)} current</small></div>`).join('')}
            </div>
            <p class="note">${plan.investReady ? 'Focus selections guide new investing dollars after readiness checks pass.' : 'You can still model assets, but the app routes more dollars to savings and debt first.'}</p>
          </article>
        </section>

        <section class="panel asset-editor">
          <div class="section-title">
            <span>Asset classes</span>
            <strong>Values, targets, and focus ranks</strong>
          </div>
          <div class="asset-table">
            ${state.allocations.map((item) => {
              const asset = assetClasses.find((entry) => entry.key === item.asset_key);
              return `
                <div class="asset-row">
                  <div class="asset-name">
                    <i style="background:${asset?.color || '#7aa6b8'}"></i>
                    <div><strong>${item.asset_label}</strong><span>${asset?.group || 'Asset'} · ${item.liquidity} liquidity</span></div>
                  </div>
                  <label><span>Value</span><input data-asset="${item.asset_key}" data-field="current_value" type="number" min="0" value="${item.current_value}"></label>
                  <label><span>Target %</span><input data-asset="${item.asset_key}" data-field="target_percent" type="number" min="0" max="100" value="${item.target_percent}"></label>
                  <label><span>Focus</span><select data-asset="${item.asset_key}" data-field="focus_rank">
                    <option value="">None</option>
                    <option value="1" ${item.focus_rank === 1 ? 'selected' : ''}>1</option>
                    <option value="2" ${item.focus_rank === 2 ? 'selected' : ''}>2</option>
                    <option value="3" ${item.focus_rank === 3 ? 'selected' : ''}>3</option>
                  </select></label>
                </div>
              `;
            }).join('')}
          </div>
        </section>

        <section id="news" class="panel news-panel">
          <div class="section-title">
            <span>Latest research</span>
          </div>
          <div class="news-list">
            ${state.news.slice(0, 3).map((item) => `
              <a href="${item.url}" target="_blank" rel="noreferrer">
                <span>${item.source} · ${new Date(item.published_at).toLocaleDateString()}</span>
                <strong>${item.title}</strong>
                <small>${item.summary}</small>
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
      <input name="${name}" type="${type}" ${type === 'number' ? 'min="0" step="100"' : ''} value="${state.budget[name]}">
    </label>
  `;
}

function bindEvents() {
  document.querySelectorAll('#budget input, #budget select').forEach((input) => {
    input.addEventListener('input', (event) => {
      const { name, value, type } = event.target;
      state.budget[name] = type === 'number' ? numberValue(value) : value;
      persistLocal();
      render();
    });
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
        allocation[assetField] = numberValue(value);
      }

      persistLocal();
      render();
    });
  });

  document.querySelector('[data-action="reset"]').addEventListener('click', () => {
    state.budget = structuredClone(defaultBudget);
    state.allocations = structuredClone(defaultAllocations);
    persistLocal();
    render();
  });

  document.querySelector('[data-action="save"]').addEventListener('click', savePlan);
}

function persistLocal() {
  localStorage.setItem('wealthbuilder-plan', JSON.stringify({
    budget: state.budget,
    allocations: state.allocations,
    profileId: state.profileId
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
    state.profileId = profile.id;
    Object.keys(state.budget).forEach((key) => {
      if (profile[key] !== undefined && profile[key] !== null) state.budget[key] = profile[key];
    });

    state.allocations = state.allocations.map((item) => ({
      ...item,
      ...(profile.asset_allocations || []).find((savedItem) => savedItem.asset_key === item.asset_key)
    }));
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
    target_percent: item.target_percent,
    focus_rank: item.focus_rank,
    account_type: item.account_type,
    liquidity: item.liquidity,
    notes: item.notes,
    updated_at: new Date().toISOString()
  }));

  const { error: allocationError } = await supabase
    .from('asset_allocations')
    .upsert(allocationPayload, { onConflict: 'profile_id,asset_key' });

  state.status = allocationError ? 'Allocation save failed' : 'Synced with Supabase';
  state.saving = false;
  persistLocal();
  render();
}

loadLocal();
render();
loadSupabaseData();
