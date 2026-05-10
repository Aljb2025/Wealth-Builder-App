import './styles.css';
import { isSupabaseConfigured, supabase, getSessionId } from './supabaseClient.js';

const assetClasses = [
  { key: 'real_estate_home', label: 'Home', group: 'Real estate', liquidity: 'low', color: '#1E88E5' },
  { key: 'real_estate_rental', label: 'Rental', group: 'Real estate', liquidity: 'low', color: '#4CAF50' },
  { key: 'real_estate_land', label: 'Land', group: 'Real estate', liquidity: 'low', color: '#FB8C00' },
  { key: 'stocks', label: 'Stocks', group: 'Markets', liquidity: 'high', color: '#4CAF50' },
  { key: 'gold_silver', label: 'Gold & silver', group: 'Commodities', liquidity: 'medium', color: '#FFC107' },
  { key: 'crypto', label: 'Crypto', group: 'Digital', liquidity: 'high', color: '#F53935' },
  { key: 'treasury_bills', label: 'Treasury bills', group: 'Cash', liquidity: 'high', color: '#1E88E5' },
  { key: 'mutual_funds', label: 'Mutual funds', group: 'Markets', liquidity: 'high', color: '#4CAF50' },
  { key: '401k', label: '401k', group: 'Retirement', liquidity: 'low', color: '#1565C0' },
  { key: 'cds', label: 'CDs', group: 'Cash', liquidity: 'medium', color: '#FFC107' },
  { key: 'business', label: 'Personal business', group: 'Ownership', liquidity: 'low', color: '#FB8C00' },
  { key: 'art', label: 'Art', group: 'Collectibles', liquidity: 'low', color: '#D87000' }
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

const defaultCashflowInputs = {
  income: [
    { key: 'primary_income', label: 'Primary income', amount: 9200 },
    { key: 'side_income', label: 'Side income', amount: 0 },
    { key: 'other_income', label: 'Other income', amount: 0 }
  ],
  fixed: [
    { key: 'housing', label: 'Housing', amount: 2600 },
    { key: 'utilities', label: 'Utilities', amount: 450 },
    { key: 'insurance', label: 'Insurance', amount: 600 }
  ],
  variable: [
    { key: 'food', label: 'Food', amount: 700 },
    { key: 'transportation', label: 'Transportation', amount: 400 },
    { key: 'lifestyle', label: 'Lifestyle', amount: 500 }
  ]
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
    title: 'Data, Iran, US-China meeting in focus for scorching US stock market',
    source: 'Reuters',
    url: 'https://www.investing.com/news/economy-news/data-iran-uschina-meeting-in-focus-for-scorching-us-stock-market-4674806',
    published_at: '2026-05-10',
    summary: 'Markets are watching inflation data, geopolitical risk, and U.S.-China talks after a strong equity rebound.'
  },
  {
    title: 'S&P 500 is at new highs, but BofA warns CTA buying is losing momentum',
    source: 'Investing.com',
    url: 'https://www.investing.com/news/stock-market-news/sp-500-is-at-new-highs-but-bofa-warns-cta-buying-is-losing-momentum-4674661',
    published_at: '2026-05-09',
    summary: 'The stock market is near record levels, but trend-following demand may be slowing after the rally.'
  },
  {
    title: 'Best CD rates of May 2026',
    source: 'Bankrate',
    url: 'https://www.bankrate.com/banking/cds/cd-rates/',
    published_at: '2026-05-09',
    summary: 'CD rates remain a short-term cash option to compare against high-yield savings and emergency liquidity needs.'
  },
  {
    title: 'Gold heads for weekly advance as markets monitor Iran tensions and U.S. jobs data',
    source: 'Yahoo Finance',
    url: 'https://finance.yahoo.com/markets/commodities/articles/gold-heads-weekly-advance-markets-091934626.html',
    published_at: '2026-05-08',
    summary: 'Gold remained in focus as investors weighed geopolitical tension, jobs data, and safe-haven demand.'
  }
];

