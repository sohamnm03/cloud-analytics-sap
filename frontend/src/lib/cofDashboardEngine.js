import Chart from 'chart.js/auto';
import domtoimage from 'dom-to-image-more';
import jsPDF from 'jspdf';
// import { exportPDF as exportPDFUtil } from './exportPDF';

const API_URL = 'https://dev-fsnxt-dashboard-reports.azurewebsites.net/api/reports/process';

const COLORS = ['#1565c0', '#0288d1', '#00acc1', '#1e88e5', '#1976d2', '#006064', '#01579b', '#0277bd', '#1a237e', '#283593', '#004d40', '#b71c1c', '#e65100', '#4a148c', '#37474f'];
const PRD_SHORT_MAP = {
  '15A': 'Term Loan',
  '15B': 'Comm. Paper',
  '15C': 'LT Deb.',
  '15D': 'Tier II Deb.',
  '15E': 'Perp. Deb.',
  '15F': 'WCDL',
  '15G': 'Cash Credit',
  '15H': 'FCL',
  '15J': 'Sub. Debt',
  '15K': 'Infra Bond',
  '15L': 'Overdraft',
};

let PRODUCTS = [];
let LENDERS = [];
let MAT = {};
let TXN_DATA = [];
let TOTAL = 0;
let txnChartsInited = false;
let lv_fixed_b = 0;
let lv_float_b = 0;
let lv_sec_b = 0;
let lv_uns_b = 0;
let lv_oth_b = 0;
let lv_total_b = 0;
let lv_total_acc = 0;
let lv_total_wt = 0;
let lv_total_af = 0;
let lv_total_ia = 0;
let lv_avg_eir = 0;
let lv_top_prd = '';
let lv_hi_prd = '';
let lv_lo_prd = '';
let lv_ha_prd = '';
let lv_hi_eir_val = 0;
let lv_lo_eir_val = 9999;
let lv_hi_eir_b = 0;
let lv_lo_eir_b = 0;
let lv_ha_acc = 0;
let lv_top_cl = 0;
let lv_mat_2026 = 0;
let lv_mat_med = 0;
let lv_mat_long = 0;
let lv_peak_b = 0;
let lv_peak_yr = '';
let lv_lend_cnt = 0;
let lv_prd_cnt = 0;
let ovProdChart = null;
let portHBarChartInst = null;
let matChartInst = null;
let txnPage = 1;
let txnPerPage = 25;
let txnSortCol = -1;
let txnSortDir = 1;
let txnFiltered = [];
let ftrCurrentRow = null;
let transactionCharts = [];
let activateTimer = null;
const ENABLE_EXTERNAL_TOOLTIP = true;

let ttEl = null;
let ttTitle = null;
let ttBody = null;
let ttHeaderDot = null;
let ttHideTimer = null;

function cc(color, alpha = '26') {
  return `${color}${alpha}`;
}

function mkGrad(ctx, color) {
  try {
    const gradient = ctx.createLinearGradient(0, 0, 0, ctx.canvas.height || 260);
    gradient.addColorStop(0, `${color}dd`);
    gradient.addColorStop(1, `${color}44`);
    return gradient;
  } catch {
    return `${color}aa`;
  }
}

function fmtIndian(number) {
  if (number === null || number === undefined || Number.isNaN(number)) {
    return '0';
  }

  const rounded = Math.round(number);
  const sign = rounded < 0 ? '-' : '';
  const digits = String(Math.abs(rounded));
  const tail = digits.length > 3 ? digits.slice(-3) : digits;
  let lead = digits.length > 3 ? digits.slice(0, -3) : '';
  const parts = [];

  while (lead.length > 2) {
    parts.unshift(lead.slice(-2));
    lead = lead.slice(0, -2);
  }

  if (lead) {
    parts.unshift(lead);
  }

  return `${sign}${parts.join(parts.length ? ',' : '')}${parts.length ? ',' : ''}${tail}`;
}

function fmtN(value, decimals = 2) {
  const numeric = Number.parseFloat(value) || 0;
  const crores = numeric / 10000000;
  if (crores >= 1000) {
    return fmtIndian(Math.round(crores));
  }
  return crores.toFixed(decimals);
}

function fmtCr(value) {
  return `Rs ${fmtN(value)} Cr`;
}

function fmtAmt(raw, unit) {
  const numeric = Number.parseFloat(raw) || 0;
  if (unit === 'raw') {
    return fmtIndian(Math.round(numeric));
  }
  if (numeric === 0) {
    return '0';
  }
  if (unit === 'crores') {
    return `${(numeric / 1e7).toFixed(2)} Cr`;
  }
  if (unit === 'lakhs') {
    return `${(numeric / 1e5).toFixed(2)} L`;
  }
  if (unit === 'thousands') {
    return `${(numeric / 1e3).toFixed(2)} K`;
  }
  return fmtIndian(Math.round(numeric));
}

function fmtDate(raw) {
  if (!raw || String(raw).length < 8) {
    return raw || '—';
  }
  const value = String(raw);
  return `${value.slice(6, 8)}/${value.slice(4, 6)}/${value.slice(0, 4)}`;
}

function normDate(value) {
  if (!value) {
    return '';
  }

  const stringValue = String(value).trim();
  if (/^\d{2}\.\d{2}\.\d{4}$/.test(stringValue)) {
    return `${stringValue.slice(6, 10)}${stringValue.slice(3, 5)}${stringValue.slice(0, 2)}`;
  }
  return stringValue;
}

function getShortLabel(productType, productDescription) {
  if (PRD_SHORT_MAP[productType]) {
    return PRD_SHORT_MAP[productType];
  }
  return String(productDescription || productType || '').split(' ').slice(0, 2).join(' ');
}

