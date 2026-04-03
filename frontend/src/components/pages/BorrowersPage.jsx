import { useEffect, useState, useRef, use } from "react";

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
export function BorrowersPage({ isActive = false, totals = {}, borrowers = [], bpSummary = [], borrowers_full = [] }) {
  const [mode, setMode] = useState("os");
  const borrChartRef = useRef(null);
  const borrChartInstanceRef = useRef(null);
  const custChartRef = useRef(null);
  const custChartInstanceRef = useRef(null);
  const loanOsChartRef = useRef(null);
  const loanOsChartInstanceRef = useRef(null);
  const intRateChartRef = useRef(null);
  const intRateChartInstanceRef = useRef(null);
  const intDueChartRef = useRef(null);
  const intDueChartInstanceRef = useRef(null);
  const intUtilChartRef = useRef(null);
  const intUtilChartInstanceRef = useRef(null);
  const InitActiveDisbRef = useRef(null);
  const initActiveDisbInstanceRef = useRef(null);
  const donutConcentRef = useRef(null);
  const donutConcentInstanceRef = useRef(null);
  const borrCustBubbleRef = useRef(null);
  const borrCustBubbleInstanceRef = useRef(null);
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
              maxRotation: 0,
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
              display: false,
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

  const initInterestRateChart = (borrowers_full) => {
    if (!intRateChartRef.current || !borrowers_full?.length) return;

    if (intRateChartInstanceRef.current) {
      intRateChartInstanceRef.current.destroy();
    }

    const ctx = intRateChartRef.current.getContext("2d");

    const sorted = [...borrowers_full].sort(
      (a, b) => toNumber(b.zinterest_rate) - toNumber(a.zinterest_rate)
    );

    const COLORS = [
      "#42a5f5", "#66bb6a", "#ffa726", "#ab47bc",
      "#ef5350", "#26c6da", "#d4e157", "#8d6e63",
      "#5c6bc0", "#26a69a"
    ];

    intRateChartInstanceRef.current = new Chart(ctx, {
      type: "bar",
      data: {
        labels: sorted.map(b =>
          b.zborrower.split(" ").slice(0, 2).join(" ")
        ),
        datasets: [
          {
            data: sorted.map(b => toNumber(b.zinterest_rate)),
            backgroundColor: COLORS.map(c => c + "44"),
            borderColor: COLORS,
            borderWidth: 1.5,
            borderRadius: 6,
            maxBarThickness: 38
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
              font: { size: 9 },
              maxRotation: 30
            }
          },
          y: {
            grid: { color: "#eaf3fb" },
            ticks: {
              color: "#6a9cbf",
              font: { size: 10 },
              callback: (v) => `${v}%`
            }
          }
        }
      }
    });
  };
  const initInterestDueChart = (borrowers_full) => {
    if (!intDueChartRef.current || !borrowers_full?.length) return;

    if (intDueChartInstanceRef.current) {
      intDueChartInstanceRef.current.destroy();
    }

    const ctx = intDueChartRef.current.getContext("2d");

    // 🔹 Sort by interest rate (DESC like your HTML logic)
    const sorted = [...borrowers_full].sort(
      (a, b) => toNumber(b.interest_due) - toNumber(a.interest_due)
    );

    const COLORS = [
      "#42a5f5", "#66bb6a", "#ffa726", "#ab47bc",
      "#ef5350", "#26c6da", "#d4e157", "#8d6e63",
      "#5c6bc0", "#26a69a"
    ];

    intDueChartInstanceRef.current = new Chart(ctx, {
      type: "bar",
      data: {
        labels: sorted.map(b =>
          b.zborrower.split(" ").slice(0, 2).join(" ")
        ),
        datasets: [
          {
            data: sorted.map(b => toNumber(b.interest_due)),
            backgroundColor: COLORS.map(c => c + "44"),
            borderColor: COLORS,
            borderWidth: 1.5,
            borderRadius: 6,
            maxBarThickness: 38
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
              font: { size: 9 },
              maxRotation: 30
            }
          },
          y: {
            grid: { color: "#eaf3fb" },
            ticks: {
              color: "#6a9cbf",
              font: { size: 10 },
              callback: (v) => `${v}%`
            }
          }
        }
      }
    });
  };
  const initInterestutilChart = (borrowers_full) => {
    if (!intUtilChartRef.current || !borrowers_full?.length) return;

    if (intUtilChartInstanceRef.current) {
      intUtilChartInstanceRef.current.destroy();
    }

    const ctx = intUtilChartRef.current.getContext("2d");

    const sorted = [...borrowers_full].sort(
      (a, b) => toNumber(b.utilization_rate) - toNumber(a.utilization_rate)
    );

    const COLORS = [
      "#42a5f5", "#66bb6a", "#ffa726", "#ab47bc",
      "#ef5350", "#26c6da", "#d4e157", "#8d6e63",
      "#5c6bc0", "#26a69a"
    ];

    intUtilChartInstanceRef.current = new Chart(ctx, {
      type: "bar",
      data: {
        labels: sorted.map(b =>
          b.zborrower.split(" ").slice(0, 2).join(" ")
        ),
        datasets: [
          {
            data: sorted.map(b => toNumber(b.utilization_rate)),
            backgroundColor: COLORS.map(c => c + "44"),
            borderColor: COLORS,
            borderWidth: 1.5,
            borderRadius: 6,
            maxBarThickness: 38
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
              font: { size: 9 },
              maxRotation: 30
            }
          },
          y: {
            grid: { color: "#eaf3fb" },
            ticks: {
              color: "#6a9cbf",
              font: { size: 10 },
              callback: (v) => `${v}%`
            }
          }
        }
      }
    });
  };

  const initActiveDisbChart = (borrowers_full) => {
    if (!InitActiveDisbRef.current || !borrowers_full?.length) return;

    if (initActiveDisbInstanceRef.current) {
      initActiveDisbInstanceRef.current.destroy();
    }

    const ctx = InitActiveDisbRef.current.getContext("2d");


    const sorted = [...borrowers_full].sort(
      (a, b) => toNumber(b.active_disb) - toNumber(a.active_disb)
    );

    const COLORS = [
      "#42a5f5", "#66bb6a", "#ffa726", "#ab47bc",
      "#ef5350", "#26c6da", "#d4e157", "#8d6e63",
      "#5c6bc0", "#26a69a"
    ];

    initActiveDisbInstanceRef.current = new Chart(ctx, {
      type: "bar",
      data: {
        labels: sorted.map(b =>
          b.zborrower.split(" ").slice(0, 2).join(" ")
        ),
        datasets: [
          {
            data: sorted.map(b => toNumber(b.active_disb)),
            backgroundColor: COLORS.map(c => c + "44"),
            borderColor: COLORS,
            borderWidth: 1.5,
            borderRadius: 6,
            maxBarThickness: 38
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
              font: { size: 9 },
              maxRotation: 30
            }
          },
          y: {
            grid: { color: "#eaf3fb" },
            ticks: {
              color: "#6a9cbf",
              font: { size: 10 },
              callback: (v) => `${v}%`
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

  const initCustomerBubbleChart = (borrowers) => {
    if (!borrCustBubbleRef.current || !borrowers?.length) return;

    if (borrCustBubbleInstanceRef.current) {
      borrCustBubbleInstanceRef.current.destroy();
    }

    const ctx = borrCustBubbleRef.current.getContext("2d");

    const COLORS = [
      '#1565c0', '#0288d1', '#00acc1', '#1e88e5', '#1976d2',
      '#006064', '#01579b', '#0277bd', '#283593', '#1a237e'
    ];

    borrCustBubbleInstanceRef.current = new Chart(ctx, {
      type: "bubble",
      data: {
        datasets: borrowers.map((c, i) => ({
          label: c.zborrower.split(" ").slice(0, 2).join(" "), // short name
          data: [{
            x: toNumber(c.os_amt) / 1e7,              // 👉 Cr
            y: toNumber(c.zinterest_rate),            // 👉 %
            r: Math.max(6, (toNumber(c.interest_due) / 1e7) * 10) // 👉 scaled
          }],
          backgroundColor: COLORS[i % COLORS.length] + "66",
          borderColor: COLORS[i % COLORS.length],
          borderWidth: 2
        }))
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 600 },
        plugins: {
          legend: {
            display: true,
            position: "right",
            labels: {
              font: { size: 8 },
              color: "#2e6090",
              padding: 6,
              boxWidth: 8
            }
          },
          tooltip: {
            callbacks: {
              label: function (ctx) {
                const d = borrowers[ctx.datasetIndex];
                return [
                  `${d.zborrower}`,
                  `O/S: ₹${(d.os_amt / 1e7).toFixed(2)} Cr`,
                  `Rate: ${d.zinterest_rate}%`,
                  `Interest Due: ₹${(d.interest_due / 1e7).toFixed(2)} Cr`
                ];
              }
            }
          }
        },
        scales: {
          x: {
            title: {
              display: true,
              text: "O/S Amount (Cr)",
              font: { size: 10 },
              color: "#6a9cbf"
            },
            grid: { color: "#eaf3fb" },
            ticks: {
              font: { size: 9 },
              color: "#6a9cbf"
            }
          },
          y: {
            title: {
              display: true,
              text: "Interest Rate (%)",
              font: { size: 10 },
              color: "#6a9cbf"
            },
            min: 8,
            max: 12,
            grid: { color: "#eaf3fb" },
            ticks: {
              font: { size: 9 },
              color: "#6a9cbf",
              callback: (v) => `${v}%`
            }
          }
        }
      }
    });
  };

  const renderGroupLegend = (bpSummary) => {
    const container = document.getElementById("borrGroupLegend");
    if (!container) return;

    const COLORS = ['#1565c0', '#0288d1', '#00acc1', '#42a5f5', '#90caf9'];

    const total = bpSummary.reduce(
      (sum, b) => sum + toNumber(b.exposure_amt),
      0
    );

    container.innerHTML = bpSummary
      .map((b, i) => {
        const valueCr = toNumber(b.exposure_amt) / 1e7;
        const pct = total ? ((b.exposure_amt / total) * 100).toFixed(1) : 0;

        return `
        <div class="legend-row">
          <div class="legend-dot" style="background:${COLORS[i % COLORS.length]}"></div>
          <div class="legend-label">${b.bp_group}</div>
          <div class="legend-val">₹${valueCr.toFixed(2)} Cr</div>
          <div class="legend-pct">${pct}%</div>
        </div>
      `;
      })
      .join("");
  };
  const initConcentDonutChart = (bpSummary) => {
    if (!donutConcentRef.current || !bpSummary?.length) return;

    if (donutConcentInstanceRef.current) {
      donutConcentInstanceRef.current.destroy();
    }

    const ctx = donutConcentRef.current.getContext('2d');

    donutConcentInstanceRef.current = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: bpSummary.map(b => b.bp_group),
        datasets: [{
          data: bpSummary.map(b => toNumber(b.exposure_amt) / 1e7), // convert to Cr
          backgroundColor: ['#1565c0', '#0288d1', '#00acc1'],
          borderWidth: 0,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false,
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
    renderGroupLegend(bpSummary);

  };
  const concentrationRisk = (() => {
    if (!bpSummary?.length || !totals?.total_os_amt) return 0;

    const sorted = [...bpSummary].sort(
      (a, b) => toNumber(b.os_amt) - toNumber(a.os_amt)
    );

    const top2Sum = sorted
      .slice(0, 2)
      .reduce((sum, item) => sum + toNumber(item.os_amt), 0);

    return (top2Sum / toNumber(totals.total_os_amt)) * 100;
  })();
  useEffect(() => {
    if (isActive && bpSummary?.length) {
      initBorrowerChart(bpSummary, mode);
      initConcentDonutChart(bpSummary);
    }
    if (isActive && borrowers_full?.length) {
      initCustomerChart(borrowers_full);
      initLoanOsChart(borrowers_full);
      initInterestRateChart(borrowers_full);
      initInterestDueChart(borrowers_full);
      initInterestutilChart(borrowers_full);
      initActiveDisbChart(borrowers_full);
      initCustomerBubbleChart(borrowers_full);

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
      if (intRateChartInstanceRef.current) {
        intRateChartInstanceRef.current.destroy();
        intRateChartInstanceRef.current = null;
      }
      if (intDueChartInstanceRef.current) {
        intDueChartInstanceRef.current.destroy();
        intDueChartInstanceRef.current = null;
      }
      if (intUtilChartInstanceRef.current) {
        intUtilChartInstanceRef.current.destroy();
        intUtilChartInstanceRef.current = null;
      }
      if (initActiveDisbInstanceRef.current) {
        initActiveDisbInstanceRef.current.destroy();
        initActiveDisbInstanceRef.current = null;
      }
      if (donutConcentInstanceRef.current) {
        donutConcentInstanceRef.current.destroy();
        donutConcentInstanceRef.current = null;
      }
      if (borrCustBubbleInstanceRef.current) {
        borrCustBubbleInstanceRef.current.destroy();
        borrCustBubbleInstanceRef.current = null;
      }

    };
  }, [bpSummary, isActive, borrowers_full]);


  return (
    <div className={`page ${isActive ? 'active' : ''}`} id="page-transactions">
      <div class="section-label">Borrower Portfolio KPIs</div>
      <div class="port-kpi-grid">
        <div class="port-kpi pk1">
          <div class="port-kpi-accent"></div>
          <div class="port-kpi-body">
            <div class="port-kpi-top"><div class="port-kpi-icon">💰</div><span class="port-kpi-badge">Total</span></div>
            <div class="port-kpi-label">Total Borrower O/S</div>
            <div class="port-kpi-value">₹ {formatCrores(totals.total_os_amt)}</div>
            <div class="port-kpi-sub">Across 5 groups · 10 customers · 25 disbursements</div>
          </div>
        </div>
        <div class="port-kpi pk2">
          <div class="port-kpi-accent"></div>
          <div class="port-kpi-body">
            <div class="port-kpi-top"><div class="port-kpi-icon">📊</div><span class="port-kpi-badge">Avg</span></div>
            <div class="port-kpi-label">Avg Exposure / Customer</div>
            <div class="port-kpi-value">₹ {formatCrores(totals.lv_avg_exp)}</div>
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
            <div class="port-kpi-value">  {concentrationRisk.toFixed(1)}%</div>
            <div class="port-kpi-sub">Adani + L&amp;T hold 65.3% of total O/S book</div>
          </div>
        </div>
        <div class="port-kpi pk5">
          <div class="port-kpi-accent"></div>
          <div class="port-kpi-body">
            <div class="port-kpi-top"><div class="port-kpi-icon">📈</div><span class="port-kpi-badge">Util</span></div>
            <div class="port-kpi-label">Portfolio Utilisation</div>
            <div className="port-kpi-value">
              {totals?.loan_amt
                ? ((totals.total_os_amt / totals.loan_amt) * 100).toFixed(2)
                : "0.00"}%
            </div>            <div class="port-kpi-sub">O/S ÷ Sanctioned · ₹109.30 Cr sanctioned base</div>
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
          <div class="chart-wrap h220"><canvas ref={donutConcentRef}></canvas></div>
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
          <div class="chart-wrap h280"><canvas ref={intRateChartRef}></canvas></div>
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
          <div class="chart-wrap h260"><canvas ref={intDueChartRef}></canvas></div>
        </div>
        <div class="chart-card">
          <div class="chart-header"><div><div class="chart-title">Facilities Count per Customer</div><div class="chart-subtitle">NUMBER OF ACTIVE DISBURSEMENTS</div></div></div>
          <div class="chart-wrap h260"><canvas ref={InitActiveDisbRef}></canvas></div>
        </div>
      </div>

      <div class="section-label">Customer Multi-Metric Radar &amp; Utilisation</div>
      <div class="two-col">
        <div class="chart-card">
          <div class="chart-header"><div><div class="chart-title">Customer Utilisation Rate (%)</div><div class="chart-subtitle">O/S ÷ SANCTIONED × 100 · BY CUSTOMER</div></div></div>
          <div class="chart-wrap h260"><canvas ref={intUtilChartRef}></canvas></div>
        </div>
        <div class="chart-card">
          <div class="chart-header"><div><div class="chart-title">Customer Risk vs Exposure Scatter</div><div class="chart-subtitle">RATE (Y) · O/S AMT (X) · BUBBLE = INT DUE</div></div></div>
          <div class="chart-wrap h260"><canvas ref={borrCustBubbleRef}></canvas></div>
        </div>
      </div>

      <div class="section-label">Borrower &amp; Customer Detail Tables</div>
      <div class="card" style={{ marginBottom: "14px" }}>
        <div class="card-title">All Borrower Groups — Full Detail <span class="card-badge">5 GROUPS · 10 CUSTOMERS</span></div>
        <table class="data-table">
          <thead><tr><th>#</th><th>BP Group</th><th>O/S (Cr)</th><th>Sanction (Cr)</th><th>Int Due (Cr)</th><th>% Share</th><th>Facilities</th><th>Risk Level</th></tr></thead>
          <tbody>
            {bpSummary.map((b, index) => (
              <tr key={index}>
                <td>{index + 1}</td>
                <td>{b.bp_group}</td>
                <td>{b.os_amt}</td>

                <td>{(toNumber(b.sanction_amt) / 1e7).toFixed(2)}</td>
                <td>{(toNumber(b.interest_due) / 1e7).toFixed(2)}</td>
                <td>-</td>
                <td>{b.disb_count || "-"}</td>


              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div class="card">
        <div class="card-title">All Customers — Individual Detail <span class="card-badge">10 CUSTOMERS</span></div>
        <table class="data-table">
          <thead><tr><th>#</th><th>Customer</th><th>BP Group</th><th>O/S (Cr)</th><th>Sanction (Cr)</th><th>Int Due (Cr)</th><th>Rate %</th><th>Facilities</th><th>Utilisation</th></tr></thead>
          <tbody>
            {borrowers_full.map((b, index) => (
              <tr key={index}>
                <td>{index + 1}</td>
                <td>{b.zborrower}</td>
                <td>{b.bp_group}</td>

                <td>{(toNumber(b.os_amt) / 1e7).toFixed(2)}</td>
                <td>{(toNumber(b.sanction_amt) / 1e7).toFixed(2)}</td>
                <td>{(toNumber(b.interest_due) / 1e7).toFixed(2)}</td>

                <td>{toNumber(b.zinterest_rate).toFixed(2)}%</td>

                {/* Facilities not in your data → show "-" */}
                <td>{b.active_disb || "-"}</td>

                <td>{toNumber(b.utilization_rate).toFixed(2)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </div>
  );
}
