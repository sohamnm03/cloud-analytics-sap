import { useState, useEffect, useRef } from 'react';

function toNumber(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function formatCrores(value) {
  const crores = toNumber(value) / 1e7;
  return `${crores.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} `;
}

export function MaturityPage({ isActive = false, totals = {}, maturity = [] }) {
  const [chartMode, setChartMode] = useState('bar');
  const OsvsSancRef = useRef(null);
  const OsvsSancInstanceRef = useRef(null);
  const ObBySancChartRef = useRef(null);
  const ObBySancChartInstanceRef = useRef(null);
  const OsShareLineRef = useRef(null);
  const OsShareLineInstanceRef = useRef(null);
  const matMainChartRef = useRef(null);
  const matMainChartInstanceRef = useRef(null);
  const redemptionPctRef = useRef(null);
  const redemptionPctInstanceRef = useRef(null);
  const residualBarRef = useRef(null);
  const residualBarInstanceRef = useRef(null);
  const cumulChartRef = useRef(null);
  const cumulChartInstanceRef = useRef(null);
  const matBucketDonutRef = useRef(null);
  const matBucketDonutInstanceRef = useRef(null);
  const initMatuarityGroupedChart = (maturityObj) => {
    if (!OsvsSancRef.current || !maturityObj) return;

    const years = Object.keys(maturityObj).sort();
    if (!years.length) return;

    if (OsvsSancInstanceRef.current) {
      OsvsSancInstanceRef.current.destroy();
    }

    const ctx = OsvsSancRef.current.getContext('2d');

    const makeGradient = (color) => {
      const grad = ctx.createLinearGradient(0, 0, 0, 300);
      grad.addColorStop(0, color);
      grad.addColorStop(1, '#ffffff');
      return grad;
    };

    const osData = years.map(y => toNumber(maturityObj[y]?.os_amt) / 1e7);
    const sancData = years.map(y => toNumber(maturityObj[y]?.sanction_amt) / 1e7);

    OsvsSancInstanceRef.current = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: years,
        datasets: [
          {
            label: 'Sanctioned (Cr)',
            data: sancData,
            backgroundColor: makeGradient('#26c6da'),
            borderRadius: 6,
            maxBarThickness: 30
          },
          {
            label: 'O/S Amount (Cr)',
            data: osData,
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
          legend: { position: 'top' }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: '#6a9cbf', font: { size: 10 } }
          },
          y: {
            beginAtZero: true,
            grid: { color: '#eaf3fb' },
            title: {
              display: false,
            }
          }
        }
      }
    });
  };

  const initOsBySancChart = (maturityObj) => {
    if (!ObBySancChartRef.current || !maturityObj) return;

    const maturityArr = Object.entries(maturityObj).map(([year, val]) => ({
      year,
      ...val
    }));

    if (!maturityArr.length) return;

    if (ObBySancChartInstanceRef.current) {
      ObBySancChartInstanceRef.current.destroy();
    }

    const ctx = ObBySancChartRef.current.getContext("2d");

    const sorted = maturityArr.sort(
      (a, b) => toNumber(b.utilization_pct) - toNumber(a.utilization_pct)
    );

    const COLORS = [
      "#42a5f5", "#66bb6a", "#ffa726", "#ab47bc",
      "#ef5350", "#26c6da", "#d4e157", "#8d6e63"
    ];

    ObBySancChartInstanceRef.current = new Chart(ctx, {
      type: "bar",
      data: {
        labels: sorted.map(d => d.year),
        datasets: [
          {
            label: "Utilization %",
            data: sorted.map(d => toNumber(d.utilization_pct)),
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
              font: { size: 10 }
            }
          },
          y: {
            beginAtZero: true,
            grid: { color: "#eaf3fb" },
            ticks: {
              callback: (v) => `${v}%`
            },
            title: {
              display: true,
              text: "Utilization %"
            }
          }
        }
      }
    });
  };
  const initOsShareLineChart = (maturityObj, totalOs) => {
    if (!OsShareLineRef.current || !maturityObj) return;

    const years = Object.keys(maturityObj).sort();
    if (!years.length) return;

    if (OsShareLineInstanceRef.current) {
      OsShareLineInstanceRef.current.destroy();
    }

    const ctx = OsShareLineRef.current.getContext("2d");

    const osVals = years.map(y => toNumber(maturityObj[y]?.os_amt));
    const sharePct = osVals.map(v =>
      totalOs > 0 ? parseFloat(((v / totalOs) * 100).toFixed(1)) : 0
    );

    const COLORS = [
      "#42a5f5", "#66bb6a", "#ffa726",
      "#ab47bc", "#ef5350", "#26c6da"
    ];

    OsShareLineInstanceRef.current = new Chart(ctx, {
      type: "line",
      data: {
        labels: years,
        datasets: [
          {
            label: "% of Total O/S",
            data: sharePct,
            borderColor: "#1565c0",
            backgroundColor: "rgba(21,101,192,0.1)",
            borderWidth: 2.5,
            fill: true,
            tension: 0.4,
            pointBackgroundColor: COLORS,
            pointRadius: 6,
            pointHoverRadius: 9
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
            ticks: { color: "#6a9cbf", font: { size: 10 } }
          },
          y: {
            grid: { color: "#eaf3fb" },
            ticks: {
              color: "#6a9cbf",
              callback: (v) => `${v}%`
            },
            title: {
              display: true,
              text: "% of Total O/S"
            }
          }
        }
      }
    });
  };
  const initMatMainChart = (maturityObj, mode = 'bar') => {
    if (!matMainChartRef.current || !maturityObj) return;

    const years = Object.keys(maturityObj).sort();
    if (!years.length) return;

    if (matMainChartInstanceRef.current) {
      matMainChartInstanceRef.current.destroy();
    }

    const ctx = matMainChartRef.current.getContext("2d");

    // O/S in crores
    const osData = years.map(y =>
      toNumber(maturityObj[y]?.os_amt) / 1e7
    );

    // bucket colors (same as your HTML)
    const bucketColors = years.map(y =>
      y <= 2026 ? "#e53935" :
        y <= 2028 ? "#fb8c00" :
          "#1565c0"
    );

    const isLine = mode === "line";

    matMainChartInstanceRef.current = new Chart(ctx, {
      type: isLine ? "line" : "bar",
      data: {
        labels: years,
        datasets: [
          {
            label: "O/S Balance (Cr)",
            data: osData,

            // ✅ dynamic styling based on mode
            backgroundColor: isLine
              ? "rgba(21,101,192,0.08)"
              : bucketColors.map(c => c + "26"),

            borderColor: isLine
              ? "#1565c0"
              : bucketColors,

            borderWidth: 2,
            borderRadius: isLine ? 0 : 6,
            fill: isLine,
            tension: isLine ? 0.3 : 0,
            pointBackgroundColor: isLine ? bucketColors : undefined,
            pointRadius: isLine ? 5 : 0,
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
              font: { size: 10 }
            }
          },
          y: {
            beginAtZero: true,
            grid: { color: "#eaf3fb" },
            ticks: {
              callback: v => v + " Cr"
            },
            title: {
              display: false,
            }
          }
        }
      }
    });
  };
  const initRedemptionPctChart = (maturityObj, totalOs) => {
    if (!redemptionPctRef.current || !maturityObj) return;

    const years = Object.keys(maturityObj).sort();
    if (!years.length) return;

    if (redemptionPctInstanceRef.current) {
      redemptionPctInstanceRef.current.destroy();
    }

    const ctx = redemptionPctRef.current.getContext("2d");

    const osVals = years.map(y => toNumber(maturityObj[y]?.os_amt));

    const redPct = osVals.map(v =>
      totalOs > 0 ? parseFloat(((v / totalOs) * 100).toFixed(1)) : 0
    );

    const colors = years.map(y =>
      y <= 2026 ? "#e53935" :
        y <= 2028 ? "#fb8c00" :
          "#1565c0"
    );

    redemptionPctInstanceRef.current = new Chart(ctx, {
      type: "bar",
      data: {
        labels: years,
        datasets: [
          {
            label: "% of Book Redeeming",
            data: redPct,
            backgroundColor: colors.map(c => c + "33"),
            borderColor: colors,
            borderWidth: 2,
            borderRadius: 6,
            borderSkipped: false,
            maxBarThickness: 44
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
              font: { size: 10 }
            }
          },
          y: {
            grid: { color: "#eaf3fb" },
            ticks: {
              color: "#6a9cbf",
              callback: v => v + "%"
            },
            title: {
              display: true,
              text: "% of Total Book"
            }
          }
        }
      }
    });
  };
  const initResidualBarChart = (maturityObj, totalOs) => {
    if (!residualBarRef.current || !maturityObj) return;

    const years = Object.keys(maturityObj).sort();
    if (!years.length) return;

    if (residualBarInstanceRef.current) {
      residualBarInstanceRef.current.destroy();
    }

    const ctx = residualBarRef.current.getContext("2d");

    // yearly O/S values
    const osVals = years.map(y => toNumber(maturityObj[y]?.os_amt));

    // 🔥 running residual logic
    let remaining = totalOs;
    const residual = osVals.map(v => {
      remaining = remaining - v;
      return remaining > 0 ? parseFloat((remaining / 1e7).toFixed(2)) : 0; // in Cr
    });

    // gradient (same as your HTML)
    const grad = ctx.createLinearGradient(0, 0, 0, 300);
    grad.addColorStop(0, "#1565c0");
    grad.addColorStop(1, "#ffffff");

    residualBarInstanceRef.current = new Chart(ctx, {
      type: "bar",
      data: {
        labels: years,
        datasets: [
          {
            label: "Remaining O/S (Cr)",
            data: residual,
            backgroundColor: grad,
            borderColor: "#1565c0",
            borderWidth: 0,
            borderRadius: 6,
            borderSkipped: false,
            maxBarThickness: 44
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
              font: { size: 10 }
            }
          },
          y: {
            grid: { color: "#eaf3fb" },
            ticks: {
              color: "#6a9cbf",
              callback: v => v + " Cr"
            },
            title: {
              display: true,
              text: "Remaining Book (Cr)"
            }
          }
        }
      }
    });
  };
  const initCumulativeChart = (maturityObj) => {
    if (!cumulChartRef.current || !maturityObj) return;

    const years = Object.keys(maturityObj).sort();
    if (!years.length) return;

    if (cumulChartInstanceRef.current) {
      cumulChartInstanceRef.current.destroy();
    }

    const ctx = cumulChartRef.current.getContext("2d");

    // yearly O/S (in Cr)
    const osVals = years.map(
      y => toNumber(maturityObj[y]?.os_amt) / 1e7
    );

    // 🔥 cumulative logic (same as your HTML)
    let cum = 0;
    const cumVals = osVals.map(v => {
      cum += v;
      return parseFloat(cum.toFixed(2));
    });

    cumulChartInstanceRef.current = new Chart(ctx, {
      type: "line",
      data: {
        labels: years,
        datasets: [
          {
            label: "Cumulative O/S (Cr)",
            data: cumVals,
            borderColor: "#1565c0",
            backgroundColor: "rgba(21,101,192,0.08)",
            borderWidth: 2,
            fill: true,
            tension: 0.3,
            pointBackgroundColor: "#1565c0",
            pointRadius: 4,
            pointHoverRadius: 6
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
              font: { size: 10 }
            }
          },
          y: {
            grid: { color: "#eaf3fb" },
            ticks: {
              color: "#6a9cbf",
              callback: v => v + " Cr"
            },
            title: {
              display: true,
              text: "Cumulative O/S (Cr)"
            }
          }
        }
      }
    });
  };
  const initMatBucketDonut = (maturityObj) => {
    if (!matBucketDonutRef.current || !maturityObj) return;

    const entries = Object.entries(maturityObj).map(([year, val]) => ({
      year: Number(year),
      os: toNumber(val?.os_amt) / 1e7 // convert to Cr
    }));

    if (!entries.length) return;

    if (matBucketDonutInstanceRef.current) {
      matBucketDonutInstanceRef.current.destroy();
    }

    const ctx = matBucketDonutRef.current.getContext("2d");

    // 🔥 bucket aggregation (same as your HTML logic)
    const short = entries
      .filter(e => e.year <= 2026)
      .reduce((a, e) => a + e.os, 0);

    const medium = entries
      .filter(e => e.year > 2026 && e.year <= 2028)
      .reduce((a, e) => a + e.os, 0);

    const long = entries
      .filter(e => e.year > 2028)
      .reduce((a, e) => a + e.os, 0);

    const dataVals = [
      parseFloat(short.toFixed(2)),
      parseFloat(medium.toFixed(2)),
      parseFloat(long.toFixed(2))
    ];

    matBucketDonutInstanceRef.current = new Chart(ctx, {
      type: "doughnut",
      data: {
        labels: [
          "Short (2025–26)",
          "Medium (2027–28)",
          "Long (2029+)"
        ],
        datasets: [
          {
            data: dataVals,
            backgroundColor: ["#e53935", "#fb8c00", "#1565c0"],
            borderWidth: 0,
            hoverOffset: 6
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "bottom",
            labels: {
              color: "#6a9cbf",
              font: { size: 11 }
            }
          },
          tooltip: {
            callbacks: {
              label: function (ctx) {
                return `${ctx.label}: ₹${ctx.raw} Cr`;
              }
            }
          }
        },
        cutout: "65%"
      }
    });
  };
  const maturityArr = Object.entries(maturity || {})
    .map(([year, val]) => ({
      year: Number(year),
      ...val
    }))
    .sort((a, b) => a.year - b.year);

  const getBucket = (year) => {
    if (year <= 2026) return "Short-term";
    if (year <= 2028) return "Medium-term";
    return "Long-term";
  };

  const getPriority = (pct) => {
    if (pct >= 50) return "Stable";
    if (pct >= 25) return "Plan ahead";
    return "Immediate";
  };

  const bucketData = (() => {
    const entries = Object.entries(maturity || {}).map(([year, val]) => ({
      year: Number(year),
      os: toNumber(val?.os_amt) / 1e7 // Cr
    }));

    const short = entries
      .filter(e => e.year <= 2026)
      .reduce((a, e) => a + e.os, 0);

    const medium = entries
      .filter(e => e.year > 2026 && e.year <= 2028)
      .reduce((a, e) => a + e.os, 0);

    const long = entries
      .filter(e => e.year > 2028)
      .reduce((a, e) => a + e.os, 0);

    const total = short + medium + long;

    return {
      short,
      medium,
      long,
      shortPct: total ? ((short / total) * 100).toFixed(1) : "0.0",
      mediumPct: total ? ((medium / total) * 100).toFixed(1) : "0.0",
      longPct: total ? ((long / total) * 100).toFixed(1) : "0.0"
    };
  })();