function toNumber(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function normalizeProduct(product) {
  return {
    zprd_type: String(product?.zprd_type || ''),
    zprd_desc: String(product?.zprd_desc || ''),
    zshort_lbl: String(product?.zshort_lbl || getShortLabel(product?.zprd_type, product?.zprd_desc)),
    zclosing_amt: toNumber(product?.zclosing_amt),
    zaccrual_amt: toNumber(product?.zaccrual_amt),
    zwt_avg_amt: toNumber(product?.zwt_avg_amt),
    zavg_funds: toNumber(product?.zavg_funds),
    zwt_int_amt: toNumber(product?.zwt_int_amt),
    zopen_eir_sum: toNumber(product?.zopen_eir_sum),
    zexit_eir_sum: toNumber(product?.zexit_eir_sum),
    zavg_eir_sum: toNumber(product?.zavg_eir_sum),
    zavg_papm_sum: toNumber(product?.zavg_papm_sum),
    zeir_cnt: toNumber(product?.zeir_cnt),
  };
}

function normalizeLender(lender) {
  return {
    zcounterpty: String(lender?.zcounterpty || ''),
    zclosing_amt: toNumber(lender?.zclosing_amt),
  };
}

function normalizeMaturity(maturity) {
  if (!maturity || typeof maturity !== 'object') {
    return {};
  }

  return Object.fromEntries(
    Object.entries(maturity).map(([year, value]) => [String(year), toNumber(value)]),
  );
}

function normalizeTransactions(rows) {
  if (!Array.isArray(rows)) {
    return [];
  }

  return rows.map((row) => Array.isArray(row) ? row.slice(0, 17) : []).filter((row) => row.length > 0);
}

function destroyChart(chart) {
  if (chart && typeof chart.destroy === 'function') {
    chart.destroy();
  }
}

function destroyAllCharts() {
  destroyChart(ovProdChart);
  destroyChart(portHBarChartInst);
  destroyChart(matChartInst);
  transactionCharts.forEach(destroyChart);
  ovProdChart = null;
  portHBarChartInst = null;
  matChartInst = null;
  transactionCharts = [];
  txnChartsInited = false;
}

function resetState() {
  PRODUCTS = [];
  LENDERS = [];
  MAT = {};
  TXN_DATA = [];
  TOTAL = 0;
  txnChartsInited = false;
  lv_fixed_b = 0;
  lv_float_b = 0;
  lv_sec_b = 0;
  lv_uns_b = 0;
  lv_oth_b = 0;
  lv_total_b = 0;
  lv_total_acc = 0;
  lv_total_wt = 0;
  lv_total_af = 0;
  lv_total_ia = 0;
  lv_avg_eir = 0;
  lv_top_prd = '';
  lv_hi_prd = '';
  lv_lo_prd = '';
  lv_ha_prd = '';
  lv_hi_eir_val = 0;
  lv_lo_eir_val = 9999;
  lv_hi_eir_b = 0;
  lv_lo_eir_b = 0;
  lv_ha_acc = 0;
  lv_top_cl = 0;
  lv_mat_2026 = 0;
  lv_mat_med = 0;
  lv_mat_long = 0;
  lv_peak_b = 0;
  lv_peak_yr = '';
  lv_lend_cnt = 0;
  lv_prd_cnt = 0;
  txnPage = 1;
  txnSortCol = -1;
  txnSortDir = 1;
  txnFiltered = [];
  ftrCurrentRow = null;
}

function applyRenderState(renderState) {
  resetState();

  PRODUCTS = Array.isArray(renderState?.products) ? renderState.products.map(normalizeProduct) : [];
  LENDERS = Array.isArray(renderState?.lenders) ? renderState.lenders.map(normalizeLender) : [];
  MAT = normalizeMaturity(renderState?.maturity);
  TXN_DATA = normalizeTransactions(renderState?.transactions);

  const totals = renderState?.totals || {};
  lv_fixed_b = toNumber(totals.lv_fixed_b);
  lv_float_b = toNumber(totals.lv_float_b);
  lv_sec_b = toNumber(totals.lv_sec_b);
  lv_uns_b = toNumber(totals.lv_uns_b);
  lv_oth_b = toNumber(totals.lv_oth_b);
  lv_total_b = toNumber(totals.lv_total_b, PRODUCTS.reduce((sum, product) => sum + product.zclosing_amt, 0));
  lv_total_acc = toNumber(totals.lv_total_acc, PRODUCTS.reduce((sum, product) => sum + product.zaccrual_amt, 0));
  lv_total_wt = toNumber(totals.lv_total_wt, PRODUCTS.reduce((sum, product) => sum + product.zwt_avg_amt, 0));
  lv_total_af = toNumber(totals.lv_total_af, PRODUCTS.reduce((sum, product) => sum + product.zavg_funds, 0));
  lv_total_ia = toNumber(totals.lv_total_ia, PRODUCTS.reduce((sum, product) => sum + product.zwt_int_amt, 0));
  lv_avg_eir = toNumber(totals.lv_avg_eir);
  lv_top_prd = String(totals.lv_top_prd || '');
  lv_hi_prd = String(totals.lv_hi_prd || '');
  lv_lo_prd = String(totals.lv_lo_prd || '');
  lv_ha_prd = String(totals.lv_ha_prd || '');
  lv_hi_eir_val = toNumber(totals.lv_hi_eir_val);
  lv_lo_eir_val = toNumber(totals.lv_lo_eir_val, 9999);
  lv_hi_eir_b = toNumber(totals.lv_hi_eir_b);
  lv_lo_eir_b = toNumber(totals.lv_lo_eir_b);
  lv_ha_acc = toNumber(totals.lv_ha_acc);
  lv_top_cl = toNumber(totals.lv_top_cl);
  lv_mat_2026 = toNumber(totals.lv_mat_2026);
  lv_mat_med = toNumber(totals.lv_mat_med);
  lv_mat_long = toNumber(totals.lv_mat_long);
  lv_peak_b = toNumber(totals.lv_peak_b);
  lv_peak_yr = String(totals.lv_peak_yr || '');
  lv_lend_cnt = toNumber(totals.lv_lend_cnt, LENDERS.length);
  lv_prd_cnt = toNumber(totals.lv_prd_cnt, PRODUCTS.length);
  TOTAL = toNumber(totals.total, lv_total_b);
}

function setText(id, value) {
  const element = document.getElementById(id);
  if (element) {
    element.textContent = value;
  }
}

function setBarWidth(id, percent) {
  const element = document.getElementById(id);
  if (element) {
    element.style.width = `${Math.min(percent, 100)}%`;
  }
}

function buildAllocBars() {
  const container = document.getElementById('portfolioAllocBars');
  if (!container) return;

  const total = lv_total_b || 1;
  const items = [
    { label: 'Secured Liability', value: lv_sec_b, cls: 'b1' },
    { label: 'Unsecured Liability', value: lv_uns_b, cls: 'b2' },
    { label: 'Other / Unclassified', value: lv_oth_b, cls: 'b3' },
  ];

  container.innerHTML = items.map((item) => {
    const pct = item.value / total * 100;
    return `<div class="prog-item"><div class="prog-header"><span class="prog-label">${item.label}</span><span class="prog-pct">${fmtN(item.value)} Cr · ${pct.toFixed(1)}%</span></div><div class="prog-bar"><div class="prog-fill ${item.cls}" data-w="${pct.toFixed(1)}"></div></div></div>`;
  }).join('');
}

function buildEirBandTable() {
  const tbody = document.getElementById('eirBandTable');
  if (!tbody) return;

  const rows = PRODUCTS.filter((product) => product.zeir_cnt > 0).slice(0, 5).map((product) => {
    const eir = product.zavg_eir_sum / product.zeir_cnt;
    const cls = eir >= 8.5 ? 'red' : eir >= 8.0 ? 'yellow' : 'blue';
    const label = eir >= 8.5 ? 'High' : eir >= 8.0 ? 'Mid' : 'Low';
    return `<tr><td>${product.zprd_desc}</td><td>${eir.toFixed(2)}%</td><td><span class="spill ${cls}">${label}</span></td></tr>`;
  });

  tbody.innerHTML = rows.join('') || '<tr><td colspan="3">No data</td></tr>';
}

function populateProductFilter() {
  const select = document.getElementById('txnPrdFilter');
  if (!select) return;

  while (select.options.length > 1) {
    select.remove(1);
  }

  PRODUCTS.forEach((product) => {
    const option = document.createElement('option');
    option.value = product.zprd_type;
    option.text = `${product.zprd_type} – ${product.zprd_desc}`;
    select.appendChild(option);
  });
}

function fillTokens() {
  setText('kpiTotalB', `${fmtN(lv_total_b)} Cr`);
  setText('kpiAvgEir', `${lv_avg_eir.toFixed(2)}%`);
  setText('kpiTotAcc', `${fmtN(lv_total_acc)} Cr`);
  setText('kpiTxnCnt', String(TXN_DATA.length));
  setText('prdCntSpan', String(lv_prd_cnt));
  setText('kpi4Badge', `${lv_prd_cnt} Types`);
  setText('kpi1Footer', PRODUCTS[0] ? `Top: ${PRODUCTS[0].zshort_lbl} · ${fmtN(PRODUCTS[0].zclosing_amt)} Cr` : '—');
  setText('kpi2Footer', lv_hi_prd ? `Highest: ${lv_hi_prd} · ${lv_hi_eir_val.toFixed(2)}%` : '—');
  setText('kpi4Footer', `${lv_lend_cnt} counterparties · ${TXN_DATA.length} active lines`);
  setText('ssFixed', `${fmtN(lv_fixed_b)} Cr`);
  setText('ssFloat', `${fmtN(lv_float_b)} Cr`);
  setText('ssEir', `${lv_avg_eir.toFixed(2)}%`);
  setText('ssMat2026', `${fmtN(lv_mat_2026)} Cr`);
  setText('anAccKpi', `Rs ${Math.round(lv_total_acc / 10000000)} Cr`);
  setText('anWtKpi', `Rs ${Math.round(lv_total_wt / 10000000)} Cr`);
  setText('anAfKpi', `Rs ${Math.round(lv_total_af / 10000000)} Cr`);
  setText('anIntKpi', `Rs ${Math.round(lv_total_ia / 10000000)} Cr`);
  setText('pkTopPrd', lv_top_prd || '—');
  setText('pkTopPrdStat', `${fmtCr(lv_top_cl)} outstanding`);
  setText('pkHiEir', lv_hi_prd || '—');
  setText('pkHiEirStat', `${lv_hi_eir_val.toFixed(2)}% p.a. EIR — ${fmtCr(lv_hi_eir_b)}`);
  setText('pkLoEir', lv_lo_prd || '—');
  setText('pkLoEirStat', lv_lo_eir_val < 9999 ? `${lv_lo_eir_val.toFixed(2)}% p.a. EIR` : '—');
  setText('pkHiAcc', lv_ha_prd || '—');
  setText('pkHiAccStat', `${fmtCr(lv_ha_acc)} accrual`);
  setText('matKpi2026', `${fmtN(lv_mat_2026)} Cr`);
  setText('matKpiMed', `${fmtN(lv_mat_med)} Cr`);
  setText('matKpiLong', `${fmtN(lv_mat_long)} Cr`);
  setText('matKpiPeak', lv_peak_yr || '—');

  const pct2026 = lv_total_b > 0 ? lv_mat_2026 / lv_total_b * 100 : 0;
  const pctMed = lv_total_b > 0 ? lv_mat_med / lv_total_b * 100 : 0;
  const pctLong = lv_total_b > 0 ? lv_mat_long / lv_total_b * 100 : 0;
  const pctPeak = lv_total_b > 0 ? lv_peak_b / lv_total_b * 100 : 0;
  setText('mat2026Pct', `${pct2026.toFixed(1)}% of total book`);
  setText('matMedPct', `${pctMed.toFixed(1)}% of total book`);
  setText('matLongPct', `${pctLong.toFixed(1)}% of total book`);
  setText('matPeakStat', `${fmtCr(lv_peak_b)} · ${pctPeak.toFixed(1)}% of book`);
  setBarWidth('sparkMat2026', pct2026);
  setBarWidth('sparkMatMed', pctMed);
  setBarWidth('sparkMatLong', pctLong);
  setBarWidth('sparkMatPeak', pctPeak);
  setText('secInsight', `${(lv_total_b > 0 ? lv_sec_b / lv_total_b * 100 : 0).toFixed(1)}% of the book is secured, providing strong collateral coverage.`);
  setText('txnBadge', `${TXN_DATA.length} RECORDS`);
  setText('txnKpiTotal', String(TXN_DATA.length));
  setText('txnKpiCpty', String(new Set(TXN_DATA.map((row) => row[5]).filter(Boolean)).size));
  setText('txnKpiDays', String(TXN_DATA[0]?.[13] || 0));
  setText('txnKpiPrdCat', String(PRODUCTS.length));

  buildAllocBars();
  buildEirBandTable();
  populateProductFilter();
}

function animateProgs() {
  document.querySelectorAll('.prog-fill[data-w], .kpi-spark-fill[data-w]').forEach((element) => {
    element.style.width = `${Number.parseFloat(element.getAttribute('data-w')) || 0}%`;
  });
}

function getTooltipElements() {
  if (!ttEl || !document.body.contains(ttEl)) {
    ttEl = document.getElementById('chart-tooltip');
    ttTitle = document.getElementById('tt-title');
    ttBody = document.getElementById('tt-body');
    ttHeaderDot = document.getElementById('tt-header-dot');
  }

  if (!ttEl || !ttTitle || !ttBody) {
    return null;
  }

  return { ttEl, ttTitle, ttBody, ttHeaderDot };
}

function resolveTooltipColor(value, index) {
  const pickColor = (candidate) => {
    if (!candidate) return null;
    if (typeof candidate === 'string') {
      return candidate;
    }
    if (Array.isArray(candidate)) {
      return pickColor(candidate[index] || candidate[0]);
    }
    return null;
  };

  return pickColor(value?.borderColor) || pickColor(value?.backgroundColor) || '#1565c0';
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function tooltipNumber(dataPoint, horizontal, circular) {
  if (circular) {
    return typeof dataPoint?.parsed === 'number' ? dataPoint.parsed : 0;
  }
  if (horizontal) {
    return typeof dataPoint?.parsed?.x === 'number' ? dataPoint.parsed.x : 0;
  }
  return typeof dataPoint?.parsed?.y === 'number' ? dataPoint.parsed.y : 0;
}

function formatTooltipValue(value, label, valueSuffix) {
  const text = String(label || '').toLowerCase();
  const suffix = String(valueSuffix || '').trim();
  if (text.includes('%') || text.includes('rate') || suffix === '%') {
    return `${value.toFixed(2)}%`;
  }
  if (suffix.toLowerCase() === 'bps') {
    return `${value.toFixed(2)} bps`;
  }
  if (suffix === '') {
    return value.toFixed(2);
  }
  if (suffix.toLowerCase() === 'cr') {
    return `₹${value.toFixed(2)} Cr`;
  }
  return `${value.toFixed(2)} ${suffix}`;
}

function renderExternalTooltip(context, valueSuffix = ' Cr') {
  const tooltipElements = getTooltipElements();
  if (!tooltipElements) {
    return;
  }

  const { ttEl: tooltipNode, ttTitle: titleNode, ttBody: bodyNode, ttHeaderDot: headerDotNode } = tooltipElements;
  const { chart, tooltip } = context;

  if (!tooltip || tooltip.opacity === 0) {
    if (ttHideTimer) {
      clearTimeout(ttHideTimer);
    }
    ttHideTimer = window.setTimeout(() => {
      tooltipNode.classList.remove('tt-visible');
    }, 80);
    return;
  }

  if (ttHideTimer) {
    clearTimeout(ttHideTimer);
    ttHideTimer = null;
  }

  titleNode.textContent = tooltip.title?.[0] || '';

  const horizontal = chart?.config?.options?.indexAxis === 'y';
  const circular = chart?.config?.type === 'doughnut' || chart?.config?.type === 'pie';
  const dataPoints = tooltip.dataPoints || [];

  let maxValue = 0;
  dataPoints.forEach((point) => {
    const absoluteValue = Math.abs(tooltipNumber(point, horizontal, circular));
    if (absoluteValue > maxValue) {
      maxValue = absoluteValue;
    }
  });

  let firstColor = '#1565c0';
  let rowsHtml = '';

  dataPoints.forEach((point, index) => {
    const dataset = point.dataset || {};
    const color = resolveTooltipColor(dataset, point.dataIndex);
    if (index === 0) {
      firstColor = color;
    }

    const rawValue = tooltipNumber(point, horizontal, circular);
    const label = dataset.label || 'Value';
    const valueText = formatTooltipValue(rawValue, label, valueSuffix);
    const barWidth = maxValue > 0 ? ((Math.abs(rawValue) / maxValue) * 100).toFixed(1) : '0.0';

    rowsHtml += `<div class="tt-row"><div class="tt-dot" style="background:${color};"></div><span class="tt-label-text">${escapeHtml(label)}</span><span class="tt-value" style="color:${color};">${escapeHtml(valueText)}</span></div><div class="tt-bar-wrap"><div class="tt-bar-fill" style="width:${barWidth}%;background:linear-gradient(90deg,${color}cc,${color}44);"></div></div>`;
  });

  bodyNode.innerHTML = rowsHtml;

  if (headerDotNode) {
    headerDotNode.style.background = firstColor;
    headerDotNode.style.boxShadow = `0 0 6px ${firstColor}99`;
  }

  const canvasRect = chart.canvas.getBoundingClientRect();
  const tooltipWidth = tooltipNode.offsetWidth || 220;
  const tooltipHeight = tooltipNode.offsetHeight || 100;
  const viewportWidth = window.innerWidth;

  let left = canvasRect.left + tooltip.caretX - (tooltipWidth / 2);
  let top = canvasRect.top + tooltip.caretY - tooltipHeight - 14;

  if (left < 8) left = 8;
  if (left + tooltipWidth > viewportWidth - 8) {
    left = viewportWidth - tooltipWidth - 8;
  }
  if (top < 8) {
    top = canvasRect.top + tooltip.caretY + 14;
  }

  tooltipNode.style.left = `${left}px`;
  tooltipNode.style.top = `${top}px`;
  tooltipNode.classList.add('tt-visible');
}

function configureGlobalChartDefaults() {
  Chart.defaults.plugins.tooltip.enabled = false;
  Chart.defaults.plugins.tooltip.external = (context) => renderExternalTooltip(context, ' Cr');
}

function tooltipCfg(valueSuffix = ' Cr') {
  const baseConfig = {
    enabled: true,
    backgroundColor: 'rgba(255,255,255,0.97)',
    titleColor: '#2e6090',
    bodyColor: '#2e6090',
    borderColor: 'rgba(204,224,245,0.8)',
    borderWidth: 1,
    padding: 10,
    cornerRadius: 10,
    callbacks: {
      label(context) {
        const value = context.parsed.y != null ? context.parsed.y : context.parsed.x;
        return ` ${context.dataset.label}: ${value}${valueSuffix}`;
      },
    },
  };

  if (!ENABLE_EXTERNAL_TOOLTIP) {
    return baseConfig;
  }

  return {
    ...baseConfig,
    enabled: false,
    external(context) {
      renderExternalTooltip(context, valueSuffix);
    },
  };
}

configureGlobalChartDefaults();

function commonOptions(overrides = {}) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 700, easing: 'easeOutQuart' },
    plugins: { legend: { display: false }, tooltip: tooltipCfg() },
    scales: {
      x: { grid: { display: false }, ticks: { font: { size: 10 }, color: '#6a9cbf' } },
      y: { grid: { color: '#eaf3fb' }, border: { color: 'transparent' }, ticks: { font: { size: 10 }, color: '#6a9cbf' } },
    },
    ...overrides,
  };
}

