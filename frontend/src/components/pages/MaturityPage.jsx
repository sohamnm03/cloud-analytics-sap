import { useState } from 'react';

function toNumber(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function formatCrores(value) {
  const crores = toNumber(value) / 1e7;
  return `${crores.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} Cr`;
}

export function MaturityPage({ isActive = false, totals = {} }) {
  const [chartMode, setChartMode] = useState('bar');
  const totalBook = toNumber(totals.lv_total_b);
  const mat2026 = toNumber(totals.lv_mat_2026);
  const matMed = toNumber(totals.lv_mat_med);
  const matLong = toNumber(totals.lv_mat_long);
  const peakYear = String(totals.lv_peak_yr || '—');
  const peakBook = toNumber(totals.lv_peak_b);

  const pct2026 = totalBook > 0 ? (mat2026 / totalBook) * 100 : 0;
  const pctMed = totalBook > 0 ? (matMed / totalBook) * 100 : 0;
  const pctLong = totalBook > 0 ? (matLong / totalBook) * 100 : 0;
  const pctPeak = totalBook > 0 ? (peakBook / totalBook) * 100 : 0;

  return (
    <div className={`page ${isActive ? 'active' : ''}`} id="page-maturity">

    <div class="section-label">Maturity Profile KPIs</div>
    <div class="kpi-grid">

      <div class="kpi-card c1">
        <div class="kpi-body">
          <div class="kpi-top">
            <div class="kpi-icon-wrap"><svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/></svg></div>
            <span class="kpi-badge down">Expired</span>
          </div>
          <div class="kpi-label">Matured / Due 2025</div>
          <div class="kpi-value">₹1.45</div>
          <div class="kpi-sub">O/S balance from facilities maturing 2025</div>
          <div class="kpi-spark"><div class="kpi-spark-fill" data-w="3.9"></div></div>
          <div class="kpi-divider"></div>
          <div class="kpi-footer"><div class="kpi-footer-dot"></div><span><strong>1.5%</strong> of total book (Mahindra Overdraft)</span></div>
        </div>
      </div>

      <div class="kpi-card c2">
        <div class="kpi-body">
          <div class="kpi-top">
            <div class="kpi-icon-wrap"><svg viewBox="0 0 24 24"><path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z"/></svg></div>
            <span class="kpi-badge warn">Peak</span>
          </div>
          <div class="kpi-label">Largest Maturity Year</div>
          <div class="kpi-value">2030</div>
          <div class="kpi-sub">Highest single-year O/S redemption volume</div>
          <div class="kpi-spark"><div class="kpi-spark-fill" data-w="100"></div></div>
          <div class="kpi-divider"></div>
          <div class="kpi-footer"><div class="kpi-footer-dot"></div><span>₹<strong>37.50</strong> Cr &middot; <strong>39.7%</strong> of book</span></div>
        </div>
      </div>

      <div class="kpi-card c3">
        <div class="kpi-body">
          <div class="kpi-top">
            <div class="kpi-icon-wrap"><svg viewBox="0 0 24 24"><path d="M13 2.05v6.02c3.95.49 7 3.85 7 7.93 0 3.21-1.81 6-4.72 7.72L13 17v5h5l-1.22-1.22C19.91 19.07 22 15.76 22 12c0-5.18-3.95-9.45-9-9.95z"/></svg></div>
            <span class="kpi-badge up">Spread</span>
          </div>
          <div class="kpi-label">Maturity Horizon</div>
          <div class="kpi-value">6 Yrs</div>
          <div class="kpi-sub">Book spread across 2025 through 2031</div>
          <div class="kpi-spark"><div class="kpi-spark-fill" data-w="55"></div></div>
          <div class="kpi-divider"></div>
          <div class="kpi-footer"><div class="kpi-footer-dot"></div><span><strong>2025</strong> earliest &middot; <strong>2031</strong> latest maturity</span></div>
        </div>
      </div>
      <div class="kpi-card c4">
        <div class="kpi-body">
          <div class="kpi-top">
            <div class="kpi-icon-wrap"><svg viewBox="0 0 24 24"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2z"/></svg></div>
            <span class="kpi-badge up">Stable</span>
          </div>
          <div class="kpi-label">Long-dated (2029+)</div>
          <div class="kpi-value">₹75.50</div>
          <div class="kpi-sub">Facilities maturing 2029 and beyond</div>
          <div class="kpi-spark"><div class="kpi-spark-fill" data-w="79.9"></div></div>
          <div class="kpi-divider"></div>
          <div class="kpi-footer"><div class="kpi-footer-dot"></div><span><strong>79.9%</strong> of total book long-dated</span></div>
        </div>
      </div>

    </div>

    <div class="section-label">O/S Exposure by Maturity — Grouped &amp; Proportional</div>
    <div class="two-col">
      <div class="chart-card">
        <div class="chart-header"><div><div class="chart-title">O/S vs Sanctioned by Maturity Year</div><div class="chart-subtitle">GROUPED BAR · OUTSTANDING VS SANCTION PER YEAR</div></div></div>
        <div class="chart-wrap h260"><canvas id="matOsSancGrouped"></canvas></div>
      </div>
      <div class="chart-card">
        <div class="chart-header"><div><div class="chart-title">O/S % Share per Maturity Bucket</div><div class="chart-subtitle">PROPORTION OF TOTAL BOOK PER YEAR</div></div></div>
        <div class="chart-wrap h260"><canvas id="matOsShareLine"></canvas></div>
      </div>
    </div>
    <div class="section-label">Exposure Rundown &amp; Redemption Risk</div>
    <div class="three-col">
      <div class="chart-card">
        <div class="chart-header"><div><div class="chart-title">Annual Redemption vs Book</div><div class="chart-subtitle">O/S MATURING AS % OF TOTAL BOOK</div></div></div>
        <div class="chart-wrap h220"><canvas id="matRedemptionPct"></canvas></div>
      </div>
      <div class="chart-card">
        <div class="chart-header"><div><div class="chart-title">Remaining Book After Maturity</div><div class="chart-subtitle">BOOK OUTSTANDING AFTER EACH YEAR'S REDEMPTION</div></div></div>
        <div class="chart-wrap h220"><canvas id="matResidualBar"></canvas></div>
      </div>
      <div class="chart-card">
        <div class="chart-header"><div><div class="chart-title">Sanction Utilisation by Year</div><div class="chart-subtitle">O/S ÷ SANCTION % · DRAW-DOWN PER COHORT</div></div></div>
        <div class="chart-wrap h220"><canvas id="matUtilByYear"></canvas></div>
      </div>
    </div>
    <div class="section-label">Annual Maturity Profile</div>
    <div class="two-col">
      <div class="chart-card">
        <div class="chart-header">
          <div><div class="chart-title">Annual Maturities — O/S Balance (Rs Cr)</div><div class="chart-subtitle">2025–2031 · COLOR CODED BY BUCKET</div></div>
          <div class="chart-tabs">
            <button class="tab active" onclick="switchMatChart('bar',this)">Bar</button>
            <button class="tab" onclick="switchMatChart('line',this)">Line</button>
          </div>
        </div>
        <div class="chart-wrap h280"><canvas id="matMainChart"></canvas></div>
      </div>
      {/* <div class="chart-card">
        <div class="chart-header"><div><div class="chart-title">Maturity Bucket Distribution</div><div class="chart-subtitle">SHORT / MEDIUM / LONG TERM</div></div></div>
        <div class="chart-wrap h200"><canvas id="matBucketDonut"></canvas></div>
        <div class="donut-legend" style="margin-top:12px;">
          <div class="legend-row"><div class="legend-dot" style="background:#e53935;"></div><div class="legend-label">Short (2025–26)</div><div class="legend-val">₹6.85 Cr</div><div class="legend-pct">7.2%</div></div>
          <div class="legend-row"><div class="legend-dot" style="background:#fb8c00;"></div><div class="legend-label">Medium (2027–28)</div><div class="legend-val">₹12.20 Cr</div><div class="legend-pct">12.9%</div></div>
          <div class="legend-row"><div class="legend-dot" style="background:#1565c0;"></div><div class="legend-label">Long (2029+)</div><div class="legend-val">₹75.50 Cr</div><div class="legend-pct">79.9%</div></div>
        </div>
      </div> */}
    </div>
    <div class="section-label">Cumulative Maturity</div>
    <div class="two-col">
      <div class="chart-card"><div class="chart-header"><div><div class="chart-title">Cumulative Maturity Curve</div><div class="chart-subtitle">RUNNING TOTAL · Rs (Crores)</div></div></div><div class="chart-wrap h240"><canvas id="matCumulChart"></canvas></div></div>
      <div class="card">
        <div class="card-title">Year-by-Year Maturity Schedule <span class="card-badge">2025–2031</span></div>
        <table class="data-table">
          <thead><tr><th>Year</th><th>O/S Amt (Cr)</th><th>Sanction (Cr)</th><th>% of Total</th><th>Bucket</th><th>Priority</th></tr></thead>
          <tbody id="matTable"></tbody>
        </table>
      </div>
    </div>
    </div>
  );
}