const os2025 = maturity?.["2025"]?.os_amt || 0;
const totalOS = totals?.total_os_amt || 1;
const pct2025 = (os2025 / totalOS) * 100;
  useEffect(() => {
    if (maturity && Object.keys(maturity).length > 0) {
      initMatuarityGroupedChart(maturity);
      initOsBySancChart(maturity);
      initOsShareLineChart(
        maturity,
        toNumber(totals.total_os_amt)
      );
      initMatMainChart(maturity, chartMode);
      initRedemptionPctChart(
        maturity,
        toNumber(totals.total_os_amt)
      );
      initResidualBarChart(
        maturity,
        toNumber(totals.total_os_amt)
      );
      initCumulativeChart(maturity);
      initMatBucketDonut(maturity);

    }

    return () => {
      if (OsvsSancInstanceRef.current) {
        OsvsSancInstanceRef.current.destroy();
        OsvsSancInstanceRef.current = null;
      }
      if (ObBySancChartInstanceRef.current) {
        ObBySancChartInstanceRef.current.destroy();
        ObBySancChartInstanceRef.current = null;
      }
      if (OsShareLineInstanceRef.current) {
        OsShareLineInstanceRef.current.destroy();
        OsShareLineInstanceRef.current = null;
      }
      if (matMainChartInstanceRef.current) {
        matMainChartInstanceRef.current.destroy();
        matMainChartInstanceRef.current = null;
      }
      if (redemptionPctInstanceRef.current) {
        redemptionPctInstanceRef.current.destroy();
        redemptionPctInstanceRef.current = null;
      }
      if (residualBarInstanceRef.current) {
        residualBarInstanceRef.current.destroy();
        residualBarInstanceRef.current = null;
      }
      if (cumulChartInstanceRef.current) {
        cumulChartInstanceRef.current.destroy();
        cumulChartInstanceRef.current = null;
      }
      if (matBucketDonutInstanceRef.current) {
        matBucketDonutInstanceRef.current.destroy();
        matBucketDonutInstanceRef.current = null;
      }
    }
  }, [maturity, totals, chartMode]);

  return (
    <div className={`page ${isActive ? 'active' : ''}`} id="page-maturity">

      <div class="section-label">Maturity Profile KPIs</div>
      <div class="kpi-grid">

        <div class="kpi-card c1">
          <div class="kpi-body">
            <div class="kpi-top">
              <div class="kpi-icon-wrap"><svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z" /></svg></div>
              <span class="kpi-badge down">Expired</span>
            </div>
            <div class="kpi-label">Matured / Due 2025</div>
    <div className="kpi-value">₹{formatCrores(os2025)}</div>
            <div class="kpi-sub">O/S balance from facilities maturing 2025</div>
            <div class="kpi-spark"><div class="kpi-spark-fill" data-w="3.9"></div></div>
            <div class="kpi-divider"></div>
            <div class="kpi-footer"><div class="kpi-footer-dot"></div><span><strong>{pct2025.toFixed(1)}%</strong> of total book (Mahindra Overdraft)</span></div>
          </div>
        </div>

        <div class="kpi-card c2">
          <div class="kpi-body">
            <div class="kpi-top">
              <div class="kpi-icon-wrap"><svg viewBox="0 0 24 24"><path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z" /></svg></div>
              <span class="kpi-badge warn">Peak</span>
            </div>
            <div class="kpi-label">Largest Maturity Year</div>
            <div class="kpi-value">{totals.lv_largest_year || '—'}</div>
            <div class="kpi-sub">Highest single-year O/S redemption volume</div>
            <div class="kpi-spark"><div class="kpi-spark-fill" data-w="100"></div></div>
            <div class="kpi-divider"></div>
            <div class="kpi-footer"><div class="kpi-footer-dot"></div><span>₹<strong>{formatCrores(totals.lv_largest_year_amt)}</strong> Cr &middot; <strong>39.7%</strong> of book</span></div>
          </div>
        </div>

        <div class="kpi-card c3">
          <div class="kpi-body">
            <div class="kpi-top">
              <div class="kpi-icon-wrap"><svg viewBox="0 0 24 24"><path d="M13 2.05v6.02c3.95.49 7 3.85 7 7.93 0 3.21-1.81 6-4.72 7.72L13 17v5h5l-1.22-1.22C19.91 19.07 22 15.76 22 12c0-5.18-3.95-9.45-9-9.95z" /></svg></div>
              <span class="kpi-badge up">Spread</span>
            </div>
            <div class="kpi-label">Maturity Horizon</div>
            <div class="kpi-value">{totals.lv_mat_horizon || '—'} Yrs</div>
            <div class="kpi-sub">Book spread across 2025 through 2031</div>
            <div class="kpi-spark"><div class="kpi-spark-fill" data-w="55"></div></div>
            <div class="kpi-divider"></div>
            <div class="kpi-footer"><div class="kpi-footer-dot"></div><span><strong>2025</strong> earliest &middot; <strong>2031</strong> latest maturity</span></div>
          </div>
        </div>
        <div class="kpi-card c4">
          <div class="kpi-body">
            <div class="kpi-top">
              <div class="kpi-icon-wrap"><svg viewBox="0 0 24 24"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2z" /></svg></div>
              <span class="kpi-badge up">Stable</span>
            </div>
            <div class="kpi-label">Long-dated (2029+)</div>
            <div class="kpi-value">₹{formatCrores(totals.lv_long_os)}</div>
            <div class="kpi-sub">Facilities maturing 2029 and beyond</div>
            <div className="kpi-spark">
              <div
                className="kpi-spark-fill"
                style={{
                  width: `${((totals.lv_long_os / totals.total_os_amt) * 100 || 0).toFixed(1)}%`
                }}
              ></div>
            </div>
            <div class="kpi-divider"></div>
            <div class="kpi-footer"><div class="kpi-footer-dot"></div><span><strong>79.9%</strong> of total book long-dated</span></div>
          </div>
        </div>

      </div>

      <div class="section-label">O/S Exposure by Maturity — Grouped &amp; Proportional</div>
      <div class="two-col">
        <div class="chart-card">
          <div class="chart-header"><div><div class="chart-title">O/S vs Sanctioned by Maturity Year</div><div class="chart-subtitle">GROUPED BAR · OUTSTANDING VS SANCTION PER YEAR</div></div></div>
          <div class="chart-wrap h260"><canvas ref={OsvsSancRef}></canvas></div>
        </div>
        <div class="chart-card">
          <div class="chart-header"><div><div class="chart-title">O/S % Share per Maturity Bucket</div><div class="chart-subtitle">PROPORTION OF TOTAL BOOK PER YEAR</div></div></div>
          <div class="chart-wrap h260"><canvas ref={OsShareLineRef}></canvas></div>
        </div>
      </div>
      <div class="section-label">Exposure Rundown &amp; Redemption Risk</div>
      <div class="three-col">
        <div class="chart-card">
          <div class="chart-header"><div><div class="chart-title">Annual Redemption vs Book</div><div class="chart-subtitle">O/S MATURING AS % OF TOTAL BOOK</div></div></div>
          <div class="chart-wrap h220"><canvas ref={redemptionPctRef}></canvas></div>
        </div>
        <div class="chart-card">
          <div class="chart-header"><div><div class="chart-title">Remaining Book After Maturity</div><div class="chart-subtitle">BOOK OUTSTANDING AFTER EACH YEAR'S REDEMPTION</div></div></div>
          <div class="chart-wrap h220"><canvas ref={residualBarRef}></canvas></div>
        </div>
        <div class="chart-card">
          <div class="chart-header"><div><div class="chart-title">Sanction Utilisation by Year</div><div class="chart-subtitle">O/S ÷ SANCTION % · DRAW-DOWN PER COHORT</div></div></div>
          <div class="chart-wrap h220"><canvas ref={ObBySancChartRef}></canvas></div>
        </div>
      </div>
      <div class="section-label">Annual Maturity Profile</div>
      <div class="two-col">
        <div class="chart-card">
          <div class="chart-header">
            <div><div class="chart-title">Annual Maturities — O/S Balance (Rs Cr)</div><div class="chart-subtitle">2025–2031 · COLOR CODED BY BUCKET</div></div>
            <div class="chart-tabs">
              <button
                className={`tab ${chartMode === 'bar' ? 'active' : ''}`}
                onClick={() => setChartMode('bar')}
              >
                Bar
              </button>

              <button
                className={`tab ${chartMode === 'line' ? 'active' : ''}`}
                onClick={() => setChartMode('line')}
              >
                Line
              </button>
            </div>
          </div>
          <div class="chart-wrap h280"><canvas ref={matMainChartRef}></canvas></div>
        </div>
        <div class="chart-card">
          <div class="chart-header"><div><div class="chart-title">Maturity Bucket Distribution</div><div class="chart-subtitle">SHORT / MEDIUM / LONG TERM</div></div></div>
          <div class="chart-wrap h200"><canvas ref={matBucketDonutRef}></canvas></div>
          <div className="donut-legend" style={{ marginTop: "12px" }}>

            <div className="legend-row">
              <div className="legend-dot" style={{ background: "#e53935" }}></div>
              <div className="legend-label">Short (2025–26)</div>
              <div className="legend-val">₹{bucketData.short.toFixed(2)} Cr</div>
              <div className="legend-pct">{bucketData.shortPct}%</div>
            </div>

            <div className="legend-row">
              <div className="legend-dot" style={{ background: "#fb8c00" }}></div>
              <div className="legend-label">Medium (2027–28)</div>
              <div className="legend-val">₹{bucketData.medium.toFixed(2)} Cr</div>
              <div className="legend-pct">{bucketData.mediumPct}%</div>
            </div>

            <div className="legend-row">
              <div className="legend-dot" style={{ background: "#1565c0" }}></div>
              <div className="legend-label">Long (2029+)</div>
              <div className="legend-val">₹{bucketData.long.toFixed(2)} Cr</div>
              <div className="legend-pct">{bucketData.longPct}%</div>
            </div>

          </div>
        </div>
      </div>
      <div class="section-label">Cumulative Maturity</div>
      <div class="two-col">
        <div class="chart-card"><div class="chart-header"><div><div class="chart-title">Cumulative Maturity Curve</div><div class="chart-subtitle">RUNNING TOTAL · Rs (Crores)</div></div></div><div class="chart-wrap h240"><canvas ref={cumulChartRef}></canvas></div></div>
        <div class="card">
          <div class="card-title">Year-by-Year Maturity Schedule <span class="card-badge">2025–2031</span></div>
          <table class="data-table">
            <thead><tr><th>Year</th><th>O/S Amt (Cr)</th><th>Sanction (Cr)</th><th>% of Total</th><th>Bucket</th><th>Priority</th></tr></thead>
            <tbody>
              {maturityArr.map((row) => {
                const osCr = toNumber(row.os_amt) / 1e7;
                const sancCr = toNumber(row.loan_amt) / 1e7;

                const pct =
                  totals.total_os_amt > 0
                    ? ((row.os_amt / totals.total_os_amt) * 100).toFixed(1)
                    : "0.0";

                return (
                  <tr key={row.year}>
                    <td>{row.year}</td>

                    <td>{osCr.toFixed(2)}</td>

                    <td>{sancCr.toFixed(2)}</td>

                    <td>{pct}%</td>

                    <td>{getBucket(row.year)}</td>

                    <td>{getPriority(pct)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