function donutOptions() {
  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 700, easing: 'easeOutQuart' },
    plugins: {
      legend: { display: false },
      tooltip: {
        enabled: true,
        backgroundColor: 'rgba(255,255,255,0.97)',
        titleColor: '#2e6090',
        bodyColor: '#2e6090',
        borderColor: 'rgba(204,224,245,0.8)',
        borderWidth: 1,
        padding: 10,
        cornerRadius: 10,
      },
    },
    cutout: '62%',
  };
}
function getValueByMode(product, mode) {
  switch (mode) {
    case 'total_loan':
      return product.zloan_amt;        
    case 'total_exposure':
      return product.zexp_amt;  
    case 'total_os':
      return product.zos_amt;     
    case 'pri_rec':
      return product.zprinc_rec;     
    default:
      return product.zloan_amt;
  }
}
function initOverview() {
  const productCanvas = document.getElementById('ovProductChart');
  if (!productCanvas) return;

  const top9 = PRODUCTS.slice(0, 9);
  const productCtx = productCanvas.getContext('2d');
  ovProdChart = new Chart(productCtx, {
    type: 'bar',
    data: {
      labels: top9.map((product) => product.zprd_desc),
      datasets: [{
        label: 'Closing (Rs Crores)',
        data: top9.map((product) => getValueByMode(product, chartMode) / 1e7),
        backgroundColor: COLORS.map((color) => mkGrad(productCtx, color)),
        borderColor: COLORS,
        borderRadius: 6,
        borderSkipped: false,
        maxBarThickness: 44,
      }],
    },
    options: commonOptions({
      scales: {
        x: { grid: { display: false }, ticks: { font: { size: 9 }, color: '#6a9cbf' } },
        y: { grid: { color: '#eaf3fb' }, border: { color: 'transparent' }, ticks: { font: { size: 10 }, color: '#6a9cbf', callback: (value) => `${value} Cr` } },
      },
    }),
  });

  const rateCanvas = document.getElementById('ovRateDonut');
  if (rateCanvas) {
    transactionCharts.push(new Chart(rateCanvas.getContext('2d'), {
      type: 'doughnut',
      data: {
        labels: ['Fixed', 'Floating', 'Other'],
        datasets: [{
          data: [lv_fixed_b / 1e7, lv_float_b / 1e7, (lv_total_b - lv_fixed_b - lv_float_b) / 1e7],
          backgroundColor: ['#1565c0', '#0288d1', '#00acc1'],
          borderWidth: 0,
        }],
      },
      options: donutOptions(),
    }));
  }

  const rateLegend = document.getElementById('ovRateLegend');
  if (rateLegend) {
    const items = [
      ['#1565c0', 'Fixed Rate', lv_fixed_b],
      ['#0288d1', 'Floating Rate', lv_float_b],
    ];
    rateLegend.innerHTML = items.map(([color, label, value]) => {
      const pct = lv_total_b > 0 ? value / lv_total_b * 100 : 0;
      return `<div class="legend-row"><div class="legend-dot" style="background:${color}"></div><div class="legend-label">${label}</div><div class="legend-val">Rs ${fmtN(value)} Cr</div><div class="legend-pct">${pct.toFixed(1)}%</div></div>`;
    }).join('');
  }

  const portCanvas = document.getElementById('ovPortDonut');
  if (portCanvas) {
    transactionCharts.push(new Chart(portCanvas.getContext('2d'), {
      type: 'doughnut',
      data: {
        labels: ['Standard', 'Watch', 'Special Mention'],
        datasets: [{ data: [lv_sec_b / 1e7, lv_uns_b / 1e7, lv_oth_b / 1e7], backgroundColor: ['#1565c0', '#0288d1', '#00acc1'], borderWidth: 0 }],
      },
      options: donutOptions(),
    }));
  }

  const portLegend = document.getElementById('ovPortLegend');
  if (portLegend) {
    const items = [['#1565c0', 'Standard', lv_sec_b], ['#0288d1', 'Watch', lv_uns_b], ['#00acc1', 'Special Mention', lv_oth_b]];
    portLegend.innerHTML = items.map(([color, label, value]) => {
      const pct = lv_total_b > 0 ? value / lv_total_b * 100 : 0;
      return `<div class="legend-row"><div class="legend-dot" style="background:${color}"></div><div class="legend-label">${label}</div><div class="legend-val">Rs ${fmtN(value)} Cr</div><div class="legend-pct">${pct.toFixed(1)}%</div></div>`;
    }).join('');
  }

  const detailCanvas = document.getElementById('ovFixedFloatDetail');
  if (detailCanvas) {
    transactionCharts.push(new Chart(detailCanvas.getContext('2d'), {
      type: 'bar',
      data: {
        labels: ['Fixed Rate', 'Floating Rate', 'Secured', 'Unsecured', 'Other'],
        datasets: [{
          label: 'Amount (Rs Crores)',
          data: [lv_fixed_b, lv_float_b, lv_sec_b, lv_uns_b, lv_oth_b].map((value) => value / 1e7),
          backgroundColor: ['rgba(21,101,192,.22)', 'rgba(0,172,193,.22)', 'rgba(30,136,229,.22)', 'rgba(1,87,155,.22)', 'rgba(0,96,100,.22)'],
          borderColor: ['#1565c0', '#00acc1', '#1e88e5', '#01579b', '#006064'],
          borderWidth: 1.5,
          borderRadius: 7,
        }],
      },
      options: commonOptions({
        scales: {
          x: { grid: { display: false }, ticks: { font: { size: 10 }, color: '#6a9cbf' } },
          y: { grid: { color: '#eaf3fb' }, border: { color: 'transparent' }, ticks: { font: { size: 10 }, color: '#6a9cbf', callback: (value) => `${value} Cr` } },
        },
      }),
    }));
  }

  const lenderContainer = document.getElementById('ovLenderBars');
  if (lenderContainer) {
    const maximum = LENDERS[0]?.zclosing_amt || 1;
    lenderContainer.innerHTML = LENDERS.slice(0, 5).map((lender, index) => {
      const pct = lender.zclosing_amt / lv_total_b * 100;
      const width = lender.zclosing_amt / maximum * 100;
      return `<div class="prog-item"><div class="prog-header"><span class="prog-label">${lender.zcounterpty}</span><span class="prog-pct">Rs ${fmtN(lender.zclosing_amt)} Cr · ${pct.toFixed(1)}%</span></div><div class="prog-bar"><div class="prog-fill b${index + 1}" data-w="${width.toFixed(1)}"></div></div></div>`;
    }).join('');
  }

  animateProgs();
}

