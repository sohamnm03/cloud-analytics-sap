import { useEffect, useState, useRef } from "react";

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
export function TransactionsPage({ isActive = false, totals = {}, transactions = [], txnTypeSummary = [], assetData = [], topDisbByOs = [], bpSummary = [], currencySummary = [] }) {
    const intOutstandingChartRef = useRef(null);
    const intOutstandingChartInstanceRef = useRef(null);
    const top10ChartRef = useRef(null);
const top10ChartInstanceRef = useRef(null);
      const donutRef = useRef(null);
  const donutInstanceRef = useRef(null);
  const grpStackedRef = useRef(null);
const grpStackedInstanceRef = useRef(null);
  const initoutstandingByTypeChart = (txnSummaryList) => {
    if (!intOutstandingChartRef.current || !txnSummaryList?.length) return;

    if (intOutstandingChartInstanceRef.current) {
      intOutstandingChartInstanceRef.current.destroy();
    }

    const ctx = intOutstandingChartRef.current.getContext('2d');

    const makeGradient = (color) => {
      const grad = ctx.createLinearGradient(0, 0, 0, 300);
      grad.addColorStop(0, color);
      grad.addColorStop(1, '#ffffff');
      return grad;
    };

    intOutstandingChartInstanceRef.current = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: txnSummaryList.map(p =>
          `${p.txn_type} - ${p.txn_type_desc || 'Unknown'}`
        ),
        datasets: [
          {
            label: 'Sanctioned (Cr)',
            data: txnSummaryList.map(p => toNumber(p.sanction_amt) / 1e7),
            backgroundColor: makeGradient('#26c6da'),
            borderRadius: 6,
            maxBarThickness: 30
          },
          {
            label: 'O/S Amount (Cr)',
            data: txnSummaryList.map(p => toNumber(p.os_amt) / 1e7),
            backgroundColor: makeGradient('#1565c0'),
            borderRadius: 6,
            maxBarThickness: 30
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top'
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: {
              color: '#6a9cbf',
              maxRotation: 0,
              minRotation: 0,
              autoSkip: false,
              font: {
                size: 9
              }
            }
          },
          y: {
            beginAtZero: true,
            grid: { color: '#eaf3fb' },
            title: {
              display: true,
              text: 'Rs Crores'
            }
          }
        }
      }
    });
  };
    const initDonutChart = (assetData) => {
    if (!donutRef.current || !assetData?.length) return;

    // destroy old chart
    if (donutInstanceRef.current) {
      donutInstanceRef.current.destroy();
    }

    const ctx = donutRef.current.getContext('2d');

    donutInstanceRef.current = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: assetData.map(a => a.asset_class),
        datasets: [{
          data: assetData.map(a => toNumber(a.os_amt) / 1e7), // convert to Cr
          backgroundColor: ['#1565c0', '#0288d1', '#00acc1'],
          borderWidth: 0,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom'
          },
          tooltip: {
            callbacks: {
              label: function (context) {
                return `₹${context.raw.toFixed(2)} Cr`;
              }
            }
          }
        },
        cutout: '65%'
      }
    });
  };
