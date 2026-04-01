import { useRef, useState, useEffect } from 'react';

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


export function OverviewPage({ isActive = false, totals = {}, products = [], borrowers = [], portfolios = [], assets = [], sanctionVsOs = [], productBpExposure = [] }) {
  const [chartMode, setChartMode] = useState('total_loan');
  const totalBook = toNumber(totals.lv_total_b);
  const avgEir = toNumber(totals.lv_avg_eir);
  const totalAccrual = toNumber(totals.lv_total_acc);
  const productCount = toNumber(totals.lv_prd_cnt);
  const lenderCount = toNumber(totals.lv_lend_cnt);
  const topProduct = String(totals.lv_top_prd || '—');
  const topProductBook = toNumber(totals.lv_top_cl);
  const highEirProduct = String(totals.lv_hi_prd || '');
  const highEirValue = toNumber(totals.lv_hi_eir_val);
  const chartRef = useRef(null);
  const chartInstanceRef = useRef(null);
  const donutRef = useRef(null);
  const donutInstanceRef = useRef(null);
  const portRef = useRef(null);
  const portInstanceRef = useRef(null);
  const gapRef = useRef(null);
  const gapInstanceRef = useRef(null);
  const portGroupRef = useRef(null);
  const portGroupInstanceRef = useRef(null);
  const portGroupProductRef = useRef(null);
  const portGroupProductInstanceRef = useRef(null);
  const utilRef = useRef(null);
  const utilInstanceRef = useRef(null);
  const getValueByMode = (product, mode) => {
    switch (mode) {
      case 'total_loan': return toNumber(product.zloan_amt);
      case 'total_exposure': return toNumber(product.zexp_amt);
      case 'total_os': return toNumber(product.zos_amt);
      case 'pri_rec': return toNumber(product.zprinc_rec);
    }
  };

  const initOverview = (mode, prodList) => {
    if (!chartRef.current || !prodList?.length) return;


    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
    }

    const ctx = chartRef.current.getContext('2d');
    const gradient = ctx.createLinearGradient(0, 0, 0, 300);

    gradient.addColorStop(0, '#92effb');   // light teal top
    gradient.addColorStop(1, '#92c4fd');
    const top9 = prodList.slice(0, 9);

    chartInstanceRef.current = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: top9.map(p => `${p.zprd_type} - ${p.zprd_desc}` || 'Unknown Product'),
        datasets: [{
          label: mode.replace(/_/g, ' ').toUpperCase(),
          data: top9.map(p => getValueByMode(p, mode) / 1e7),
          backgroundColor: gradient,
          borderColor: '#2563eb',
          borderWidth: 0,
          borderRadius: 8,
          barThickness: 40,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { mode: 'index', intersect: false },
        },
        scales: {
          y: {
            grid: {
              color: 'rgba(209, 226, 243, 0.4)',  // 👈 light gridlines
              lineWidth: 1,
              drawBorder: false
            },
            beginAtZero: true,
          },
          x: {
            grid: {
              display: false
            },
            ticks: {
              maxRotation: 0,
              minRotation: 0
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
  const initUtilChart = (products) => {
    if (!utilRef.current || !products?.length) return;

    if (utilInstanceRef.current) {
      utilInstanceRef.current.destroy();
    }

    const ctx = utilRef.current.getContext('2d');

    const getColor = (val) => {
      return '#fb8c00';
    };

    const values = products.map(p => Number(p.zdrawdown_rate) || 0);
    const colors = values.map(v => getColor(v));

    utilInstanceRef.current = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: products.map(p => p.zprd_type),
        datasets: [{
          label: 'Utilisation %',
          data: values,
          backgroundColor: colors.map(c => c + '33'), // light fill
          borderColor: colors,
          borderWidth: 2,
          borderRadius: 6,
          borderSkipped: false,
          maxBarThickness: 44
        }]
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
              color: '#6a9cbf'
            }
          },
          y: {
            min: 0,
            max: 100,
            grid: { color: '#eaf3fb' },
            ticks: {
              color: '#6a9cbf',
              callback: (v) => v + '%'
            },
            title: {
              display: true,
              text: 'Utilisation %'
            }
          }
        }
      }
    });
  };
  const initPortfolioChart = (portfolioList) => {
    if (!portRef.current || !portfolioList?.length) return;

    // destroy old chart
    if (portInstanceRef.current) {
      portInstanceRef.current.destroy();
    }

    const ctx = portRef.current.getContext('2d');

    // gradient colors (same styling as your HTML)
    const colors = ['#1565c0', '#0288d1', '#00acc1', '#26c6da', '#4dd0e1'];

    const gradients = colors.map(color => {
      const grad = ctx.createLinearGradient(0, 0, 0, 300);
      grad.addColorStop(0, color);
      grad.addColorStop(1, '#ffffff');
      return grad;
    });

    portInstanceRef.current = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: portfolioList.map(p =>
          (p.zportfolio || '').replace(' Portfolio', '')
        ),
        datasets: [{
          label: 'O/S Amount (Cr)',
          data: portfolioList.map(p => toNumber(p.os_amt) / 1e7),
          backgroundColor: gradients,
          borderWidth: 0,
          borderRadius: 6,
          maxBarThickness: 40
        }]
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
              color: '#6a9cbf',
              maxRotation: 20,
              minRotation: 0
            }
          },
          y: {
            beginAtZero: true,
            grid: { color: '#eaf3fb' },
            ticks: {
              color: '#6a9cbf'
            },
            title: {
              display: true,
              text: 'Rs Crores'
            }
          }
        }
      }
    });
  };

  const initSanctionGapChart = (data) => {
    if (!gapRef.current || !data?.length) return;

    if (gapInstanceRef.current) {
      gapInstanceRef.current.destroy();
    }

    const ctx = gapRef.current.getContext('2d');

    const makeGradient = (color) => {
      const grad = ctx.createLinearGradient(0, 0, 0, 300);
      grad.addColorStop(0, color);
      grad.addColorStop(1, '#ffffff');
      return grad;
    };

    gapInstanceRef.current = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: data.map(d => d.zprd_type),
        datasets: [
          {
            label: 'O/S Amount (Cr)',
            data: data.map(d => d.os_amt / 1e7),
            backgroundColor: makeGradient('#1565c0'),
            borderRadius: 6,
            maxBarThickness: 32,
            stack: 'combined'
          },
          {
            label: 'Headroom (Cr)',
            data: data.map(d => (d.sanction_amt - d.os_amt) / 1e7),
            backgroundColor: makeGradient('#90caf9'),
            borderRadius: 6,
            maxBarThickness: 32,
            stack: 'combined'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            labels: {
              color: '#2e6090',
              font: { size: 10 }
            }
          }
        },
        scales: {
          x: {
            stacked: true,
            grid: { display: false },
            ticks: { color: '#6a9cbf' }
          },
          y: {
            stacked: true,
            beginAtZero: true,
            grid: { color: '#eaf3fb' },
            ticks: { color: '#6a9cbf' },
            title: {
              display: true,
              text: 'Rs Crores'
            }
          }
        }
      }
    });
  };
  const initGroupProductStacked = (data) => {
    if (!portGroupProductRef.current || !data?.length) return;

    if (portGroupProductInstanceRef.current) {
      portGroupProductInstanceRef.current.destroy();
    }

    const ctx = portGroupProductRef.current.getContext('2d');
    const labels = data.map(d => d.zprd_desc);

    const bpGroups = data[0]?.bp_groups.map(b => b.bp_group) || [];

    const COLORS = ['#1565c0', '#0288d1', '#00acc1', '#26c6da', '#4dd0e1'];

    const datasets = bpGroups.map((bp, i) => ({
      label: bp,
      data: data.map(d => {
        const found = d.bp_groups.find(b => b.bp_group === bp);
        return found ? found.os_amt / 1e7 : 0; // convert to Cr
      }),
      backgroundColor: COLORS[i % COLORS.length] + 'aa',
      borderColor: COLORS[i % COLORS.length],
      borderWidth: 1,
      borderRadius: 4,
      borderSkipped: false
    }));

    portGroupProductInstanceRef.current = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            labels: {
              font: { size: 10 },
              color: '#2e6090',
              padding: 10,
              boxWidth: 12
            }
          },
          tooltip: {
            mode: 'index',
            intersect: false,
            callbacks: {
              label: (ctx) => `₹${ctx.raw.toFixed(2)} Cr`
            }
          }
        },
        scales: {
          x: {
            stacked: true,
            grid: { display: false },
            ticks: {
              color: '#6a9cbf',
              maxRotation: 20,
              minRotation: 0
            }
          },
          y: {
            stacked: true,
            beginAtZero: true,
            grid: { color: '#eaf3fb' },
            ticks: { color: '#6a9cbf' },
            title: {
              display: true,
              text: 'Rs Crores'
            }
          }
        }
      }
    });
  };
  const initPortfolioGroupedChart = (portfolioList) => {
    if (!portGroupRef.current || !portfolioList?.length) return;

    if (portGroupInstanceRef.current) {
      portGroupInstanceRef.current.destroy();
    }

    const ctx = portGroupRef.current.getContext('2d');

    const makeGradient = (color) => {
      const grad = ctx.createLinearGradient(0, 0, 0, 300);
      grad.addColorStop(0, color);
      grad.addColorStop(1, '#ffffff');
      return grad;
    };

    portGroupInstanceRef.current = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: portfolioList.map(p =>
          (p.zportfolio || '').replace(' Portfolio', '')
        ),
        datasets: [
          {
            label: 'Sanctioned (Cr)',
            data: portfolioList.map(p => toNumber(p.sanction_amt) / 1e7),
            backgroundColor: makeGradient('#26c6da'),
            borderRadius: 6,
            maxBarThickness: 30
          },
          {
            label: 'O/S Amount (Cr)',
            data: portfolioList.map(p => toNumber(p.os_amt) / 1e7),
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
            ticks: { color: '#6a9cbf' }
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
  function TopBorrowers({ borrowers = [] }) {
    if (!Array.isArray(borrowers) || borrowers.length === 0) {
      return (
        <div style={{ padding: '30px 20px', textAlign: 'center', color: '#888' }}>
          No borrower data available
        </div>
      );
    }

    const maxOs = Math.max(...borrowers.map(b => toNumber(b.os_amt)));

    return borrowers.slice(0, 5).map((borrower, index) => {
      const osAmt = toNumber(borrower.os_amt);
      const percent = toNumber(borrower.os_percent);
      const width = maxOs > 0 ? (osAmt / maxOs) * 100 : 0;

      return (
        <div key={index} className="prog-item">
          <div className="prog-header">
            <span className="prog-label">{borrower.zborrower || 'Unknown Borrower'}</span>
            <span className="prog-pct">
              Rs {formatCrores(osAmt)} · {percent.toFixed(1)}%
            </span>
          </div>
          <div className="prog-bar">
            <div
              className={`prog-fill b${index + 1}`}
              style={{ width: `${width}%` }}
            />
          </div>
        </div>
      );
    });
  }

  function TopPortfolio({ portfolios = [] }) {
    if (!Array.isArray(portfolios) || portfolios.length === 0) {
      return (
        <div style={{ padding: '30px 20px', textAlign: 'center', color: '#888' }}>
          No Portfolios data available
        </div>
      );
    }

    const maxOs = Math.max(...portfolios.map(b => toNumber(b.os_amt)));

    return portfolios.slice(0, 5).map((portfolios, index) => {
      const osAmt = toNumber(portfolios.os_amt);
      const percent = toNumber(portfolios.os_percent);
      const width = maxOs > 0 ? (osAmt / maxOs) * 100 : 0;

      return (
        <div key={index} className="prog-item">
          <div className="prog-header">
            <span className="prog-label">{portfolios.zportfolio || 'Unknown Portfolio'}</span>
            <span className="prog-pct">
              Rs {formatCrores(osAmt)} · {percent.toFixed(1)}%
            </span>
          </div>
          <div className="prog-bar">
            <div
              className={`prog-fill b${index + 1}`}
              style={{ width: `${width}%` }}
            />
          </div>
        </div>
      );
    });
  }


  useEffect(() => {

    if (portfolios?.length > 0) {
      initPortfolioChart(portfolios);
      initPortfolioGroupedChart(portfolios);

    }

    if (products?.length > 0) {
      initOverview(chartMode, products);
      initUtilChart(products);

    }

    if (sanctionVsOs?.length > 0) {
      initSanctionGapChart(sanctionVsOs);
    }

    if (assets?.length > 0 && donutRef.current) {

      // destroy old donut
      if (donutInstanceRef.current) {
        donutInstanceRef.current.destroy();
      }

      const ctx = donutRef.current.getContext('2d');

      donutInstanceRef.current = new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels: assets.map(a => a.asset_class),
          datasets: [{
            data: assets.map(a => toNumber(a.os_amt) / 1e7),
            backgroundColor: ['#1565c0', '#0288d1', '#00acc1'],
            borderWidth: 0,
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '65%',
          plugins: {
            legend: { position: 'bottom' },
            tooltip: {
              callbacks: {
                label: function (context) {
                  const percent = assets[context.dataIndex]?.os_percent || 0;
                  return `₹${context.raw.toFixed(2)} Cr (${percent}%)`;
                }
              }
            }
          }
        }
      });
    }
    if (productBpExposure?.length > 0) {
      initGroupProductStacked(productBpExposure);
    }
    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
        chartInstanceRef.current = null;
      }
      if (donutInstanceRef.current) {
        donutInstanceRef.current.destroy();
        donutInstanceRef.current = null;
      }
      if (portInstanceRef.current) {
        portInstanceRef.current.destroy();
        portInstanceRef.current = null;
      }
      if (portGroupInstanceRef.current) {
        portGroupInstanceRef.current.destroy();
        portGroupInstanceRef.current = null;
      }
      if (portGroupProductInstanceRef.current) {
        portGroupProductInstanceRef.current.destroy();
        portGroupProductInstanceRef.current = null;
      }
      if (utilInstanceRef.current) {
        utilInstanceRef.current.destroy();
        utilInstanceRef.current = null;
      }
    };

  }, [products, chartMode, assets, sanctionVsOs, productBpExposure]);

  // Tab handler (no direct init call needed)
  const handleTabClick = (mode) => {
    setChartMode(mode);
  };

  return (
    <div className={`page ${isActive ? 'active' : ''}`} id="page-overview">
      <div id="errorPanel" className="error-panel" style={{ display: 'none' }} />
      <div className="section-label">Key Portfolio Indicators</div>
      <div class="kpi-grid" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
        <div class="kpi-card c1">
          <div class="kpi-body">
            <div class="kpi-top">
              <div class="kpi-icon-wrap"><svg viewBox="0 0 24 24"><path d="M9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4zm2 2H5V5h14v14zm0-16H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z" /></svg></div>
              <span class="kpi-badge up">Sanctioned</span>
            </div>
            <div class="kpi-label">Total Loan Amount</div>
            <div className="kpi-value" id="kpiTotalLoan">
              ₹{(Number(totals.loan_amt || 0) / 1e7).toFixed(2)}
            </div>            <div class="kpi-sub">Total sanctioned across all 25 disbursements</div>
            <div class="kpi-spark"><div class="kpi-spark-fill" data-w="100"></div></div>
            <div class="kpi-divider"></div>
            <div class="kpi-footer"><div class="kpi-footer-dot"></div><span>Rs Crores &middot; <strong>{totals.lv_prd_cnt}</strong> products</span></div>
          </div>
        </div>

        <div class="kpi-card c2">
          <div class="kpi-body">
            <div class="kpi-top">
              <div class="kpi-icon-wrap"><svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" /></svg></div>
              <span class="kpi-badge neutral">Exposure</span>
            </div>
            <div class="kpi-label">Total Exposure</div>
            <div class="kpi-value" id="kpiTotalExp">
              ₹{(Number(totals.total_exposure || 0) / 1e7).toFixed(2)}
            </div>
            <div class="kpi-sub">Gross credit exposure — book at risk</div>
            <div class="kpi-spark"><div class="kpi-spark-fill" data-w="86"></div></div>
            <div class="kpi-divider"></div>
            <div class="kpi-footer"><div class="kpi-footer-dot"></div><span>Rs Crores &middot; <strong>{totals.lv_cust_cnt}</strong> customers</span></div>
          </div>
        </div>

        <div class="kpi-card c3">
          <div class="kpi-body">
            <div class="kpi-top">
              <div class="kpi-icon-wrap"><svg viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14l-5-5 1.41-1.41L12 14.17l7.59-7.59L21 8l-9 9z" /></svg></div>
              <span class="kpi-badge up">Active</span>
            </div>
            <div class="kpi-label">Total Outstanding (O/S)</div>
            <div class="kpi-value" id="kpiTotalOs">₹{(Number(totals.total_os_amt || 0) / 1e7).toFixed(2)}
            </div>
            <div class="kpi-sub">Aggregate O/S balance — 25 disbursements</div>
            <div class="kpi-spark"><div class="kpi-spark-fill" data-w="86"></div></div>
            <div class="kpi-divider"></div>
            <div class="kpi-footer"><div class="kpi-footer-dot"></div><span>Rs Crores &middot; <strong>5</strong> groups</span></div>
          </div>
        </div>
        <div class="kpi-card c4">
          <div class="kpi-body">
            <div class="kpi-top">
              <div class="kpi-icon-wrap"><svg viewBox="0 0 24 24"><path d="M4 10v7h3v-7H4zm6.5 0v7h3v-7h-3zM2 22h19v-3H2v3zm15-12v7h3v-7h-3zM11.5 1L2 6v2h19V6l-9.5-5z" /></svg></div>
              <span class="kpi-badge up">Received</span>
            </div>
            <div class="kpi-label">Total Principal Received</div>
            <div class="kpi-value" id="kpiPriRec">
              ₹{(Number(totals.total_prin_rec || 0) / 1e7).toFixed(2)}

            </div>
            <div class="kpi-sub">Principal repaid across all facilities</div>
            <div class="kpi-spark"><div class="kpi-spark-fill" data-w="55"></div></div>
            <div class="kpi-divider"></div>
            <div class="kpi-footer"><div class="kpi-footer-dot"></div><span>Rs Crores repaid to date</span></div>
          </div>
        </div>

      </div>

      <div className="section-label">Portfolio Mix & Loan Book Analysis</div>
      <div className="charts-row">
        <div className="chart-card">
          <div className="chart-header">
            <div>
              <div className="chart-title">Loan Book by Product Type</div>
              <div className="chart-subtitle">TOGGLE: TOTAL LOAN · TOTAL EXPOSURE · TOTAL O/S · PRI REC</div>
            </div>
            <div className="chart-tabs">
              {['total_loan', 'total_exposure', 'total_os', 'pri_rec'].map((mode) => (
                <button
                  key={mode}
                  className={`tab ${chartMode === mode ? 'active' : ''}`}
                  onClick={() => handleTabClick(mode)}
                >
                  {mode.replace(/_/g, ' ').toUpperCase()}
                </button>
              ))}
            </div>
          </div>
          <div className="chart-wrap h240">
            <canvas ref={chartRef} />
          </div>
        </div>
      </div>
      <div className="section-label">Portfolio Allocation, Asset Quality & Top Borrowers</div>
      <div className="three-col">
        <div className="card">
          <div className="card-title">
            Portfolio Allocation <span class="card-badge">% OF O/S</span>
          </div>
          <TopPortfolio portfolios={portfolios} />
          <div className="insight-box">
            <strong>Insight:</strong> <span id="secInsight">Infra Portfolio dominates at 49.5%, driven by L&T and Adani Group exposures.</span>
          </div>
        </div>

        <div className="chart-card" style={{ padding: '18px 20px' }}>
          <div className="chart-header" style={{ marginBottom: 10 }}>
            <div>
              <div className="chart-title">Asset Quality Distribution</div>
              <div className="chart-subtitle">STANDARD · WATCH · SPECIAL MENTION</div>
            </div>
          </div>
          <div className="chart-wrap h200">
            <canvas ref={donutRef} />
          </div>
          <div class="donut-legend" style={{ marginTop: "8px" }}>
            <div className="legend-row">
              <div className="legend-dot" style={{ background: "#1565c0" }}></div>
              <div className="legend-label">{assets[0]?.asset_class}</div>
              <div className="legend-val">₹{formatCrores(assets[0]?.os_amt)}</div>
              <div className="legend-pct">{assets[0]?.os_percent}%</div>
            </div>

            <div className="legend-row">
              <div className="legend-dot" style={{ background: "#42a5f5" }}></div>
              <div className="legend-label">{assets[1]?.asset_class}</div>
              <div className="legend-val">₹{formatCrores(assets[1]?.os_amt)}</div>
              <div className="legend-pct">{assets[1]?.os_percent}%</div>
            </div>

            <div className="legend-row">
              <div className="legend-dot" style={{ background: "#00acc1" }}></div>
              <div className="legend-label">{assets[2]?.asset_class}</div>
              <div className="legend-val">₹{formatCrores(assets[2]?.os_amt)}</div>
              <div className="legend-pct">{assets[2]?.os_percent}%</div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-title">
            Top 5 Borrowers <span className="card-badge">O/S · Rs (Cr)</span>
          </div>
          <TopBorrowers borrowers={borrowers} />
          <div>

          </div>
        </div>
      </div>

      <div className="section-label">O/S Exposure — Portfolio & Currency Breakdown
      </div>

      <div class="three-col">
        <div class="chart-card">
          <div class="chart-header"><div><div class="chart-title">O/S by Portfolio Segment</div><div class="chart-subtitle">OUTSTANDING AMOUNT · 5 PORTFOLIOS · Rs (Cr)</div></div></div>
          <div class="chart-wrap h220"><canvas ref={portRef}></canvas></div>
        </div>
        <div class="chart-card">
          <div class="chart-header"><div><div class="chart-title">Sanction vs O/S Gap</div><div class="chart-subtitle">UNUTILISED HEADROOM BY PRODUCT · Rs (Cr)</div></div></div>
          <div class="chart-wrap h220">
            <canvas ref={gapRef}></canvas>

          </div>
        </div>
        <div class="chart-card">
          <div class="chart-header"><div><div class="chart-title">O/S Utilisation % by Product</div><div class="chart-subtitle">O/S ÷ SANCTION × 100 · DRAW-DOWN RATE</div></div></div>
          <div class="chart-wrap h220"><canvas ref={utilRef}></canvas></div>
        </div>
      </div>
      <div class="section-label">Exposure Heatmap — Group × Product O/S</div>
      <div class="two-col">
        <div class="chart-card">
          <div class="chart-header"><div><div class="chart-title">O/S Exposure by Group &amp; Product</div><div class="chart-subtitle">STACKED BAR — PRODUCT MIX PER BORROWER GROUP</div></div></div>
          <div class="chart-wrap h260"><canvas ref={portGroupProductRef}></canvas></div>
        </div>
        <div class="chart-card">
          <div class="chart-header"><div><div class="chart-title">O/S vs Sanctioned — All Portfolios</div><div class="chart-subtitle">GROUPED BAR · EXPOSURE UTILISATION</div></div></div>
          <div class="chart-wrap h260"><canvas ref={portGroupRef}></canvas></div>
        </div>
      </div>
    </div>
  );
}