function switchOvChart(mode) {
  if (!ovProdChart) return;
  const top9 = PRODUCTS.slice(0, 9);
  const values = mode === 'closing'
    ? top9.map((product) => product.zclosing_amt / 1e7)
    : mode === 'accrual'
      ? top9.map((product) => product.zaccrual_amt / 1e7)
      : top9.map((product) => product.zeir_cnt > 0 ? product.zavg_eir_sum / product.zeir_cnt : 0);
  ovProdChart.data.datasets[0].data = values;
  ovProdChart.data.datasets[0].label = mode === 'eir' ? 'EIR %' : mode === 'accrual' ? 'Accrual (Cr)' : 'Closing (Cr)';
  ovProdChart.update();
}

function makeBarChart(id, labels, values, label, valueSuffix = ' Cr') {
  const canvas = document.getElementById(id);
  if (!canvas) return null;

  const ctx = canvas.getContext('2d');
  return new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label,
        data: values,
        backgroundColor: COLORS.slice(0, labels.length).map((color) => mkGrad(ctx, color)),
        borderColor: COLORS.slice(0, labels.length),
        borderRadius: 8,
        borderSkipped: false,
        maxBarThickness: 40,
      }],
    },
    options: commonOptions({
      plugins: { legend: { display: false }, tooltip: tooltipCfg(valueSuffix) },
      scales: {
        x: { grid: { display: false }, ticks: { font: { size: 9 }, color: '#6a9cbf', maxRotation: 35 } },
        y: { grid: { color: '#eaf3fb' }, border: { color: 'transparent' }, ticks: { font: { size: 10 }, color: '#6a9cbf', callback: (value) => `${value}${valueSuffix}` } },
      },
    }),
  });
}