const initTop10Chart = (data) => {
  if (!top10ChartRef.current || !data?.length) return;

  if (top10ChartInstanceRef.current) {
    top10ChartInstanceRef.current.destroy();
  }

  const ctx = top10ChartRef.current.getContext("2d");

  top10ChartInstanceRef.current = new Chart(ctx, {
    type: "bar",
    data: {
      labels: data.map((d, i) => {
        const disNo = d?.disb_no;
        return disNo
          ? disNo.replace("DIS000000000", "#")
          : `#${i + 1}`;
      }),
      datasets: [
        {
          label: "O/S Amount (Cr)",
          data: data.map(d => toNumber(d?.os_amt) / 1e7),
          backgroundColor: data.map(() => "#1565c044"),
          borderColor: data.map(() => "#1565c0"),
          borderWidth: 1.5,
          borderRadius: 6,
          maxBarThickness: 18,
        }
      ]
    },
    options: {
      indexAxis: "y",
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
        x: {
          grid: { color: "#eaf3fb" },
          ticks: {
            color: "#6a9cbf",
            callback: val => `${val} Cr`
          }
        },
        y: {
          grid: { display: false },
          ticks: { color: "#6a9cbf" }
        }
      }
    }
  });
};
const initCurrencyDonut = (currencySummary) => {
  if (!currencySummary?.length) return;

  const canvas = document.getElementById("txnCurrOsDonut");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");

  // destroy previous
  if (window.currencyChartInstance) {
    window.currencyChartInstance.destroy();
  }

  window.currencyChartInstance = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: currencySummary.map(c => c.currency),
      datasets: [
        {
          data: currencySummary.map(c => toNumber(c.os_amt) / 1e7), // convert to Cr
          backgroundColor: ["#1565c0", "#00acc1"],
          borderWidth: 0,
          hoverOffset: 6
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: "70%",
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => `₹${ctx.raw.toFixed(2)} Cr`
          }
        }
      }
    }
  });
};
const initGrpProductStackedChart = (bpSummary) => {
  if (!grpStackedRef.current || !bpSummary?.length) return;

  if (grpStackedInstanceRef.current) {
    grpStackedInstanceRef.current.destroy();
  }

  const ctx = grpStackedRef.current.getContext("2d");

  // 👉 Extract group names
  const grpNames = bpSummary.map(g => g.bp_group);

  // 👉 Extract unique product types (dynamic)
  const prdTypes = [
    ...new Set(
      bpSummary.flatMap(g => g.products.map(p => p.prd_type))
    )
  ];

  // 👉 Colors (reuse yours if needed)
  const COLORS = ["#1565c0", "#26c6da", "#42a5f5", "#00acc1", "#90caf9"];

  // 👉 Build datasets
  const datasets = prdTypes.map((pt, i) => ({
    label: pt,
    data: bpSummary.map(group => {
      const prod = group.products.find(p => p.prd_type === pt);
      return toNumber(prod?.os_amt) / 1e7; // convert to Cr
    }),
    backgroundColor: COLORS[i % COLORS.length] + "aa",
    borderColor: COLORS[i % COLORS.length],
    borderWidth: 1,
    borderRadius: 4,
    borderSkipped: false,
  }));

  grpStackedInstanceRef.current = new Chart(ctx, {
    type: "bar",
    data: {
      labels: grpNames,
      datasets: datasets
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "top",
          labels: {
            color: "#2e6090",
            font: { size: 10 }
          }
        }
      },
      scales: {
        x: {
          stacked: true,
          grid: { display: false },
          ticks: { color: "#6a9cbf", font: { size: 10 } }
        },
        y: {
          stacked: true,
          grid: { color: "#eaf3fb" },
          ticks: {
            color: "#6a9cbf",
            callback: val => `${val} Cr`
          }
        }
      }
    }
  });
};
useEffect(() => {
  if (!isActive) return;

  if (transactions.length > 0) {
    setTimeout(() => {
      window.activateDashboardPage?.("transactions");
    }, 100);
  }

  if (txnTypeSummary?.length > 0) {
    initoutstandingByTypeChart(txnTypeSummary);
  }

  if (assetData?.length > 0) {
    initDonutChart(assetData);
  }

  if (topDisbByOs?.length > 0) {
    initTop10Chart(topDisbByOs);
  }
  if (bpSummary?.length > 0) {
  initGrpProductStackedChart(bpSummary);
}
if (currencySummary?.length > 0) {
  initCurrencyDonut(currencySummary);
}

  return () => {
    if (intOutstandingChartInstanceRef.current) {
      intOutstandingChartInstanceRef.current.destroy();
      intOutstandingChartInstanceRef.current = null;
    }

    if (donutInstanceRef.current) {
      donutInstanceRef.current.destroy();
      donutInstanceRef.current = null;
    }

    if (top10ChartInstanceRef.current) {
      top10ChartInstanceRef.current.destroy();
      top10ChartInstanceRef.current = null;
    }
    if (grpStackedInstanceRef.current) {
  grpStackedInstanceRef.current.destroy();
  grpStackedInstanceRef.current = null;
}
  };

}, [isActive, transactions, txnTypeSummary, assetData, topDisbByOs,currencySummary]);
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
          <div class="kpi-value">{totals.lv_disb_cnt || 0}</div>
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
          <div class="kpi-value">{totals.lv_prd_cnt || 0}</div>
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
          <div class="kpi-value"> ₹{(Number(totals.total_prin_rec || 0) / 1e7).toFixed(2)}</div>
          <div class="kpi-sub">Total principal repaid across all facilities</div>
          <div class="kpi-spark"><div class="kpi-spark-fill" data-w="55"></div></div>
          <div class="kpi-divider"></div>
          <div class="kpi-footer"><div class="kpi-footer-dot"></div><span>₹<strong>2.79</strong> Cr interest received</span></div>
        </div>
      </div>
    </div>

      <div class="section-label">O/S &amp; Exposure — Visual Breakdown</div>
      <div class="two-col">
        <div class="chart-card">
          <div class="chart-header">
            <div>
              <div class="chart-title">O/S Exposure by Borrower Group</div>
              <div class="chart-subtitle">STACKED BAR — PRODUCT MIX WITHIN EACH GROUP</div>
            </div>
          </div>
          <div class="chart-wrap h260"><canvas ref={grpStackedRef}></canvas></div>
        </div>
        <div class="chart-card">
          <div class="chart-header">
            <div>
              <div class="chart-title">Loan Amt vs O/S by Transaction Type</div>
              <div class="chart-subtitle">GROUPED BAR · SANCTION VS OUTSTANDING PER TXN TYPE</div>
            </div>
          </div>
          <div class="chart-wrap h260"><canvas ref={intOutstandingChartRef}></canvas></div>
        </div>
      </div>
    <div class="section-label">Disbursement-Level O/S &amp; Exposure Profile</div>
  <div class="three-col">
          <div class="chart-card">
        <div class="chart-header"><div><div class="chart-title">O/S by Currency</div><div class="chart-subtitle">INR VS USD OUTSTANDING EXPOSURE</div></div></div>
        <div class="chart-wrap h200"><canvas id="txnCurrOsDonut"></canvas></div>
