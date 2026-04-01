import { useEffect, useState, useRef } from "react";

function toNumber(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

export function BorrowersPage({ isActive = false, totals = {}, borrowers = [], bpSummary = [], borrowers_full = [] }) {
  const [mode, setMode] = useState("os");
  const borrChartRef = useRef(null);
  const borrChartInstanceRef = useRef(null);
  const custChartRef = useRef(null);
  const custChartInstanceRef = useRef(null);
  const loanOsChartRef = useRef(null);
  const loanOsChartInstanceRef = useRef(null);

  const initCustomerChart = (borrowers_full) => {
    if (!custChartRef.current || !borrowers_full?.length) return;

    if (custChartInstanceRef.current) {
      custChartInstanceRef.current.destroy();
    }

    const ctx = custChartRef.current.getContext("2d");

    const sorted = [...borrowers_full].sort((a, b) => b.os_amt - a.os_amt);

    custChartInstanceRef.current = new Chart(ctx, {
      type: "bar",
      data: {
        labels: sorted.map(b => b.zborrower),
        datasets: [
          {
            label: "O/S Amount (Cr)",
            data: sorted.map(b => toNumber(b.os_amt) / 1e7),
            backgroundColor: "#b0d5f3",
            borderRadius: 4
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
              callback: (v) => `${v}`
            }
          },
          y: {
            grid: { display: false },
            ticks: {
              color: "#a6b7c3",
              font: { size: 10 }
            }
          }
        }
      }
    });
  };

  const initBorrowerChart = (bpSummary, mode = "os") => {
    if (!borrChartRef.current || !bpSummary?.length) return;

    if (borrChartInstanceRef.current) {
      borrChartInstanceRef.current.destroy();
    }

    const ctx = borrChartRef.current.getContext("2d");

    const makeGradient = (color) => {
      const grad = ctx.createLinearGradient(0, 0, 0, 300);
      grad.addColorStop(0, color);
      grad.addColorStop(1, "#ffffff");
      return grad;
    };

    borrChartInstanceRef.current = new Chart(ctx, {
      type: "bar",
      data: {
        labels: bpSummary.map(b => b.bp_group),
        datasets: [
          {
            label: mode === "os" ? "O/S Amount (Cr)" : "Sanctioned (Cr)",
            data: bpSummary.map(b =>
              (mode === "os" ? toNumber(b.os_amt) : toNumber(b.sanction_amt)) / 1e7
            ),
            backgroundColor: makeGradient("#1565c0"),
            borderRadius: 6,
            maxBarThickness: 40
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: {
              color: "#6a9cbf",
              maxRotation: 0,   // ✅ straight labels
              minRotation: 0,
              autoSkip: false,
              font: { size: 10 }
            }
          },
          y: {
            beginAtZero: true,
            grid: { color: "#eaf3fb" },
            ticks: {
              color: "#6a9cbf",
              callback: (v) => `${v} Cr`
            },
            title: {
              display: true,
              text: "Rs Crores"
            }
          }
        }
      }
    });
  };
  const initLoanOsChart = (borrowers_full) => {
    if (!loanOsChartRef.current || !borrowers_full?.length) return;

    if (loanOsChartInstanceRef.current) {
      loanOsChartInstanceRef.current.destroy();
    }

    const ctx = loanOsChartRef.current.getContext("2d");


    const sorted = [...borrowers_full].sort((a, b) => b.os_amt - a.os_amt);


    const makeGradient = (color) => {
      const grad = ctx.createLinearGradient(0, 0, 0, 300);
      grad.addColorStop(0, color);
      grad.addColorStop(1, "#ffffff");
      return grad;
    };

    loanOsChartInstanceRef.current = new Chart(ctx, {
      type: "bar",
      data: {
        labels: sorted.map(b =>
          b.zborrower.split(" ").slice(0, 2).join(" ")
        ),
        datasets: [
          {
            label: "Sanctioned (Cr)",
            data: sorted.map(b => toNumber(b.sanction_amt) / 1e7),
            backgroundColor: makeGradient("#0288d1"),
            borderColor: "#0288d1",
            borderWidth: 0,
            borderRadius: 5,
            maxBarThickness: 28
          },
          {
            label: "O/S Amount (Cr)",
            data: sorted.map(b => toNumber(b.os_amt) / 1e7),
            backgroundColor: makeGradient("#1565c0"),
            borderColor: "#1565c0",
            borderWidth: 0,
            borderRadius: 5,
            maxBarThickness: 28
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            position: "top",
            labels: {
              color: "#2e6090",
              padding: 10,
              font: { size: 10 }
            }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: {
              color: "#6a9cbf",
              font: { size: 9 },
              maxRotation: 30
            }
          },
          y: {
            grid: { color: "#eaf3fb" },
            ticks: {
              color: "#6a9cbf",
              font: { size: 10 },
              callback: (v) => `${v} Cr`
            }
          }
        }
      }
    });
  };

  const switchBorrowerChart = (newMode) => {
    setMode(newMode);

    const chart = borrChartInstanceRef.current;
    if (!chart) return;

    chart.data.datasets[0].data = bpSummary.map(b =>
      (newMode === "os" ? toNumber(b.os_amt) : toNumber(b.sanction_amt)) / 1e7
    );

    chart.data.datasets[0].label =
      newMode === "os" ? "O/S Amount (Cr)" : "Sanctioned (Cr)";

    chart.update();
  };

  useEffect(() => {
    if (isActive && bpSummary?.length) {
      initBorrowerChart(bpSummary, mode);
    }
    if (isActive && borrowers_full?.length) {
      initCustomerChart(borrowers_full);
      initLoanOsChart(borrowers_full);

    }

    return () => {
      if (borrChartInstanceRef.current) {
        borrChartInstanceRef.current.destroy();
        borrChartInstanceRef.current = null;
      }
      if (custChartInstanceRef.current) {
        custChartInstanceRef.current.destroy();
        custChartInstanceRef.current = null;
      }
      if (loanOsChartInstanceRef.current) {
        loanOsChartInstanceRef.current.destroy();
        loanOsChartInstanceRef.current = null;
      }
    };
  }, [bpSummary, isActive, borrowers_full]);

  const borrowerCount = Array.isArray(borrowers_full) ? borrowers_full.length : 0;
  const uniqueCounterparties = Array.isArray(borrowers_full)
    ? new Set(borrowers_full.map((row) => row?.[5]).filter(Boolean)).size
    : 0;
  const avgDays = Array.isArray(borrowers) && borrowers.length
    ? Math.round(
      borrowers.reduce((sum, row) => sum + toNumber(row?.[13]), 0) / borrowers.length,
    )
    : 0;
  const productCount = toNumber(totals.lv_prd_cnt);

  return (
    <div className={`page ${isActive ? 'active' : ''}`} id="page-transactions">
      <div class="section-label">Borrower Portfolio KPIs</div>
      <div class="port-kpi-grid">
        <div class="port-kpi pk1">
          <div class="port-kpi-accent"></div>
          <div class="port-kpi-body">
            <div class="port-kpi-top"><div class="port-kpi-icon">💰</div><span class="port-kpi-badge">Total</span></div>
            <div class="port-kpi-label">Total Borrower O/S</div>
            <div class="port-kpi-value">{totals.total_os_amt}</div>
            <div class="port-kpi-sub">Across 5 groups · 10 customers · 25 disbursements</div>
          </div>
        </div>
        <div class="port-kpi pk2">
          <div class="port-kpi-accent"></div>
          <div class="port-kpi-body">
            <div class="port-kpi-top"><div class="port-kpi-icon">📊</div><span class="port-kpi-badge">Avg</span></div>
            <div class="port-kpi-label">Avg Exposure / Customer</div>
            <div class="port-kpi-value">{totals.lv_avg_exp}</div>
            <div class="port-kpi-sub">Mean O/S per customer · Range ₹1.45–₹22.00 Cr</div>
          </div>
        </div>
        <div class="port-kpi pk3">
          <div class="port-kpi-accent"></div>
          <div class="port-kpi-body">
            <div class="port-kpi-top"><div class="port-kpi-icon">⚠️</div><span class="port-kpi-badge">Watch</span></div>
            <div class="port-kpi-label">Watch / NPA Exposure</div>
            <div class="port-kpi-value">₹31.25 Cr</div>
            <div class="port-kpi-sub">33.1% of book · 6 disbursements under monitoring</div>
          </div>
        </div>
        <div class="port-kpi pk4">
          <div class="port-kpi-accent"></div>
          <div class="port-kpi-body">
            <div class="port-kpi-top"><div class="port-kpi-icon">🎯</div><span class="port-kpi-badge">HHI</span></div>
            <div class="port-kpi-label">Concentration Risk (Top-2)</div>
            <div class="port-kpi-value">65.3%</div>
            <div class="port-kpi-sub">Adani + L&amp;T hold 65.3% of total O/S book</div>
          </div>
        </div>
        <div class="port-kpi pk5">
          <div class="port-kpi-accent"></div>
          <div class="port-kpi-body">
            <div class="port-kpi-top"><div class="port-kpi-icon">📈</div><span class="port-kpi-badge">Util</span></div>
            <div class="port-kpi-label">Portfolio Utilisation</div>
            <div class="port-kpi-value">86.5%</div>
            <div class="port-kpi-sub">O/S ÷ Sanctioned · ₹109.30 Cr sanctioned base</div>
          </div>
        </div>
      </div>

      <div class="section-label">Borrower Group Exposure Analysis</div>
      <div class="two-col">
        <div class="chart-card">
          <div class="chart-header">
            <div><div class="chart-title">BP Group — O/S Exposure (Rs Cr)</div><div class="chart-subtitle">OUTSTANDING BALANCE BY BORROWER GROUP</div></div>
            <div class="chart-tabs">
              <button
                class={`tab ${mode === "os" ? "active" : ""}`}
                onClick={() => switchBorrowerChart("os")}
              >
                O/S Amt
              </button>

              <button
                class={`tab ${mode === "loan" ? "active" : ""}`}
                onClick={() => switchBorrowerChart("loan")}
              >
                Sanction
              </button>
            </div>
          </div>
          <div class="chart-wrap h280"><canvas ref={borrChartRef}></canvas></div>
        </div>
        <div class="chart-card">
          <div class="chart-header"><div><div class="chart-title">Group Share of Total Book</div><div class="chart-subtitle">% CONCENTRATION BY BP GROUP</div></div></div>
          <div class="chart-wrap h220"><canvas id="borrGroupDonut"></canvas></div>
          <div id="borrGroupLegend" class="donut-legend" style={{ marginTop: "8px" }}></div>
        </div>
      </div>

      <div class="section-label">Customer-Level Exposure &amp; Concentration</div>
      <div class="two-col">
        <div class="chart-card">
          <div class="chart-header"><div><div class="chart-title">Top Customers — O/S Exposure (Rs Cr)</div><div class="chart-subtitle">HORIZONTAL BAR · ALL 10 CUSTOMERS</div></div></div>
          <div class="chart-wrap h280"><canvas ref={custChartRef}></canvas></div>
        </div>
        <div class="chart-card">
          <div class="chart-header"><div><div class="chart-title">Cumulative Concentration</div><div class="chart-subtitle">TOP-N BORROWER GROUPS — CUMULATIVE %</div></div></div>
          <div class="chart-wrap h180"><canvas id="borrCumulChart"></canvas></div>
          <div class="insight-box" style={{ marginTop: "12px" }}><strong>Insight:</strong> Top 2 groups (Adani + L&amp;T) account for <strong>65.3%</strong> of the book — significant concentration risk requiring monitoring.</div>
        </div>
      </div>

      <div class="section-label">Customer-Wise Interest Rate &amp; Loan vs O/S Analysis</div>
      <div class="two-col">
        <div class="chart-card">
          <div class="chart-header"><div><div class="chart-title">Customer Interest Rate Comparison</div><div class="chart-subtitle">RATE % BY CUSTOMER · COLOR = RISK BAND</div></div></div>
          <div class="chart-wrap h280"><canvas id="borrCustRateBar"></canvas></div>
        </div>
        <div class="chart-card">
          <div class="chart-header"><div><div class="chart-title">Customer Loan Amount vs Outstanding</div><div class="chart-subtitle">GROUPED BAR · SANCTION VS O/S · Rs (Cr)</div></div></div>
          <div class="chart-wrap h280">  <canvas ref={loanOsChartRef}></canvas>

          </div>
        </div>
      </div>

      <div class="section-label">Customer-Wise Interest Due &amp; Facilities Profile</div>
      <div class="two-col">
        <div class="chart-card">
          <div class="chart-header"><div><div class="chart-title">Customer-Wise Interest Due (Rs Cr)</div><div class="chart-subtitle">INTEREST ACCRUED BY CUSTOMER</div></div></div>
          <div class="chart-wrap h260"><canvas id="borrCustIntDueBar"></canvas></div>
        </div>
        <div class="chart-card">
          <div class="chart-header"><div><div class="chart-title">Facilities Count per Customer</div><div class="chart-subtitle">NUMBER OF ACTIVE DISBURSEMENTS</div></div></div>
          <div class="chart-wrap h260"><canvas id="borrCustFacBar"></canvas></div>
        </div>
      </div>

      <div class="section-label">Customer Multi-Metric Radar &amp; Utilisation</div>
      <div class="two-col">
        <div class="chart-card">
          <div class="chart-header"><div><div class="chart-title">Customer Utilisation Rate (%)</div><div class="chart-subtitle">O/S ÷ SANCTIONED × 100 · BY CUSTOMER</div></div></div>
          <div class="chart-wrap h260"><canvas id="borrCustUtilBar"></canvas></div>
        </div>
        <div class="chart-card">
          <div class="chart-header"><div><div class="chart-title">Customer Risk vs Exposure Scatter</div><div class="chart-subtitle">RATE (Y) · O/S AMT (X) · BUBBLE = INT DUE</div></div></div>
          <div class="chart-wrap h260"><canvas id="borrCustBubble"></canvas></div>
        </div>
      </div>

      <div class="section-label">Borrower &amp; Customer Detail Tables</div>
      <div class="card" style={{ marginBottom: "14px" }}>
        <div class="card-title">All Borrower Groups — Full Detail <span class="card-badge">5 GROUPS · 10 CUSTOMERS</span></div>
        <table class="data-table">
          <thead><tr><th>#</th><th>BP Group</th><th>O/S (Cr)</th><th>Sanction (Cr)</th><th>Int Due (Cr)</th><th>% Share</th><th>Facilities</th><th>Risk Level</th></tr></thead>
          <tbody id="borrTable"></tbody>
        </table>
      </div>
      <div class="card">
        <div class="card-title">All Customers — Individual Detail <span class="card-badge">10 CUSTOMERS</span></div>
        <table class="data-table">
          <thead><tr><th>#</th><th>Customer</th><th>BP Group</th><th>O/S (Cr)</th><th>Sanction (Cr)</th><th>Int Due (Cr)</th><th>Rate %</th><th>Facilities</th><th>Utilisation</th></tr></thead>
          <tbody id="borrCustTable"></tbody>
        </table>
      </div>

    </div>
  );
}