function initAnalytics() {
  const labels = PRODUCTS.map((product) => product.zshort_lbl);
  transactionCharts.push(makeBarChart('anAccrual', labels, PRODUCTS.map((product) => product.zaccrual_amt / 1e7), 'Accrual (Cr)'));
  transactionCharts.push(makeBarChart('anWtAvg', labels, PRODUCTS.map((product) => product.zwt_avg_amt / 1e7), 'Wt Avg (Cr)'));
  transactionCharts.push(makeBarChart('anAvgFunds', labels, PRODUCTS.map((product) => product.zavg_funds / 1e7), 'Avg Funds (Cr)'));
  transactionCharts.push(makeBarChart('anIntAmt', labels, PRODUCTS.map((product) => product.zwt_int_amt / 1e7), 'Int Amt-EIR (Cr)'));
  transactionCharts.push(makeBarChart('anYieldPct', labels, PRODUCTS.map((product) => product.zwt_avg_amt > 0 ? Number.parseFloat((product.zaccrual_amt / product.zwt_avg_amt * 100).toFixed(4)) : 0), 'Accrual Yield %', '%'));

  const openExitCanvas = document.getElementById('anOpenExit');
  if (openExitCanvas) {
    transactionCharts.push(new Chart(openExitCanvas.getContext('2d'), {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Open EIR (%)',
            data: PRODUCTS.map((product) => product.zeir_cnt > 0 ? product.zopen_eir_sum / product.zeir_cnt : 0),
            borderColor: '#1565c0',
            borderWidth: 2.5,
            tension: 0.45,
            fill: '+1',
            backgroundColor: 'rgba(21,101,192,.14)',
          },
          {
            label: 'Exit EIR (%)',
            data: PRODUCTS.map((product) => product.zeir_cnt > 0 ? product.zexit_eir_sum / product.zeir_cnt : 0),
            borderColor: '#00acc1',
            borderWidth: 2,
            tension: 0.45,
            fill: 'origin',
            backgroundColor: 'rgba(0,172,193,.10)',
            borderDash: [5, 4],
          },
        ],
      },
      options: commonOptions({
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: true, position: 'top', labels: { font: { size: 10 }, color: '#2e6090', padding: 14, usePointStyle: true } },
          tooltip: tooltipCfg('%'),
        },
        scales: {
          x: { grid: { display: false }, ticks: { font: { size: 9 }, color: '#6a9cbf', maxRotation: 35 } },
          y: { grid: { color: '#eaf3fb' }, border: { color: 'transparent' }, ticks: { font: { size: 10 }, color: '#6a9cbf', callback: (value) => `${value}%` } },
        },
      }),
    }));
  }

  const avgRateCanvas = document.getElementById('anAvgRate');
  if (avgRateCanvas) {
    transactionCharts.push(new Chart(avgRateCanvas.getContext('2d'), {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Avg Rate-EIR (%)',
            data: PRODUCTS.map((product) => product.zeir_cnt > 0 ? product.zavg_eir_sum / product.zeir_cnt : 0),
            borderColor: '#1e88e5',
            borderWidth: 2.5,
            tension: 0.45,
            fill: '+1',
            backgroundColor: 'rgba(30,136,229,.12)',
          },
          {
            label: 'Avg Rate-EIR PAPM (%)',
            data: PRODUCTS.map((product) => product.zeir_cnt > 0 ? product.zavg_papm_sum / product.zeir_cnt : 0),
            borderColor: '#fb8c00',
            borderWidth: 2,
            tension: 0.45,
            fill: 'origin',
            backgroundColor: 'rgba(251,140,0,.08)',
            borderDash: [5, 4],
          },
        ],
      },
      options: commonOptions({
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: true, position: 'top', labels: { font: { size: 10 }, color: '#2e6090', padding: 14, usePointStyle: true } },
          tooltip: tooltipCfg('%'),
        },
        scales: {
          x: { grid: { display: false }, ticks: { font: { size: 9 }, color: '#6a9cbf', maxRotation: 35 } },
          y: { grid: { color: '#eaf3fb' }, border: { color: 'transparent' }, ticks: { font: { size: 10 }, color: '#6a9cbf', callback: (value) => `${value}%` } },
        },
      }),
    }));
  }

  const eirDeltaCanvas = document.getElementById('anEirDelta');
  if (eirDeltaCanvas) {
    const deltaValues = PRODUCTS.map((product) => product.zeir_cnt > 0 ? Number.parseFloat(((product.zexit_eir_sum / product.zeir_cnt - product.zopen_eir_sum / product.zeir_cnt) * 100).toFixed(2)) : 0);
    transactionCharts.push(new Chart(eirDeltaCanvas.getContext('2d'), {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'EIR Movement (bps)',
          data: deltaValues,
          backgroundColor: deltaValues.map((value) => value > 0 ? 'rgba(0,172,193,.22)' : value < 0 ? 'rgba(229,57,53,.22)' : 'rgba(100,100,100,.1)'),
          borderColor: deltaValues.map((value) => value > 0 ? '#00acc1' : value < 0 ? '#e53935' : '#aaa'),
          borderWidth: 1.5,
          borderRadius: 5,
        }],
      },
      options: commonOptions({
        plugins: { legend: { display: false }, tooltip: tooltipCfg('bps') },
        scales: {
          x: { grid: { display: false }, ticks: { font: { size: 9 }, color: '#6a9cbf', maxRotation: 35 } },
          y: { grid: { color: '#eaf3fb' }, border: { color: 'transparent' }, ticks: { font: { size: 10 }, color: '#6a9cbf', callback: (value) => `${value}bps` } },
        },
      }),
    }));
  }
}

function initPortfolio() {
  const hbarCanvas = document.getElementById('portHBarChart');
  if (!hbarCanvas) return;
  const hbarCtx = hbarCanvas.getContext('2d');
  portHBarChartInst = new Chart(hbarCtx, {
    type: 'bar',
    data: {
      labels: PRODUCTS.map((product) => product.zshort_lbl),
      datasets: [{
        label: 'Closing (Rs Crores)',
        data: PRODUCTS.map((product) => product.zclosing_amt / 1e7),
        backgroundColor: PRODUCTS.map((_, index) => mkGrad(hbarCtx, COLORS[index % COLORS.length])),
        borderColor: COLORS.slice(0, PRODUCTS.length),
        borderWidth: 1.5,
        borderRadius: 4,
      }],
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: tooltipCfg() },
      scales: {
        x: { grid: { color: '#eaf3fb' }, border: { color: 'transparent' }, ticks: { font: { size: 10 }, color: '#6a9cbf' } },
        y: { grid: { display: false }, ticks: { font: { size: 9 }, color: '#6a9cbf' } },
      },
    },
  });

  const top7 = PRODUCTS.slice(0, 7);
  const otherValue = PRODUCTS.slice(7).reduce((sum, product) => sum + product.zclosing_amt, 0);
  const pieLabels = top7.map((product) => product.zshort_lbl).concat(['Others']);
  const pieValues = top7.map((product) => product.zclosing_amt / 1e7).concat([otherValue / 1e7]);
  const pieCanvas = document.getElementById('portPieChart');
  if (pieCanvas) {
    transactionCharts.push(new Chart(pieCanvas.getContext('2d'), {
      type: 'doughnut',
      data: { labels: pieLabels, datasets: [{ data: pieValues, backgroundColor: COLORS.slice(0, 8), borderWidth: 0 }] },
      options: donutOptions(),
    }));
  }

  const pieLegend = document.getElementById('portPieLegend');
  if (pieLegend) {
    pieLegend.innerHTML = pieLabels.map((label, index) => {
      const pct = pieValues[index] / ((lv_total_b || 1) / 1e7) * 100;
      return `<div class="legend-row"><div class="legend-dot" style="background:${COLORS[index]}"></div><div class="legend-label">${label}</div><div class="legend-pct">${pct.toFixed(1)}%</div></div>`;
    }).join('');
  }

  transactionCharts.push(makeBarChart('portAccrualChart', PRODUCTS.map((product) => product.zshort_lbl), PRODUCTS.map((product) => product.zaccrual_amt / 1e7), 'Accrual (Rs Crores)'));

  const eirCanvas = document.getElementById('portEirBar');
  if (eirCanvas) {
    const eirProducts = PRODUCTS.filter((product) => product.zeir_cnt > 0).sort((left, right) => (right.zavg_eir_sum / right.zeir_cnt) - (left.zavg_eir_sum / left.zeir_cnt));
    transactionCharts.push(new Chart(eirCanvas.getContext('2d'), {
      type: 'bar',
      data: {
        labels: eirProducts.map((product) => product.zshort_lbl),
        datasets: [{
          label: 'EIR %',
          data: eirProducts.map((product) => product.zavg_eir_sum / product.zeir_cnt),
          backgroundColor: eirProducts.map((product) => {
            const value = product.zavg_eir_sum / product.zeir_cnt;
            return value >= 8.5 ? 'rgba(229,57,53,.18)' : value >= 8.0 ? 'rgba(251,140,0,.18)' : 'rgba(21,101,192,.18)';
          }),
          borderColor: eirProducts.map((product) => {
            const value = product.zavg_eir_sum / product.zeir_cnt;
            return value >= 8.5 ? '#e53935' : value >= 8.0 ? '#fb8c00' : '#1565c0';
          }),
          borderWidth: 1.5,
          borderRadius: 4,
        }],
      },
      options: commonOptions({
        plugins: { legend: { display: false }, tooltip: tooltipCfg('%') },
        scales: {
          x: { grid: { display: false }, ticks: { font: { size: 9 }, color: '#6a9cbf' } },
          y: { grid: { color: '#eaf3fb' }, border: { color: 'transparent' }, ticks: { font: { size: 10 }, color: '#6a9cbf', callback: (value) => `${value}%` } },
        },
      }),
    }));
  }

  const table = document.getElementById('portFullTable');
  if (table) {
    table.innerHTML = PRODUCTS.map((product) => {
      const share = product.zclosing_amt / (lv_total_b || 1) * 100;
      const eir = product.zeir_cnt > 0 ? product.zavg_eir_sum / product.zeir_cnt : 0;
      const cls = eir >= 8.5 ? 'red' : eir >= 8.0 ? 'yellow' : 'blue';
      const label = eir >= 8.5 ? 'High' : eir >= 8.0 ? 'Mid' : 'Low';
      return `<tr><td>${product.zprd_desc}</td><td>${fmtN(product.zclosing_amt)}</td><td>${product.zaccrual_amt > 0 ? fmtN(product.zaccrual_amt) : '&mdash;'}</td><td>${eir > 0 ? `${eir.toFixed(2)}%` : '&mdash;'}</td><td>${share.toFixed(1)}%</td><td><span class="spill ${cls}">${label}</span></td></tr>`;
    }).join('');
  }
}

function switchPortChart(mode) {
  if (!portHBarChartInst) return;
  portHBarChartInst.options.indexAxis = mode === 'hbar' ? 'y' : 'x';
  portHBarChartInst.update();
}

