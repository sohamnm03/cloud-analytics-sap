import { useEffect, useState } from "react";

function toNumber(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

export function TransactionsPage({ isActive = false, totals = {}, transactions = [] }) {
useEffect(() => {
  if (isActive && transactions.length > 0) {
    setTimeout(() => {
      window.activateDashboardPage?.("transactions");
    }, 100);
  }
}, [isActive, transactions]);
  const transactionCount = Array.isArray(transactions) ? transactions.length : 0;
  const uniqueCounterparties = Array.isArray(transactions)
    ? new Set(transactions.map((row) => row?.[5]).filter(Boolean)).size
    : 0;
  const avgDays = Array.isArray(transactions) && transactions.length
    ? Math.round(
      transactions.reduce((sum, row) => sum + toNumber(row?.[13]), 0) / transactions.length,
    )
    : 0;
  const productCount = toNumber(totals.lv_prd_cnt);

  return (
    <div className={`page ${isActive ? 'active' : ''}`} id="page-transactions">

      {/* ── 1. Transaction Summary KPIs ── */}
    <div class="section-label">Transaction Summary KPIs</div>
    <div class="kpi-grid">

      <div class="kpi-card c1">
        <div class="kpi-body">
          <div class="kpi-top">
            <div class="kpi-icon-wrap"><svg viewBox="0 0 24 24"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg></div>
            <span class="kpi-badge up">All</span>
          </div>
          <div class="kpi-label">Total Disbursements</div>
          <div class="kpi-value">25</div>
          <div class="kpi-sub">Active loan disbursements across all products</div>
          <div class="kpi-spark"><div class="kpi-spark-fill" data-w="100"></div></div>
          <div class="kpi-divider"></div>
          <div class="kpi-footer"><div class="kpi-footer-dot"></div><span><strong>10</strong> customers &middot; <strong>5</strong> groups</span></div>
        </div>
      </div>

      <div class="kpi-card c2">
        <div class="kpi-body">
          <div class="kpi-top">
            <div class="kpi-icon-wrap"><svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg></div>
            <span class="kpi-badge up">Prod</span>
          </div>
          <div class="kpi-label">Product Categories</div>
          <div class="kpi-value">5</div>
          <div class="kpi-sub">10A · 22B · 33C · 44D · 55E</div>
          <div class="kpi-spark"><div class="kpi-spark-fill" data-w="75"></div></div>
          <div class="kpi-divider"></div>
          <div class="kpi-footer"><div class="kpi-footer-dot"></div><span>Working Capital to Real Estate</span></div>
        </div>
      </div>

      <div class="kpi-card c3">
        <div class="kpi-body">
          <div class="kpi-top">
            <div class="kpi-icon-wrap"><svg viewBox="0 0 24 24"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z"/></svg></div>
            <span class="kpi-badge warn">Monitor</span>
          </div>
          <div class="kpi-label">Watch Accounts</div>
          <div class="kpi-value">5</div>
          <div class="kpi-sub">Watch (2) + Special Mention (4) disbursements</div>
          <div class="kpi-spark"><div class="kpi-spark-fill" data-w="48"></div></div>
          <div class="kpi-divider"></div>
          <div class="kpi-footer"><div class="kpi-footer-dot"></div><span>₹<strong>31.25</strong> Cr under monitoring</span></div>
        </div>
      </div>

      <div class="kpi-card c4">
        <div class="kpi-body">
          <div class="kpi-top">
            <div class="kpi-icon-wrap"><svg viewBox="0 0 24 24"><path d="M4 10v7h3v-7H4zm6.5 0v7h3v-7h-3zM2 22h19v-3H2v3zm15-12v7h3v-7h-3zM11.5 1L2 6v2h19V6l-9.5-5z"/></svg></div>
            <span class="kpi-badge neutral">Rcvd</span>
          </div>
          <div class="kpi-label">Principal Received</div>
          <div class="kpi-value">₹14.75</div>
          <div class="kpi-sub">Total principal repaid across all facilities</div>
          <div class="kpi-spark"><div class="kpi-spark-fill" data-w="55"></div></div>
          <div class="kpi-divider"></div>
          <div class="kpi-footer"><div class="kpi-footer-dot"></div><span>₹<strong>2.79</strong> Cr interest received</span></div>
        </div>
      </div>
    </div>

    <div class="section-label">Disbursement-Level O/S &amp; Exposure Profile</div>
  <div class="three-col">
          <div class="chart-card">
        <div class="chart-header"><div><div class="chart-title">O/S by Currency</div><div class="chart-subtitle">INR VS USD OUTSTANDING EXPOSURE</div></div></div>
        <div class="chart-wrap h200"><canvas id="txnCurrOsDonut"></canvas></div>
        <div class="donut-legend" style={{marginTop:"10px"}}>
          <div class="legend-row"><div class="legend-dot" style={{background:"#1565c0"}}></div><div class="legend-label">INR O/S</div><div class="legend-val">₹79.65 Cr</div><div class="legend-pct">84.2%</div></div>
          <div class="legend-row"><div class="legend-dot" style={{background:"#00acc1"}}></div><div class="legend-label">USD O/S</div><div class="legend-val">₹14.90 Cr</div><div class="legend-pct">15.8%</div></div>
        </div>
      </div>

       <div class="chart-card">
        <div class="chart-header"><div><div class="chart-title">Top 10 Disbursements by O/S</div><div class="chart-subtitle">INDIVIDUAL DIS NO — O/S AMOUNT · Rs (Cr)</div></div></div>
        <div class="chart-wrap h260"><canvas id="txnTop10OsBar"></canvas></div>
      </div>
      <div class="chart-card">
        <div class="chart-header"><div><div class="chart-title">O/S Distribution by Asset Class</div><div class="chart-subtitle">STANDARD · WATCH · SPECIAL MENTION O/S</div></div></div>
        <div class="chart-wrap h200"><canvas id="txnAssetOsDonut"></canvas></div>
        <div class="donut-legend" style={{marginTop:"10px"}}>
          <div class="legend-row"><div class="legend-dot" style={{background:"#1565c0"}}></div><div class="legend-label">Standard</div><div class="legend-val">₹63.30 Cr</div><div class="legend-pct">66.9%</div></div>
          <div class="legend-row"><div class="legend-dot" style={{background:"#42a5f5"}}></div><div class="legend-label">Watch</div><div class="legend-val">₹17.45 Cr</div><div class="legend-pct">18.5%</div></div>
          <div class="legend-row"><div class="legend-dot" style={{background:"#00acc1"}}></div><div class="legend-label">Special Mention</div><div class="legend-val">₹13.80 Cr</div><div class="legend-pct">14.6%</div></div>
        </div>
      </div>
  </div>
     

      {/* ── 3. Transaction Register ── */}
      <div className="section-label">
        Transaction Register — <span id="txnBadge">{transactionCount || '—'} RECORDS</span>
      </div>
      <div className="chart-card">
        <div className="txn-toolbar">
          <input
            type="text"
            className="txn-search"
            id="txnSearch"
            placeholder="Search counterparty / product..."
            onInput={() => window.filterTxns?.()}
          />
          <select className="txn-select" id="txnPrdFilter" onChange={() => window.filterTxns?.()}>
            <option value="">All Products</option>
          </select>
          <select className="txn-select" id="txnRateFilter" onChange={() => window.filterTxns?.()}>
            <option value="">All Rates</option>
            <option>Fixed</option>
            <option>Floating</option>
          </select>
          <select className="txn-select" id="txnPortFilter" onChange={() => window.filterTxns?.()}>
            <option value="">All Portfolios</option>
            <option value="1000">Secured Liability</option>
            <option value="2000">Unsecured Liability</option>
            <option value="other">Other</option>
          </select>
          <select
            className="txn-select"
            id="txnUnitFilter"
            onChange={() => window.renderTxnTable?.()}
            style={{ borderColor: 'var(--blue-mid)', color: 'var(--blue-dark)', fontWeight: 600 }}
          >
            <option value="raw">Amt: Raw</option>
            <option value="thousands">Amt: Thousands</option>
            <option value="lakhs">Amt: Lakhs</option>
            <option value="crores">Amt: Crores</option>
          </select>
          <button className="txn-clear" onClick={() => window.clearTxnFilters?.()}>
            ✕ Clear
          </button>
          <span className="txn-count" id="txnCountLabel">
            —
          </span>
        </div>

        <div className="txn-table-wrap">
          <table className="txn-table" id="txnTable">
            <thead>
              <tr>
                <th onClick={() => window.sortTxns?.(0)}>Prd Type</th>
                <th onClick={() => window.sortTxns?.(1)}>Product Description</th>
                <th onClick={() => window.sortTxns?.(2)}>Facility ID</th>
                <th onClick={() => window.sortTxns?.(3)}>Class ID</th>
                <th onClick={() => window.sortTxns?.(4)}>Txn No</th>
                <th onClick={() => window.sortTxns?.(5)}>Counter Party</th>
                <th onClick={() => window.sortTxns?.(6)}>Rate Type</th>
                <th onClick={() => window.sortTxns?.(7)}>Start Date</th>
                <th onClick={() => window.sortTxns?.(8)}>End Date</th>
                <th id="thOpenAmt" onClick={() => window.sortTxns?.(9)}>
                  Opening Amt
                </th>
                <th id="thAddition" onClick={() => window.sortTxns?.(10)}>
                  Addition
                </th>
                <th id="thRedemption" onClick={() => window.sortTxns?.(11)}>
                  Redemption
                </th>
                <th id="thClosingAmt" onClick={() => window.sortTxns?.(12)}>
                  Closing Amt
                </th>
                <th onClick={() => window.sortTxns?.(13)}>Days</th>
                <th id="thAccrual" onClick={() => window.sortTxns?.(14)}>
                  Accrual Amt
                </th>
                <th onClick={() => window.sortTxns?.(15)}>EIR %</th>
                <th onClick={() => window.sortTxns?.(16)}>Portfolio</th>
              </tr>
            </thead>
            <tbody id="txnTbody" />
          </table>
        </div>

        <div className="txn-pagination">
          <span className="txn-pg-info" id="txnPgInfo">
            Page 1 of 1
          </span>
          <div className="txn-pg-btns" id="txnPgBtns" />
        </div>
      </div>
    </div>
  );
}