<div className="donut-legend" style={{ marginTop: "10px" }}>
  {currencySummary.map((c, i) => (
    <div className="legend-row" key={i}>
      <div
        className="legend-dot"
        style={{
          background: i === 0 ? "#1565c0" : "#00acc1"
        }}
      ></div>

      <div className="legend-label">{c.currency} O/S</div>

      <div className="legend-val">
        ₹{formatCrores(c.os_amt)}
      </div>

      <div className="legend-pct">
        {c.os_percent?.toFixed(1)}%
      </div>
    </div>
  ))}
</div>
      </div>

       <div class="chart-card">
        <div class="chart-header"><div><div class="chart-title">Top 10 Disbursements by O/S</div><div class="chart-subtitle">INDIVIDUAL DIS NO — O/S AMOUNT · Rs (Cr)</div></div></div>
        <div class="chart-wrap h260"><canvas ref={top10ChartRef}></canvas></div>
      </div>
      <div class="chart-card">
        <div class="chart-header"><div><div class="chart-title">O/S Distribution by Asset Class</div><div class="chart-subtitle">STANDARD · WATCH · SPECIAL MENTION O/S</div></div></div>
        <div class="chart-wrap h200"><canvas ref={donutRef}></canvas></div>
          <div class="donut-legend" style={{ marginTop: "8px" }}>
            <div className="legend-row">
              <div className="legend-dot" style={{ background: "#1565c0" }}></div>
              <div className="legend-label">{assetData[0]?.asset_class}</div>
              <div className="legend-val">₹{formatCrores(assetData[0]?.os_amt)}</div>
              <div className="legend-pct">{assetData[0]?.os_percent}%</div>
            </div>

            <div className="legend-row">
              <div className="legend-dot" style={{ background: "#42a5f5" }}></div>
              <div className="legend-label">{assetData[1]?.asset_class}</div>
              <div className="legend-val">₹{formatCrores(assetData[1]?.os_amt)}</div>
              <div className="legend-pct">{assetData[1]?.os_percent}%</div>
            </div>

            <div className="legend-row">
              <div className="legend-dot" style={{ background: "#00acc1" }}></div>
              <div className="legend-label">{assetData[2]?.asset_class}</div>
              <div className="legend-val">₹{formatCrores(assetData[2]?.os_amt)}</div>
              <div className="legend-pct">{assetData[2]?.os_percent}%</div>
            </div>
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