function initMaturity() {
  const years = Object.keys(MAT).sort();
  const values = years.map((year) => MAT[year] / 1e7);
  const colors = years.map((year) => year <= '2026' ? '#e53935' : year <= '2029' ? '#fb8c00' : '#1565c0');
  const mainCanvas = document.getElementById('matMainChart');
  if (!mainCanvas) return;

  const matCtx = mainCanvas.getContext('2d');
  matChartInst = new Chart(matCtx, {
    type: 'bar',
    data: {
      labels: years,
      datasets: [{
        label: 'Maturing (Rs Cr)',
        data: values,
        backgroundColor: colors.map((color) => mkGrad(matCtx, color)),
        borderColor: colors,
        borderRadius: 8,
        borderSkipped: false,
        maxBarThickness: 44,
      }],
    },
    options: commonOptions({
      scales: {
        x: { grid: { display: false }, ticks: { font: { size: 10 }, color: '#6a9cbf' } },
        y: { grid: { color: '#eaf3fb' }, border: { color: 'transparent' }, ticks: { font: { size: 10 }, color: '#6a9cbf', callback: (value) => `${value} Cr` } },
      },
    }),
  });

  const bucketCanvas = document.getElementById('matBucketDonut');
  if (bucketCanvas) {
    transactionCharts.push(new Chart(bucketCanvas.getContext('2d'), {
      type: 'doughnut',
      data: {
        labels: ['Short (2026)', 'Medium (27-29)', 'Long (2030+)'],
        datasets: [{ data: [lv_mat_2026 / 1e7, lv_mat_med / 1e7, lv_mat_long / 1e7], backgroundColor: ['#e53935', '#fb8c00', '#1565c0'], borderWidth: 0 }],
      },
      options: donutOptions(),
    }));
  }

  const cumulativeCanvas = document.getElementById('matCumulChart');
  if (cumulativeCanvas) {
    let running = 0;
    const cumulative = values.map((value) => {
      running += value;
      return Number.parseFloat(running.toFixed(2));
    });
    transactionCharts.push(new Chart(cumulativeCanvas.getContext('2d'), {
      type: 'line',
      data: {
        labels: years,
        datasets: [{ label: 'Cumulative (Rs Cr)', data: cumulative, borderColor: '#1565c0', backgroundColor: 'rgba(21,101,192,.08)', borderWidth: 2, fill: true, tension: 0.3, pointBackgroundColor: '#1565c0', pointRadius: 4 }],
      },
      options: commonOptions(),
    }));
  }

  const runwayCanvas = document.getElementById('matRunwayChart');
  if (runwayCanvas) {
    const total = values.reduce((sum, value) => sum + value, 0) || 1;
    let running = 0;
    const runway = values.map((value) => {
      running += value;
      return Number.parseFloat(((total - running) / total * 100).toFixed(1));
    });
    transactionCharts.push(new Chart(runwayCanvas.getContext('2d'), {
      type: 'line',
      data: {
        labels: years,
        datasets: [{ label: '% of Book Still Outstanding', data: runway, borderColor: '#1e88e5', backgroundColor: 'rgba(30,136,229,.09)', borderWidth: 2.5, fill: true, tension: 0.4, pointBackgroundColor: colors, pointRadius: 5 }],
      },
      options: commonOptions({
        plugins: { legend: { display: false }, tooltip: tooltipCfg('%') },
        scales: {
          x: { grid: { display: false }, ticks: { font: { size: 10 }, color: '#6a9cbf' } },
          y: { min: 0, max: 100, grid: { color: '#eaf3fb' }, border: { color: 'transparent' }, ticks: { font: { size: 10 }, color: '#6a9cbf', callback: (value) => `${value}%` } },
        },
      }),
    }));
  }

  const table = document.getElementById('matTable');
  if (table) {
    let cumulative = 0;
    table.innerHTML = years.map((year, index) => {
      const value = values[index];
      cumulative += value;
      const pct = value / (values.reduce((sum, item) => sum + item, 0) || 1) * 100;
      const bucket = year <= '2026' ? 'Short-term' : year <= '2029' ? 'Medium-term' : 'Long-term';
      const cls = year <= '2026' ? 'red' : year <= '2029' ? 'yellow' : 'blue';
      const action = year <= '2026' ? 'Immediate' : year <= '2029' ? 'Plan ahead' : 'Stable';
      return `<tr><td>${year}</td><td>${value.toFixed(2)} Cr</td><td>${pct.toFixed(1)}%</td><td>${cumulative.toFixed(2)} Cr</td><td><span class="spill ${cls}">${bucket}</span></td><td>${action}</td></tr>`;
    }).join('');
  }
}

function switchMatChart(mode) {
  if (!matChartInst) return;
  if (mode === 'line') {
    matChartInst.config.type = 'line';
    matChartInst.data.datasets[0].fill = true;
    matChartInst.data.datasets[0].tension = 0.3;
    matChartInst.data.datasets[0].borderColor = '#1565c0';
    matChartInst.data.datasets[0].backgroundColor = 'rgba(21,101,192,.08)';
  } else {
    const years = Object.keys(MAT).sort();
    const colors = years.map((year) => year <= '2026' ? '#e53935' : year <= '2029' ? '#fb8c00' : '#1565c0');
    matChartInst.config.type = 'bar';
    matChartInst.data.datasets[0].backgroundColor = colors.map((color) => `${color}26`);
    matChartInst.data.datasets[0].borderColor = colors;
    matChartInst.data.datasets[0].fill = false;
  }
  matChartInst.update();
}

function renderTxnTable() {
  const unit = document.getElementById('txnUnitFilter')?.value || 'raw';
  const total = txnFiltered.length;
  const pages = Math.max(1, Math.ceil(total / txnPerPage));
  if (txnPage > pages) txnPage = pages;
  const start = (txnPage - 1) * txnPerPage;
  const slice = txnFiltered.slice(start, start + txnPerPage);

  const countLabel = document.getElementById('txnCountLabel');
  if (countLabel) {
    // countLabel.textContent = `Showing ${total ? start + 1 : 0}–${Math.min(start + txnPerPage, total)} of ${total}`;
  }

  const tbody = document.getElementById('txnTbody');
  if (!tbody) return;

  tbody.innerHTML = slice.map((row) => {
    const rateBadge = row[6] === 'Fixed' ? '<span class="spill blue">Fixed</span>' : '<span class="spill teal">Float</span>';
    const txnLink = row[4] ? `<a class="txn-hotspot" href="javascript:void(0)" data-txn="${row[4]}">${row[4]}</a>` : '&mdash;';
    return `<tr><td>${row[0]}</td><td style="max-width:160px;overflow:hidden;text-overflow:ellipsis" title="${row[1]}">${row[1]}</td><td>${row[2]}</td><td>${row[3]}</td><td>${txnLink}</td><td style="max-width:140px;overflow:hidden;text-overflow:ellipsis" title="${row[5]}">${row[5]}</td><td>${rateBadge}</td><td>${row[7]}</td><td>${row[8]}</td><td style="text-align:right">${fmtAmt(row[9], unit)}</td><td style="text-align:right">${fmtAmt(row[10], unit)}</td><td style="text-align:right">${fmtAmt(row[11], unit)}</td><td style="text-align:right;font-weight:600;color:var(--blue-dark)">${fmtAmt(row[12], unit)}</td><td style="text-align:right">${row[13]}</td><td style="text-align:right">${fmtAmt(row[14], unit)}</td><td style="text-align:right">${row[15]}</td><td>${row[16]}</td></tr>`;
  }).join('') || '<tr><td colspan="17" style="text-align:center;padding:24px;color:var(--text-muted)">No transactions match the current filters.</td></tr>';

  tbody.querySelectorAll('.txn-hotspot').forEach((link) => {
    link.addEventListener('click', () => callFtrEdit(link.dataset.txn));
  });

  const pageInfo = document.getElementById('txnPgInfo');
  if (pageInfo) {
    pageInfo.textContent = `Page ${txnPage} of ${pages}`;
  }

  const buttons = document.getElementById('txnPgBtns');
  if (!buttons) return;

  let markup = `<button class="txn-pg-btn" data-page="1" ${txnPage <= 1 ? 'disabled' : ''}>&laquo;</button>`;
  markup += `<button class="txn-pg-btn" data-page="${txnPage - 1}" ${txnPage <= 1 ? 'disabled' : ''}>&lsaquo;</button>`;
  const low = Math.max(1, txnPage - 2);
  const high = Math.min(pages, txnPage + 2);
  for (let page = low; page <= high; page += 1) {
    markup += `<button class="txn-pg-btn${page === txnPage ? ' active' : ''}" data-page="${page}">${page}</button>`;
  }
  markup += `<button class="txn-pg-btn" data-page="${txnPage + 1}" ${txnPage >= pages ? 'disabled' : ''}>&rsaquo;</button>`;
  markup += `<button class="txn-pg-btn" data-page="${pages}" ${txnPage >= pages ? 'disabled' : ''}>&raquo;</button>`;
  buttons.innerHTML = markup;
  buttons.querySelectorAll('[data-page]').forEach((button) => {
    button.addEventListener('click', () => goTxnPage(Number.parseInt(button.dataset.page, 10)));
  });
}