const state = {
  budget: structuredClone(defaultBudget),
  allocations: structuredClone(defaultAllocations),
  news: fallbackNews,
  cashflowInputs: structuredClone(defaultCashflowInputs),
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
let quickEntry = null;
let assetEntry = null;
let mobileNavOpen = false;
let mobileLogoHidden = false;
let themeMode = localStorage.getItem('wealth-builder-theme') || 'light';

function applyTheme() {
  document.documentElement.dataset.theme = themeMode;
}

applyTheme();

function overlayPositionStyle(anchor) {
  if (!anchor) return '';

  return ` style="--overlay-top:${Math.round(anchor.top)}px; --overlay-left:${Math.round(anchor.left)}px;"`;
}

function overlayAnchorFromElement(element) {
  const rect = element.getBoundingClientRect();
  const panelWidth = Math.min(360, Math.max(0, window.innerWidth - 32));
  const left = Math.min(Math.max(rect.left, 16), Math.max(16, window.innerWidth - panelWidth - 16));
  const top = Math.min(Math.max(rect.bottom + 8, 84), Math.max(84, window.innerHeight - 440));
  return { top, left };
}

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

function makeCashflowKey(type) {
  return `${type}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function totalCashflowItems(group) {
  return group.reduce((sum, item) => sum + numberValue(item.amount), 0);
}

function updateBudgetFromCashflowInputs() {
  state.budget.monthly_income = totalCashflowItems(state.cashflowInputs.income);
  state.budget.fixed_expenses = totalCashflowItems(state.cashflowInputs.fixed);
  state.budget.variable_expenses = totalCashflowItems(state.cashflowInputs.variable);
}

function ensureCashflowInputs() {
  if (state.cashflowInputs?.income?.length && state.cashflowInputs?.fixed?.length && state.cashflowInputs?.variable?.length) return;

  state.cashflowInputs = cashflowInputsFromBudget(state.budget);
}

function normalizeCashflowInputs(inputs) {
  return {
    income: (inputs?.income?.length ? inputs.income : defaultCashflowInputs.income).map((item, index) => ({
      key: item.key || `income_${index}`,
      label: item.label || `Income ${index + 1}`,
      amount: editableValue(item.amount)
    })),
    fixed: (inputs?.fixed?.length ? inputs.fixed : defaultCashflowInputs.fixed).map((item, index) => ({
      key: item.key || `fixed_${index}`,
      label: item.label || `Fixed expense ${index + 1}`,
      amount: editableValue(item.amount)
    })),
    variable: (inputs?.variable?.length ? inputs.variable : defaultCashflowInputs.variable).map((item, index) => ({
      key: item.key || `variable_${index}`,
      label: item.label || `Variable expense ${index + 1}`,
      amount: editableValue(item.amount)
    }))
  };
}

function cashflowInputsFromBudget(budget) {
  const inputs = structuredClone(defaultCashflowInputs);
  inputs.income[0].amount = budget.monthly_income;
  inputs.income[1].amount = 0;
  inputs.income[2].amount = 0;
  inputs.fixed[0].amount = budget.fixed_expenses;
  inputs.fixed[1].amount = 0;
  inputs.fixed[2].amount = 0;
  inputs.variable[0].amount = budget.variable_expenses;
  inputs.variable[1].amount = 0;
  inputs.variable[2].amount = 0;
  return inputs;
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
      const segment = `${asset?.color || '#1E88E5'} ${cursor}% ${cursor + span}%`;
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

function nextBestMove(plan) {
  if (!plan.readiness.cashflow) {
    return {
      title: 'Increase monthly cashflow',
      detail: 'Reduce expenses or add income until money is left after expenses and fun fund.',
      metric: money(Math.abs(plan.cashflow)),
      label: 'gap to cover'
    };
  }

  if (!plan.readiness.debt) {
    return {
      title: 'Pay debt below $5,000',
      detail: 'Route extra cash toward debt first so future dollars can move into savings and investments faster.',
      metric: money(Math.max(plan.debt - 5000, 0)),
      label: 'above threshold'
    };
  }

  if (!plan.readiness.emergency) {
    const target = plan.monthlyNeed * 3;
    return {
      title: 'Build the 3-month emergency fund',
      detail: 'Keep cash liquid while building the base emergency fund before prioritizing new investing dollars.',
      metric: money(Math.max(target - numberValue(state.budget.emergency_current), 0)),
      label: 'needed for 3 months'
    };
  }

  return {
    title: 'Invest toward your selected assets',
    detail: 'The core readiness checks are passing, so new dollars can focus on the asset classes you picked.',
    metric: money(plan.investContribution),
    label: 'monthly investing'
  };
}

function cashflowItems(type) {
  if (type === 'income') return state.cashflowInputs.income.map((item) => ({ ...item, type: 'income' }));

  return [
    ...state.cashflowInputs.fixed.map((item) => ({ ...item, type: 'fixed' })),
    ...state.cashflowInputs.variable.map((item) => ({ ...item, type: 'variable' }))
  ];
}

function cashflowSummaryGroup(title, type, items, total) {
  const singularTitle = type === 'income' ? 'Income' : 'Expense';
  return `
    <div class="cashflow-summary-group">
      <div class="cashflow-summary-head">
        <div>
          <h3>${title}</h3>
          <strong>${money(total)}</strong>
        </div>
        <button class="cashflow-add-btn" type="button" data-action="open-quick-entry" data-entry-type="${type}">
          Add ${singularTitle}
        </button>
      </div>
      <div class="cashflow-list">
        ${items.length ? items.map((item) => `
          <button class="cashflow-list-item" type="button" data-action="open-quick-entry" data-entry-type="${type}" data-source-type="${item.type}" data-key="${item.key}">
            <span>${item.label || 'Unnamed item'}</span>
            <strong>${money(item.amount)}</strong>
          </button>
        `).join('') : `<p class="empty-note">No ${title.toLowerCase()} entered yet.</p>`}
      </div>
    </div>
  `;
}

function getDailyNewsItems(items) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const twoDaysAgo = new Date(today);
  twoDaysAgo.setDate(today.getDate() - 2);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const recentItems = items.filter((item) => {
    const published = new Date(`${item.published_at}T00:00:00`);
    return published >= twoDaysAgo && published < tomorrow;
  });
  const pool = recentItems.length >= 3
    ? recentItems
    : [...items].sort((a, b) => new Date(b.published_at) - new Date(a.published_at));

  if (pool.length <= 3) return pool.slice(0, 3);

  const dayIndex = Math.floor(Date.now() / 86400000) % pool.length;
  return [0, 1, 2].map((offset) => pool[(dayIndex + offset) % pool.length]);
}

function mergeNewsItems(primary, fallback) {
  const seen = new Set();
  return [...primary, ...fallback].filter((item) => {
    if (!item?.url || seen.has(item.url)) return false;
    seen.add(item.url);
    return true;
  });
}

function quickEntryOverlay() {
  if (!quickEntry) return '';

  const isIncome = quickEntry.entryType === 'income';
  const items = cashflowItems(quickEntry.entryType);
  const selected = items.find((item) => item.key === quickEntry.key && item.type === quickEntry.sourceType);
  const title = `${selected ? 'Edit' : 'Add'} ${isIncome ? 'Income' : 'Expense'}`;

  return `
    <div class="quick-entry-layer" data-action="close-quick-entry">
      <section class="quick-entry-panel" role="dialog" aria-modal="false" aria-label="${title}"${overlayPositionStyle(quickEntry.anchor)}>
        <div class="quick-entry-title">
          <strong>${title}</strong>
          <button type="button" data-action="close-quick-entry" aria-label="Close quick entry">Close</button>
        </div>
        <label>
          <span>Name</span>
          <input data-quick-name type="text" value="${editableValue(selected?.label)}" placeholder="${isIncome ? 'Income name' : 'Expense name'}">
        </label>
        <label>
          <span>Amount</span>
          <input data-quick-amount type="number" min="0" step="any" inputmode="decimal" value="${editableValue(selected?.amount)}" placeholder="Amount">
        </label>
        <div class="quick-entry-actions">
          <button class="cashflow-add-btn" type="button" data-action="save-quick-entry">Add</button>
          <button class="expense-remove-btn" type="button" data-action="remove-quick-entry" ${selected ? '' : 'disabled'}>Remove</button>
        </div>
      </section>
    </div>
  `;
}

function assetEntryOverlay() {
  if (!assetEntry) return '';

  const selectedKey = assetEntry.assetKey || state.allocations.find((item) => !state.visibleAssetKeys.includes(item.asset_key))?.asset_key || assetClasses[0].key;
  const item = state.allocations.find((allocation) => allocation.asset_key === selectedKey) || state.allocations[0];
  const isExisting = Boolean(assetEntry.assetKey);

  return `
    <div class="quick-entry-layer" data-action="close-asset-entry">
      <section class="quick-entry-panel asset-entry-panel" role="dialog" aria-modal="false" aria-label="${isExisting ? 'Edit Asset' : 'Add Asset'}"${overlayPositionStyle(assetEntry.anchor)}>
        <div class="quick-entry-title">
          <strong>${isExisting ? 'Edit Asset' : 'Add Asset'}</strong>
          <button type="button" data-action="close-asset-entry" aria-label="Close asset entry">Close</button>
        </div>
        <label>
          <span>Asset class</span>
          <select data-asset-entry-field="asset_key">
            ${assetClasses.map((asset) => `<option value="${asset.key}" ${selectedKey === asset.key ? 'selected' : ''}>${asset.label}</option>`).join('')}
          </select>
        </label>
        <label>
          <span>Value</span>
          <input data-asset-entry-field="current_value" type="number" min="0" step="any" inputmode="decimal" value="${editableValue(item.current_value)}">
        </label>
        <label>
          <span>Owed Debt</span>
          <input data-asset-entry-field="owed_debt" type="number" min="0" step="any" inputmode="decimal" value="${editableValue(item.owed_debt)}">
        </label>
        <label>
          <span>Target %</span>
          <input data-asset-entry-field="target_percent" type="number" min="0" max="100" step="any" inputmode="decimal" value="${editableValue(item.target_percent)}">
        </label>
        <div class="quick-entry-actions">
          <button class="cashflow-add-btn" type="button" data-action="save-asset-entry">Add</button>
          <button class="expense-remove-btn" type="button" data-action="remove-asset-entry" ${isExisting ? '' : 'disabled'}>Remove</button>
        </div>
      </section>
    </div>
  `;
}

function render() {
  ensureCashflowInputs();
  updateBudgetFromCashflowInputs();
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
  const dailyNews = getDailyNewsItems(state.news);
  const move = nextBestMove(plan);
  const debtSnapshotPayment = Math.max(plan.debtContribution || Math.min(Math.max(plan.cashflow, 0), plan.debt), 0);
  const debtSnapshotMonths = debtSnapshotPayment > 0 && plan.debt > 0 ? Math.ceil(plan.debt / debtSnapshotPayment) : 0;
  const incomeItems = cashflowItems('income');
  const expenseItems = cashflowItems('expense');
  const insightAsset = focus[0] || topAssets[0];
  const insightClass = insightAsset ? assetClasses.find((asset) => asset.key === insightAsset.asset_key) : null;
  const insightPercent = insightAsset && plan.portfolioTotal ? (netAssetValue(insightAsset) / plan.portfolioTotal) * 100 : 0;
  const savingsGap = Math.max((plan.expenses * 3) - numberValue(state.budget.emergency_current), 0);
  const debtTip = plan.debt > 0
    ? `Use the avalanche method first: send extra payoff dollars to the highest APR balance while keeping minimums current.`
    : `Debt is clear. Keep avoiding new high-interest balances so more monthly cash can move into savings and assets.`;
  const researchTakeaway = plan.readiness.emergency && plan.readiness.debt
    ? `Your base is in good shape. Keep emergency cash liquid, then route new investing dollars toward ${insightAsset?.asset_label || 'your highest-priority assets'}.`
    : plan.readiness.emergency
      ? `Emergency savings are above the 3-month mark, so the next research priority is debt payoff and cash-flow protection.`
      : `Your research priority should stay on liquid savings options until the 3-month emergency fund is fully covered.`;
  const marketWatchlist = [
    { label: 'HYSA', value: `${pct(state.budget.emergency_apy)} APY`, tone: 'up' },
    { label: 'Treasury Bills', value: 'cash option', tone: 'watch' },
    { label: 'S&P 500', value: 'core market', tone: 'up' },
    { label: 'Bitcoin', value: 'high volatility', tone: 'down' },
    { label: 'Gold', value: 'portfolio hedge', tone: 'watch' },
    { label: 'CD Ladder', value: 'rate lock', tone: 'up' },
    { label: 'Real Estate', value: 'low liquidity', tone: 'watch' },
    { label: 'Debt APR', value: pct(state.budget.debt_apr), tone: plan.debt > 0 ? 'down' : 'up' },
  ];
  const marketTickerItems = [...marketWatchlist, ...marketWatchlist].map((item) => `
    <span class="watchlist-pill ${item.tone}">
      <strong>${item.label}</strong>
      <small>${item.value}</small>
    </span>
  `).join('');
  const mobileNavIcon = mobileNavOpen
    ? (themeMode === 'dark' ? '/assets/hamburger_nav_x_dark.png' : '/assets/hamburger_nav_x.png')
    : (themeMode === 'dark' ? '/assets/hamburger_nav_dark.png' : '/assets/hamburger_nav.png');

  app.innerHTML = `
    <div class="app-shell">
      <aside class="sidebar ${mobileNavOpen ? 'nav-open' : ''} ${mobileLogoHidden ? 'logo-hidden' : ''}">
        <div class="brand">
          <a class="brand-mark" href="#" aria-label="Back to top">
            <img src="/assets/dollar_sign_crown_logo.png" alt="Wealth Tracker logo">
          </a>
        </div>
        <button class="mobile-nav-toggle" type="button" data-action="toggle-mobile-nav" aria-label="Open navigation" aria-expanded="${mobileNavOpen}">
          <img src="${mobileNavIcon}" alt="">
        </button>
        <nav>
          <a href="#">Budget</a>
          <a href="#readiness-section">Readiness</a>
          <a href="#assets">Assets</a>
          <a href="#news">Research</a>
          <button class="theme-toggle" type="button" data-action="toggle-theme" aria-label="${themeMode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}">
            <img src="${themeMode === 'dark' ? '/assets/light_button.png' : '/assets/dark_icon.png'}" alt="" aria-hidden="true">
          </button>
        </nav>
      </aside>

      <main>
        <section id="budget-section" class="budget-section anchored-section">
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
          <section class="panel cashflow-panel">
            <div class="section-title">
              <strong>Income And Expenses</strong>
            </div>
            ${cashflowSummaryGroup('Income', 'income', incomeItems, plan.income)}
            ${cashflowSummaryGroup('Expenses', 'expense', expenseItems, plan.expenses)}
          </section>

          <section class="budget-column">
            <form id="budget" class="panel budget-form">
              <div class="section-title">
                <strong>Budget Calculator</strong>
              </div>
              ${readonlyBudgetField('Monthly income', plan.income)}
              ${monthlyExpensesField(plan.expenses)}
              ${field('Debt balance', 'debt_balance')}
              ${field('Debt APR', 'debt_apr')}
              ${field('Emergency Fund', 'emergency_current')}
              ${field('Emergency Fund Savings Account APY', 'emergency_apy')}
              ${field('Monthly contribution', 'monthly_contribution')}
            </form>
            <section class="panel guidance-panel">
              <div class="section-title">
                <strong>Next Best Move</strong>
              </div>
              <div class="guidance-card">
                <span>${move.label}</span>
                <strong>${move.metric}</strong>
                <h3>${move.title}</h3>
                <p>${move.detail}</p>
              </div>
            </section>
          </section>
        </section>
        </section>

        <section id="readiness-section" class="portfolio-grid anchored-section">
          <div class="readiness-left-stack">
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
                  return `<div><i style="background:${asset?.color || '#1E88E5'}"></i><span>${item.asset_label}</span><strong>${pct(percent)}</strong></div>`;
                }).join('')}
              </div>
            </article>
            <section class="panel debt-snapshot-panel">
              <div class="section-title">
                <strong>Debt Payoff Snapshot</strong>
              </div>
              <div class="debt-snapshot-grid">
                <div>
                  <span>Current debt</span>
                  <strong>${money(plan.debt)}</strong>
                </div>
                <div>
                  <span>APR</span>
                  <strong>${pct(state.budget.debt_apr)}</strong>
                </div>
                <div>
                  <span>Suggested payoff</span>
                  <strong>${money(debtSnapshotPayment)}</strong>
                </div>
                <div>
                  <span>Estimated payoff</span>
                  <strong>${debtSnapshotMonths ? `${debtSnapshotMonths} mo` : 'Ready'}</strong>
                </div>
              </div>
              <p class="note">${plan.debt > 0 ? 'Paying down debt below $5,000 unlocks more of the plan for investing.' : 'Debt is clear, so available dollars can move toward savings and investing.'}</p>
            </section>
          </div>
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

        <section id="assets" class="panel asset-editor anchored-section">
          <div class="asset-editor-head">
            <div class="section-title asset-editor-title">
              <strong>Asset Classes</strong>
            </div>
            <button class="cashflow-add-btn" type="button" data-action="open-asset-entry">Add Asset</button>
          </div>
          <div class="asset-summary">
            <h3>My Top Performing Assets</h3>
            <div class="focus-list">
              ${focus.map((item) => `<div><span>${item.focus_rank}</span><strong>${item.asset_label}</strong><small>${money(netAssetValue(item))} net</small></div>`).join('')}
            </div>
          </div>
          <div class="asset-summary-list">
            ${state.visibleAssetKeys.map((assetKey) => {
              const item = state.allocations.find((allocation) => allocation.asset_key === assetKey) || state.allocations[0];
              const asset = assetClasses.find((entry) => entry.key === item.asset_key);
              const percent = plan.portfolioTotal ? (netAssetValue(item) / plan.portfolioTotal) * 100 : 0;
              return `
                <button class="asset-summary-item" type="button" data-action="open-asset-entry" data-asset-key="${item.asset_key}">
                  <div>
                    <i style="background:${asset?.color || '#1E88E5'}"></i>
                    <div><strong>${item.asset_label}</strong><span>${asset?.group || 'Asset'} · ${item.liquidity} liquidity</span></div>
                  </div>
                  <span>${money(netAssetValue(item))} net</span>
                  <span>${pct(percent)}</span>
                </button>
              `;
            }).join('')}
          </div>
        </section>

        <section id="news" class="panel news-panel">
          <div class="section-title">
            <span class="news-title">Research Center</span>
          </div>
          <div class="research-grid">
            <article class="research-card cash-rates-card">
              <span>Cash & Savings Rates</span>
              <strong>${pct(state.budget.emergency_apy)} APY</strong>
              <p>Your emergency fund savings account rate. Compare HYSA, CDs, and Treasury bills before moving liquid cash.</p>
              <div>
                <small>3-month gap</small>
                <b>${money(savingsGap)}</b>
              </div>
            </article>
            <article class="research-card insight-card">
              <span>Asset Class Insight</span>
              <strong>${insightAsset?.asset_label || 'Add assets'}</strong>
              <p>${insightAsset ? `${insightClass?.group || 'Asset'} exposure is ${pct(insightPercent)} of the tracked portfolio with ${insightAsset.liquidity} liquidity.` : 'Add an asset class to generate a focused portfolio insight.'}</p>
              <div>
                <small>Current net</small>
                <b>${money(insightAsset ? netAssetValue(insightAsset) : 0)}</b>
              </div>
            </article>
            <article class="research-card takeaway-card">
              <span>What This Means For You</span>
              <strong>Research takeaway</strong>
              <p>${researchTakeaway}</p>
            </article>
            <article class="research-card debt-tip-card">
              <span>Debt Payoff Tip</span>
              <strong>${plan.debt > 0 ? `${pct(state.budget.debt_apr)} APR` : 'Debt clear'}</strong>
              <p>${debtTip}</p>
              <div>
                <small>Suggested payoff</small>
                <b>${money(debtSnapshotPayment)}</b>
              </div>
            </article>
          </div>
          <div class="market-watchlist" aria-label="Market watchlist">
            <div class="market-watchlist-head">
              <strong>Market Watchlist</strong>
            </div>
            <div class="watchlist-marquee">
              <div class="watchlist-track">
                ${marketTickerItems}
              </div>
            </div>
          </div>
          <div class="news-articles-title">
            <strong>Wealth Builder News</strong>
          </div>
          <div class="news-list">
            ${dailyNews.map((item) => `
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
      ${quickEntryOverlay()}
      ${assetEntryOverlay()}
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

function monthlyExpensesField(value) {
  return readonlyBudgetField('Monthly expenses', value);
}

function readonlyBudgetField(label, value) {
  return `
    <label>
      <span>${label}</span>
      <input type="number" min="0" step="any" inputmode="decimal" value="${editableValue(value)}" readonly aria-readonly="true" tabindex="-1">
    </label>
  `;
}

function bindEvents() {
  document.querySelector('[data-action="toggle-mobile-nav"]')?.addEventListener('click', () => {
    mobileNavOpen = !mobileNavOpen;
    render();
  });

  document.querySelector('[data-action="toggle-theme"]')?.addEventListener('click', () => {
    themeMode = themeMode === 'dark' ? 'light' : 'dark';
    localStorage.setItem('wealth-builder-theme', themeMode);
    applyTheme();
    render();
  });

  document.querySelectorAll('nav a').forEach((link) => {
    link.addEventListener('click', (event) => {
      event.preventDefault();
      const target = link.getAttribute('href');
      mobileNavOpen = false;
      render();

      window.setTimeout(() => {
        if (!target || target === '#') {
          window.scrollTo({ top: 0, behavior: 'smooth' });
          return;
        }

        const section = document.querySelector(target);
        if (!section) return;

        const isMobile = window.matchMedia('(max-width: 720px)').matches;
        const styles = getComputedStyle(document.documentElement);
        const navHeight = isMobile ? 0 : Number.parseFloat(styles.getPropertyValue('--nav-height')) || 0;
        const anchorGap = isMobile ? 2 : Number.parseFloat(styles.getPropertyValue('--anchor-gap')) || 0;
        const top = section.getBoundingClientRect().top + window.scrollY - navHeight - anchorGap;
        window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
      }, 0);
    });
  });

  document.querySelectorAll('#budget input, #budget select').forEach((input) => {
    input.addEventListener('input', (event) => {
      const { name, value, type } = event.target;
      state.budget[name] = value;
      persistLocal();
      scheduleSave();
    });
    input.addEventListener('change', render);
  });

  document.querySelectorAll('[data-action="open-quick-entry"]').forEach((button) => {
    button.addEventListener('click', (event) => {
      const { entryType, sourceType, key } = event.currentTarget.dataset;
      quickEntry = {
        entryType,
        sourceType: sourceType || (entryType === 'income' ? 'income' : 'variable'),
        key: key || null,
        anchor: overlayAnchorFromElement(event.currentTarget)
      };
      render();
      window.setTimeout(() => document.querySelector('[data-quick-name]')?.focus(), 0);
    });
  });

  document.querySelectorAll('[data-action="close-quick-entry"]').forEach((element) => {
    element.addEventListener('click', (event) => {
      if (event.target !== event.currentTarget && event.currentTarget.classList.contains('quick-entry-layer')) return;
      quickEntry = null;
      render();
    });
  });

  document.querySelector('[data-action="save-quick-entry"]')?.addEventListener('click', () => {
    if (!quickEntry) return;

    const label = document.querySelector('[data-quick-name]')?.value?.trim() || 'Unnamed item';
    const amount = document.querySelector('[data-quick-amount]')?.value ?? '';
    const sourceType = quickEntry.sourceType || (quickEntry.entryType === 'income' ? 'income' : 'variable');
    const group = state.cashflowInputs[sourceType];
    const existing = group?.find((item) => item.key === quickEntry.key);
    if (!group) return;

    if (existing) {
      existing.label = label;
      existing.amount = amount;
    } else {
      group.push({ key: makeCashflowKey(sourceType), label, amount });
    }

    quickEntry = null;
    updateBudgetFromCashflowInputs();
    persistLocal();
    scheduleSave();
    render();
  });

  document.querySelector('[data-action="remove-quick-entry"]')?.addEventListener('click', () => {
    if (!quickEntry?.key) return;

    state.cashflowInputs[quickEntry.sourceType] = state.cashflowInputs[quickEntry.sourceType].filter((item) => item.key !== quickEntry.key);
    quickEntry = null;
    updateBudgetFromCashflowInputs();
    persistLocal();
    scheduleSave();
    render();
  });

  document.querySelectorAll('[data-action="open-asset-entry"]').forEach((button) => {
    button.addEventListener('click', (event) => {
      const key = event.currentTarget.dataset.assetKey || null;
      assetEntry = { assetKey: key, originalKey: key, anchor: overlayAnchorFromElement(event.currentTarget) };
      render();
      window.setTimeout(() => document.querySelector('[data-asset-entry-field="asset_key"]')?.focus(), 0);
    });
  });

  document.querySelectorAll('[data-action="close-asset-entry"]').forEach((element) => {
    element.addEventListener('click', (event) => {
      if (event.target !== event.currentTarget && event.currentTarget.classList.contains('quick-entry-layer')) return;
      assetEntry = null;
      render();
    });
  });

  document.querySelector('[data-asset-entry-field="asset_key"]')?.addEventListener('change', (event) => {
    if (!assetEntry) return;
    assetEntry.assetKey = event.target.value;
    render();
  });

  document.querySelector('[data-action="save-asset-entry"]')?.addEventListener('click', () => {
    if (!assetEntry) return;

    const selectedKey = document.querySelector('[data-asset-entry-field="asset_key"]')?.value;
    const allocation = state.allocations.find((item) => item.asset_key === selectedKey);
    if (!allocation) return;

    allocation.current_value = document.querySelector('[data-asset-entry-field="current_value"]')?.value ?? allocation.current_value;
    allocation.owed_debt = document.querySelector('[data-asset-entry-field="owed_debt"]')?.value ?? allocation.owed_debt;
    allocation.target_percent = document.querySelector('[data-asset-entry-field="target_percent"]')?.value ?? allocation.target_percent;

    if (assetEntry.originalKey && assetEntry.originalKey !== selectedKey) {
      const previousAllocation = state.allocations.find((item) => item.asset_key === assetEntry.originalKey);
      if (previousAllocation) previousAllocation.focus_rank = null;
      state.visibleAssetKeys = state.visibleAssetKeys.filter((key) => key !== assetEntry.originalKey);
    }

    if (!state.visibleAssetKeys.includes(selectedKey)) state.visibleAssetKeys.push(selectedKey);
    syncVisibleAssets();
    assetEntry = null;
    persistLocal();
    scheduleSave();
    render();
  });

  document.querySelector('[data-action="remove-asset-entry"]')?.addEventListener('click', () => {
    const key = assetEntry?.assetKey;
    if (!key) return;

    const allocation = state.allocations.find((item) => item.asset_key === key);
    if (allocation) {
      allocation.current_value = '';
      allocation.owed_debt = '';
      allocation.target_percent = 0;
      allocation.focus_rank = null;
    }

    state.visibleAssetKeys = state.visibleAssetKeys.filter((item) => item !== key);
    syncVisibleAssets();
    assetEntry = null;
    persistLocal();
    scheduleSave();
    render();
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

  document.querySelectorAll('input[type="number"]:not([readonly])').forEach((input) => {
    input.addEventListener('mousedown', handleDarkNumberStepper);
    input.addEventListener('mousemove', handleDarkNumberStepperCursor);
    input.addEventListener('mouseleave', () => {
      input.style.cursor = '';
    });
  });
}

function handleDarkNumberStepperCursor(event) {
  const input = event.currentTarget;
  if (themeMode !== 'dark' || input.disabled || input.readOnly) {
    input.style.cursor = '';
    return;
  }

  const rect = input.getBoundingClientRect();
  input.style.cursor = rect.right - event.clientX <= 32 ? 'pointer' : '';
}

function handleDarkNumberStepper(event) {
  if (themeMode !== 'dark') return;

  const input = event.currentTarget;
  if (input.disabled || input.readOnly) return;

  const rect = input.getBoundingClientRect();
  const arrowZoneWidth = 32;
  if (rect.right - event.clientX > arrowZoneWidth) return;

  event.preventDefault();
  input.focus();

  const currentValue = Number(input.value) || 0;
  const isDecimalField = String(input.value).includes('.') || input.name === 'emergency_apy';
  const step = isDecimalField ? 0.01 : 1;
  const direction = event.clientY < rect.top + rect.height / 2 ? 1 : -1;
  const min = input.min === '' ? -Infinity : Number(input.min);
  const max = input.max === '' ? Infinity : Number(input.max);
  const nextValue = Math.min(max, Math.max(min, currentValue + direction * step));

  input.value = isDecimalField ? Number(nextValue.toFixed(2)).toString() : String(Math.round(nextValue));
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
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

function isEditingFormInput() {
  return Boolean(document.activeElement?.matches?.('#budget input, #budget select, [data-cashflow], [data-cashflow-name], [data-quick-name], [data-quick-amount], [data-asset-entry-field]'));
}

function persistLocal() {
  localStorage.setItem('wealthbuilder-plan', JSON.stringify({
    budget: state.budget,
    allocations: state.allocations,
    cashflowInputs: state.cashflowInputs,
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
    state.cashflowInputs = normalizeCashflowInputs(parsed.cashflowInputs || cashflowInputsFromBudget(state.budget));
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
    .limit(12);

  if (news?.length) state.news = mergeNewsItems(news, fallbackNews);
  render();
}

async function savePlan() {
  persistLocal();

  if (!supabase) {
    state.status = 'Saved locally';
    if (!isEditingFormInput()) render();
    return;
  }

  state.saving = true;
  if (!isEditingFormInput()) render();

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
    if (!isEditingFormInput()) render();
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
  if (!isEditingFormInput()) render();
}

loadLocal();
render();
loadSupabaseData();

window.addEventListener('scroll', () => {
  const isMobile = window.matchMedia('(max-width: 720px)').matches;
  const shouldHideLogo = isMobile && window.scrollY > 12;

  if (isMobile && mobileNavOpen) {
    mobileNavOpen = false;
    render();
    return;
  }

  if (shouldHideLogo === mobileLogoHidden) return;

  mobileLogoHidden = shouldHideLogo;
  document.querySelector('.sidebar')?.classList.toggle('logo-hidden', mobileLogoHidden);
}, { passive: true });
