function toNumber(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function formatRoundedCrores(value) {
  return `Rs ${Math.round(toNumber(value) / 1e7)} Cr`;
}

export function AnalyticsPage({ isActive = false, totals = {} }) {
  const totalAccrual = toNumber(totals.lv_total_acc);
  const totalWtAvg = toNumber(totals.lv_total_wt);
  const totalAvgFunds = toNumber(totals.lv_total_af);
  const totalIntEir = toNumber(totals.lv_total_ia);

  return (
    <div className={`page ${isActive ? 'active' : ''}`} id="page-analytics">
      <div className="section-label">Amount KPIs — Aggregated Across All Products</div>
      <div className="an-kpi-grid">
        <div className="an-kpi a1">
          <div className="an-kpi-top">
            <div className="an-kpi-icon a1">📈</div>
            <span className="an-kpi-tag blue">Period</span>
          </div>
          <div className="an-kpi-lbl">Total Accrual Amt</div>
          <div className="an-kpi-val a1" id="anAccKpi">
            {totalAccrual > 0 ? formatRoundedCrores(totalAccrual) : '—'}
          </div>
          <div className="an-kpi-sub">Aggregate interest accrual — all product types</div>
        </div>

        <div className="an-kpi a2">
          <div className="an-kpi-top">
            <div className="an-kpi-icon a2">⚖</div>
            <span className="an-kpi-tag sky">Wt Avg</span>
          </div>
          <div className="an-kpi-lbl">Total Wt Avg Amount</div>
          <div className="an-kpi-val a2" id="anWtKpi">
            {totalWtAvg > 0 ? formatRoundedCrores(totalWtAvg) : '—'}
          </div>
          <div className="an-kpi-sub">Weighted average outstanding balance</div>
        </div>

        <div className="an-kpi a3">
          <div className="an-kpi-top">
            <div className="an-kpi-icon a3">💰</div>
            <span className="an-kpi-tag teal">Avg Funds</span>
          </div>
          <div className="an-kpi-lbl">Total Avg Funds Wt</div>
          <div className="an-kpi-val a3" id="anAfKpi">
            {totalAvgFunds > 0 ? formatRoundedCrores(totalAvgFunds) : '—'}
          </div>
          <div className="an-kpi-sub">Weighted average funds deployed</div>
        </div>

        <div className="an-kpi a4">
          <div className="an-kpi-top">
            <div className="an-kpi-icon a4">💵</div>
            <span className="an-kpi-tag orange">EIR Basis</span>
          </div>
          <div className="an-kpi-lbl">Total Int Amt-EIR</div>
          <div className="an-kpi-val a4" id="anIntKpi">
            {totalIntEir > 0 ? formatRoundedCrores(totalIntEir) : '—'}
          </div>
          <div className="an-kpi-sub">Weighted interest amount on EIR basis</div>
        </div>
      </div>

      <div className="section-label">Amount Metrics by Product — Rs (Crores)</div>
      <div className="an-grid-2">
        <div className="card">
          <div className="card-title">
            Accrual Amount <span className="card-badge">Rs (Cr) • BY PRODUCT</span>
          </div>
          <div className="chart-wrap h280">
            <canvas id="anAccrual" />
          </div>
        </div>
        <div className="card">
          <div className="card-title">
            Wt Avg Amount <span className="card-badge">Rs (Cr) • BY PRODUCT</span>
          </div>
          <div className="chart-wrap h280">
            <canvas id="anWtAvg" />
          </div>
        </div>
      </div>

      <div className="an-grid-2">
        <div className="card">
          <div className="card-title">
            Avg Funds Wt <span className="card-badge">Rs (Cr) • BY PRODUCT</span>
          </div>
          <div className="chart-wrap h280">
            <canvas id="anAvgFunds" />
          </div>
        </div>
        <div className="card">
          <div className="card-title">
            Int Amt-EIR <span className="card-badge">Rs (Cr) • BY PRODUCT</span>
          </div>
          <div className="chart-wrap h280">
            <canvas id="anIntAmt" />
          </div>
        </div>
      </div>

      <div className="section-label">Rate Metrics by Product — Average % Per Annum</div>
      <div className="an-grid-2">
        <div className="card">
          <div className="card-title">
            Open EIR vs Exit EIR <span className="card-badge">WAVE AREA — %</span>
          </div>
          <div className="chart-wrap h280">
            <canvas id="anOpenExit" />
          </div>
        </div>
        <div className="card">
          <div className="card-title">
            Avg Rate-EIR vs Avg Rate-EIR (PAPM) <span className="card-badge">WAVE AREA — %</span>
          </div>
          <div className="chart-wrap h280">
            <canvas id="anAvgRate" />
          </div>
        </div>
      </div>

      <div className="an-grid-2">
        <div className="card">
          <div className="card-title">
            Accrual Yield % by Product <span className="card-badge">ACCRUAL ÷ WT AVG × 100</span>
          </div>
          <div className="chart-wrap h280">
            <canvas id="anYieldPct" />
          </div>
        </div>
        <div className="card">
          <div className="card-title">
            EIR Movement (Open→Exit) <span className="card-badge">BASIS POINTS · TEAL=RISE · RED=FALL</span>
          </div>
          <div className="chart-wrap h280">
            <canvas id="anEirDelta" />
          </div>
        </div>
      </div>
    </div>
  );
}