function filterTxns() {
  const query = (document.getElementById('txnSearch')?.value || '').toLowerCase();
  const productFilter = document.getElementById('txnPrdFilter')?.value || '';
  const rateFilter = document.getElementById('txnRateFilter')?.value || '';
  const portfolioFilter = document.getElementById('txnPortFilter')?.value || '';

  txnFiltered = TXN_DATA.filter((row) => {
    if (query && !row[0].toLowerCase().includes(query) && !row[1].toLowerCase().includes(query) && !row[5].toLowerCase().includes(query) && !row[4].toLowerCase().includes(query)) {
      return false;
    }
    if (productFilter && row[0] !== productFilter) return false;
    if (rateFilter && row[6] !== rateFilter) return false;
    if (portfolioFilter === '1000' && row[16] !== 'Secured Liability') return false;
    if (portfolioFilter === '2000' && row[16] !== 'Unsecured Liability') return false;
    if (portfolioFilter === 'other' && row[16] !== 'Other') return false;
    return true;
  });

  txnPage = 1;
  renderTxnTable();
}

function clearTxnFilters() {
  const ids = ['txnSearch', 'txnPrdFilter', 'txnRateFilter', 'txnPortFilter'];
  ids.forEach((id) => {
    const element = document.getElementById(id);
    if (element) element.value = '';
  });
  filterTxns();
}

function sortTxns(column) {
  if (txnSortCol === column) txnSortDir *= -1;
  else {
    txnSortCol = column;
    txnSortDir = 1;
  }

  txnFiltered.sort((left, right) => {
    const a = left[column];
    const b = right[column];
    if (typeof a === 'number' && typeof b === 'number') {
      return (a - b) * txnSortDir;
    }
    return String(a).localeCompare(String(b)) * txnSortDir;
  });

  document.querySelectorAll('.txn-table th').forEach((header, index) => {
    header.classList.remove('sort-asc', 'sort-desc');
    if (index === column) {
      header.classList.add(txnSortDir === 1 ? 'sort-asc' : 'sort-desc');
    }
  });

  renderTxnTable();
}

function goTxnPage(page) {
  txnPage = page;
  renderTxnTable();
}

function renderTxnCharts() {
  const productCount = {};
  TXN_DATA.forEach((row) => {
    const key = row[1] || row[0];
    productCount[key] = (productCount[key] || 0) + 1;
  });

  const productKeys = Object.keys(productCount).sort((left, right) => productCount[right] - productCount[left]);
  const productCanvas = document.getElementById('txnProdCountChart');
  if (productCanvas) {
    transactionCharts.push(new Chart(productCanvas.getContext('2d'), {
      type: 'bar',
      data: {
        labels: productKeys.map((key) => key.replace(/^Issue:\s*/i, '').slice(0, 14)),
        datasets: [{
          label: 'Count',
          data: productKeys.map((key) => productCount[key]),
          backgroundColor: COLORS.slice(0, productKeys.length).map((color) => cc(color)),
          borderColor: COLORS.slice(0, productKeys.length),
          borderWidth: 1.5,
          borderRadius: 4,
        }],
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: tooltipCfg('') },
        scales: {
          x: { grid: { color: '#eaf3fb' }, border: { color: 'transparent' }, ticks: { font: { size: 10 }, color: '#6a9cbf' } },
          y: { grid: { display: false }, ticks: { font: { size: 8 }, color: '#6a9cbf' } },
        },
      },
    }));
  }

  const fixedCount = TXN_DATA.filter((row) => row[6] === 'Fixed').length;
  const floatCount = TXN_DATA.filter((row) => row[6] === 'Floating').length;
  const rateCanvas = document.getElementById('txnRateDonut');
  if (rateCanvas) {
    transactionCharts.push(new Chart(rateCanvas.getContext('2d'), {
      type: 'doughnut',
      data: {
        labels: [`Fixed (${fixedCount})`, `Floating (${floatCount})`],
        datasets: [{ data: [fixedCount, floatCount], backgroundColor: ['#1565c0', '#0288d1'], borderWidth: 0 }],
      },
      options: {
        ...donutOptions(),
        plugins: {
          ...donutOptions().plugins,
          legend: { display: true, position: 'bottom', labels: { font: { size: 10 }, color: '#2e6090', padding: 10 } },
        },
      },
    }));
  }

  const buckets = { '<7%': 0, '7–7.5%': 0, '7.5–8%': 0, '8–8.5%': 0, '>8.5%': 0 };
  TXN_DATA.forEach((row) => {
    const eir = Number.parseFloat(row[15]);
    if (Number.isNaN(eir)) return;
    if (eir < 7.0) buckets['<7%'] += 1;
    else if (eir < 7.5) buckets['7–7.5%'] += 1;
    else if (eir < 8.0) buckets['7.5–8%'] += 1;
    else if (eir < 8.5) buckets['8–8.5%'] += 1;
    else buckets['>8.5%'] += 1;
  });

  const eirCanvas = document.getElementById('txnEirDist');
  if (eirCanvas) {
    const labels = Object.keys(buckets);
    transactionCharts.push(new Chart(eirCanvas.getContext('2d'), {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Transactions',
          data: labels.map((label) => buckets[label]),
          backgroundColor: ['#0288d126', '#1565c026', '#00acc126', '#fb8c0026', '#e5393526'],
          borderColor: ['#0288d1', '#1565c0', '#00acc1', '#fb8c00', '#e53935'],
          borderWidth: 1.5,
          borderRadius: 5,
        }],
      },
      options: commonOptions({ plugins: { legend: { display: false }, tooltip: tooltipCfg('') } }),
    }));
  }
}

function initTransactions() {
  txnFiltered = TXN_DATA.slice();
  renderTxnTable();
  if (!txnChartsInited) {
    renderTxnCharts();
    txnChartsInited = true;
  }
}

function callFtrEdit(txnNumber) {
  ftrCurrentRow = TXN_DATA.find((row) => String(row[4]).trim() === String(txnNumber).trim()) || null;
  setText('ftrTxnNo', txnNumber || '—');
  setText('ftrTxnDesc', ftrCurrentRow ? `${String(ftrCurrentRow[1]).replace(/^Issue:\s*/i, '')}${ftrCurrentRow[5] ? ` · ${ftrCurrentRow[5]}` : ''}` : 'Loading...');
  const info = document.getElementById('ftrTxnInfo');
  if (info) {
    const pills = [
      ['Product Type', ftrCurrentRow?.[0] || '—'],
      ['Rate Type', ftrCurrentRow?.[6] || '—'],
      ['Counterparty', ftrCurrentRow?.[5] || '—'],
      ['Portfolio', ftrCurrentRow?.[16] || '—'],
      ['Start Date', ftrCurrentRow?.[7] || '—'],
      ['End Date', ftrCurrentRow?.[8] || '—'],
    ];
    info.innerHTML = pills.map(([label, value]) => `<div class="ftr-modal-pill"><div class="ftr-modal-pill-lbl">${label}</div><div class="ftr-modal-pill-val">${value}</div></div>`).join('');
  }
  document.getElementById('ftrModalOverlay')?.classList.add('show');
  document.body.style.overflow = 'hidden';
}

function openFtrEdit() {
  if (!ftrCurrentRow) return;
  const txnNumber = String(ftrCurrentRow[4] || '').trim();
  if (!txnNumber) {
    closeFtrModal();
    return;
  }
  const url = `${window.location.origin}/sap/bc/gui/sap/its/webgui?~transaction=FTR_EDIT&OBJECT_ID=${encodeURIComponent(txnNumber)}`;
  window.open(url, '_blank', 'noopener');
  closeFtrModal();
}

function closeFtrModal(event) {
  const overlay = document.getElementById('ftrModalOverlay');
  if (!overlay) return;
  if (event && event.target !== overlay) return;
  overlay.classList.remove('show');
  document.body.style.overflow = '';
  ftrCurrentRow = null;
}

let restorePrintSnapshots = null;

async function initAllPagesForPrint() {
  // Tear down any existing chart instances
  destroyAllCharts();

  // Override CSS so every page is visible — canvases need real dimensions to render
  document.querySelectorAll('.page').forEach(p => {
    p.style.display = 'block';
  });

  // Let the browser lay out all pages so canvases get actual pixel sizes
  await new Promise(r => setTimeout(r, 200));

  // Re-initialise charts for every page
  initOverview();
  initAnalytics();
  initPortfolio();
  initMaturity();
  initTransactions();

  // Wait for Chart.js animation frames to finish drawing
  await new Promise(r => setTimeout(r, 800));
}

async function snapshotVisibleCanvasesForPrint() {
  const swaps = [];
  const canvases = Array.from(document.querySelectorAll('canvas'));

  for (const canvas of canvases) {
    try {
      const data = canvas.toDataURL();

      if (!data || data === "data:,") continue;

      const image = document.createElement('img');
      image.src = data;
      image.className = 'print-chart-snapshot';
      image.style.width = canvas.clientWidth + 'px';
      image.style.height = canvas.clientHeight + 'px';

      const parent = canvas.parentNode;
      parent.replaceChild(image, canvas);

      swaps.push({ canvas, image });

    } catch {}
  }

  return () => {
    swaps.forEach(({ canvas, image }) => {
      if (image.parentNode) {
        image.parentNode.replaceChild(canvas, image);
      }
    });
  };
}

async function exportPDF() {
  const activePageEl = document.querySelector('.page.active');
  const activePageId = activePageEl?.id?.replace('page-', '') || 'overview';

  const overlay = document.getElementById('exportOverlay');
  const expText = document.getElementById('expText');
  const show = (msg) => {
    if (overlay) overlay.style.display = 'flex';
    if (expText) expText.textContent = msg;
  };
  const hide = () => { if (overlay) overlay.style.display = 'none'; };

  const theme   = document.documentElement.getAttribute('data-theme') || 'light';
  const bgColor = theme === 'dark' ? '#0a1628' : '#eaf3fb';

  const PAGES = ['overview', 'analytics', 'portfolio', 'maturity', 'lenders', 'transactions'];
  const A4W = 210, A4H = 297, MAR = 6;

  show('Preparing export…');

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
  const contentW = A4W - MAR * 2;
  const contentH = A4H - MAR * 2;
  let firstPage = true;

  for (let p = 0; p < PAGES.length; p++) {
    const pageId = PAGES[p];
    show(`Capturing "${pageId}"  (${p + 1} / ${PAGES.length})…`);

    // Destroy charts and cancel any pending timers
    destroyAllCharts();
    if (activateTimer) { clearTimeout(activateTimer); activateTimer = null; }

    const pageSection = document.getElementById(`page-${pageId}`);
    if (!pageSection) continue;

    // Show this page, hide others
    document.querySelectorAll('.page').forEach(el => {
      el.style.display    = el.id === `page-${pageId}` ? 'block' : 'none';
      el.style.opacity    = '1';
      el.style.visibility = 'visible';
    });

    // Re-init charts for this page
    await new Promise(r => setTimeout(r, 80));
    if      (pageId === 'overview')     initOverview();
    else if (pageId === 'analytics')    initAnalytics();
    else if (pageId === 'portfolio')    initPortfolio();
    else if (pageId === 'maturity')     initMaturity();
    else if (pageId === 'transactions') initTransactions();

    // Wait for charts to fully render
    await new Promise(r => setTimeout(r, 1200));

    // Build a temp container: header clone + page clone
    const header = document.querySelector('header');
    const wrapper = document.querySelector('.wrapper');

    const captureEl = document.createElement('div');
    captureEl.style.cssText = `
      background: ${bgColor};
      width: ${wrapper ? wrapper.offsetWidth : 1400}px;
      padding: 0 28px 48px 28px;
      box-sizing: border-box;
      position: fixed;
      top: 0;
      left: -9999px;
      z-index: -1;
    `;

    if (header) {
      const headerClone = header.cloneNode(true);
      captureEl.appendChild(headerClone);
    }

    const pageClone = pageSection.cloneNode(true);
    pageClone.style.display    = 'block';
    pageClone.style.visibility = 'visible';
    pageClone.style.opacity    = '1';
    captureEl.appendChild(pageClone);

    document.body.appendChild(captureEl);

    // Copy canvas pixel data into cloned canvases
    const origCanvases   = Array.from(pageSection.querySelectorAll('canvas'));
    const clonedCanvases = Array.from(pageClone.querySelectorAll('canvas'));
    origCanvases.forEach((orig, i) => {
      const clone = clonedCanvases[i];
      if (!clone || !orig.width || !orig.height) return;
      clone.width  = orig.width;
      clone.height = orig.height;
      try {
        const ctx = clone.getContext('2d');
        if (ctx) ctx.drawImage(orig, 0, 0);
      } catch (_) {}
    });

    // Wait for cloned element to be laid out
    await new Promise(r => setTimeout(r, 100));

    let dataUrl;
    try {
      const scale = 2;
      dataUrl = await domtoimage.toPng(captureEl, {
        width : captureEl.scrollWidth  * scale,
        height: captureEl.scrollHeight * scale,
        style : {
          transform      : `scale(${scale})`,
          transformOrigin: 'top left',
          background     : bgColor,
        },
        filter: (node) => {
          if (node.tagName === 'LINK' && node.href && node.href.includes('fonts.googleapis.com')) {
            return false;
          }
          return true;
        },
      });
    } catch (err) {
      console.error(`[exportPDF] capture failed for "${pageId}":`, err);
      document.body.removeChild(captureEl);
      continue;
    }

    // Remove temp element
    document.body.removeChild(captureEl);

    // Load image to get dimensions
    const imgSize = await new Promise(resolve => {
      const img = new Image();
      img.onload = () => resolve({ w: img.width, h: img.height });
      img.src = dataUrl;
    });

    // Slice into A4 strips
    const pxPerMm   = imgSize.w / contentW;
    const stripH_px = contentH * pxPerMm;
    const strips    = Math.ceil(imgSize.h / stripH_px);

    for (let s = 0; s < strips; s++) {
      if (!firstPage) pdf.addPage();
      firstPage = false;

      const yStart   = s * stripH_px;
      const bandH_px = Math.min(stripH_px, imgSize.h - yStart);

      const strip = document.createElement('canvas');
      strip.width  = imgSize.w;
      strip.height = bandH_px;
      const ctx = strip.getContext('2d');
      const img = new Image();
      await new Promise(resolve => {
        img.onload = () => {
          ctx.drawImage(img, 0, yStart, imgSize.w, bandH_px, 0, 0, imgSize.w, bandH_px);
          resolve();
        };
        img.src = dataUrl;
      });

      pdf.addImage(
        strip.toDataURL('image/jpeg', 0.95),
        'JPEG', MAR, MAR,
        contentW, bandH_px / pxPerMm,
        undefined, 'FAST'
      );
    }
  }

  // Restore original page
  document.querySelectorAll('.page').forEach(el => {
    el.style.display    = '';
    el.style.opacity    = '';
    el.style.visibility = '';
  });
  destroyAllCharts();
  if (activateTimer) { clearTimeout(activateTimer); activateTimer = null; }
  activateDashboardPage(activePageId);
  hide();

  const ts = new Date().toISOString().slice(0, 16).replace('T', '_').replace(':', '');
  pdf.save(`COF_Analytics_${ts}.pdf`);
}


function toggleDark() {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  document.documentElement.setAttribute('data-theme', isDark ? 'light' : 'dark');
  window.localStorage.setItem('cof-theme', isDark ? 'light' : 'dark');
}

function bindGlobals() {
  window.Chart = Chart;
  window.switchOvChart = switchOvChart;
  window.switchPortChart = switchPortChart;
  window.switchMatChart = switchMatChart;
  window.filterTxns = filterTxns;
  window.renderTxnTable = renderTxnTable;
  window.clearTxnFilters = clearTxnFilters;
  window.sortTxns = sortTxns;
  window.goTxnPage = goTxnPage;
  window.callFtrEdit = callFtrEdit;
  window.openFtrEdit = openFtrEdit;
  window.closeFtrModal = closeFtrModal;
  window.exportPDF = exportPDF;
  window.toggleDark = toggleDark;
}

export function renderDashboard(reportPayload) {
  applyRenderState(reportPayload?.render_state || {});
  fillTokens();
    activateDashboardPage('overview');
  window.setTimeout(animateProgs, 200);

  const loadingScreen = document.getElementById('loadingScreen');
  if (loadingScreen) {
    loadingScreen.style.opacity = '0';
    window.setTimeout(() => {
      loadingScreen.style.display = 'none';
    }, 420);
  }

  return { products: PRODUCTS.length, lenders: LENDERS.length, apiUrl: API_URL };
}

export function activateDashboardPage(page) {
  destroyAllCharts();

  // Cancel any pending init from a previous call
  if (activateTimer) {
    clearTimeout(activateTimer);
    activateTimer = null;
  }

  activateTimer = setTimeout(() => {
    activateTimer = null;
    if (page === 'lenders') return;
    if (page === 'analytics')    { initAnalytics();    return; }
    if (page === 'portfolio')    { initPortfolio();    return; }
    if (page === 'maturity')     { initMaturity();     return; }
    if (page === 'transactions') { initTransactions(); return; }
    initOverview();
  }, 100);
}

export function bootCofDashboard(reportPayload) {
  bindGlobals();
  const theme = window.localStorage.getItem('cof-theme') || document.documentElement.getAttribute('data-theme') || 'light';
  document.documentElement.setAttribute('data-theme', theme);
  // window.exportPDF = exportPDFUtil;
  return renderDashboard(reportPayload || { render_state: {} });
}