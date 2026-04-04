import { useState, useRef, useEffect } from 'react';

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

export function PortfolioPage({ isActive = false, totals = {}, products = [] }) {
  const [chartMode, setChartMode] = useState('bar');
  const topProduct = String(totals.lv_top_prd || '—');
  const topProductBook = toNumber(totals.lv_top_cl);
  const highEirProduct = String(totals.lv_hi_prd || '—');
  const highEirValue = toNumber(totals.lv_hi_eir_val);
  const highEirBook = toNumber(totals.lv_hi_eir_b);
  const lowEirProduct = String(totals.lv_lo_prd || '—');
  const lowEirValue = toNumber(totals.lv_lo_eir_val, 9999);
  const highAccProduct = String(totals.lv_ha_prd || '—');
  const highAccValue = toNumber(totals.lv_ha_acc);
  const prdGroupRef = useRef(null);
  const prdGroupInstanceRef = useRef(null);
  const rateChartRef = useRef(null);
  const rateChartInstanceRef = useRef(null);
  const assetStackRef = useRef(null);
  const assetStackInstanceRef = useRef(null);
  const exposureChartRef = useRef(null);
  const exposureChartInstanceRef = useRef(null);
  const yieldRatioChartRef = useRef(null);
  const yieldRatioChartInstanceRef = useRef(null);
  const initProductGroupedChart = (ProductList) => {
    if (!prdGroupRef.current || !ProductList?.length) return;

    if (prdGroupInstanceRef.current) {
      prdGroupInstanceRef.current.destroy();
    }

    const ctx = prdGroupRef.current.getContext('2d');

    const makeGradient = (color) => {
      const grad = ctx.createLinearGradient(0, 0, 0, 300);
      grad.addColorStop(0, color);
      grad.addColorStop(1, '#ffffff');
      return grad;
    };

    prdGroupInstanceRef.current = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ProductList.map(p =>
          `${p.zprd_type} - ${p.zprd_desc || 'Unknown'}`
        ),
        datasets: [
          {
            label: 'Sanctioned (Cr)',
            data: ProductList.map(p => toNumber(p.zsanction_amt) / 1e7),
            backgroundColor: makeGradient('#26c6da'),
            borderRadius: 6,
            maxBarThickness: 30
          },
          {
            label: 'O/S Amount (Cr)',
            data: ProductList.map(p => toNumber(p.zos_amt) / 1e7),
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
              maxRotation: 15,
              minRotation: 15,
              autoSkip: false,
              font: {
                size: 10
              }
            }
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
  const initRateChart = (ProductList) => {
    if (!rateChartRef.current || !ProductList?.length) return;

    if (rateChartInstanceRef.current) {
      rateChartInstanceRef.current.destroy();
    }

    const ctx = rateChartRef.current.getContext('2d');

    const sorted = [...ProductList].sort(
      (a, b) => toNumber(a.zinterest_rate) - toNumber(b.zinterest_rate)
    );

    const makeGradient = (color) => {
      const grad = ctx.createLinearGradient(0, 0, 0, 300);
      grad.addColorStop(0, color);
      grad.addColorStop(1, '#ffffff');
      return grad;
    };

    rateChartInstanceRef.current = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: sorted.map(p => `${p.zprd_type} - ${p.zprd_desc || 'Unknown'}`),
        datasets: [
          {
            label: 'Interest Rate (%)',
            data: sorted.map(p => toNumber(p.zinterest_rate)),
            backgroundColor: makeGradient('#1565c0'),
            borderRadius: 6,
            maxBarThickness: 40
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => `${ctx.raw.toFixed(2)} %`
            }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: {
              color: '#6a9cbf',
              font: { size: 10 }
            }
          },
          y: {
            beginAtZero: true,
            grid: { color: '#eaf3fb' },
            ticks: {
              color: '#6a9cbf',
              callback: (val) => val + '%'
            },
            title: {
              display: true,
              text: 'Interest Rate (%)'
            }
          }
        }
      }
    });
  };
  const initProductAssetStackedChart = (products) => {
    if (!assetStackRef.current || !products?.length) return;

    if (assetStackInstanceRef.current) {
      assetStackInstanceRef.current.destroy();
    }

    const ctx = assetStackRef.current.getContext('2d');

    const assetGroups = [
      ...new Set(
        products.flatMap(p => p.assets_groups.map(a => a.asset_group))
      )
    ];

    const COLORS = {
      "Standard": "#1565c0",
      "Watch": "#42a5f5",
      "Special Mention": "#00acc1"
    };

    const datasets = assetGroups.map(group => ({
      label: group,
      data: products.map(p => {
        const found = p.assets_groups.find(a => a.asset_group === group);
        return found ? found.os_amt / 1e7 : 0; // convert to Cr
      }),
      backgroundColor: (COLORS[group] || '#999') + 'aa',
      borderColor: COLORS[group] || '#999',
      borderWidth: 1,
      borderRadius: 4,
      borderSkipped: false
    }));

    assetStackInstanceRef.current = new Chart(ctx, {
      type: 'bar',
      data: {
labels: products.map(p => `${p.zprd_type} - ${p.zprd_desc}`),   
 datasets: datasets     
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            labels: {
              font: { size: 6 },
              color: '#2e6090',
              boxWidth: 10
            }
          }
        },
        scales: {
          x: {
            stacked: true,
            grid: { display: false },
            ticks: {
              color: '#6a9cbf',
              font: { size: 10 },
              
            }
          },
          y: {
            stacked: true,
            beginAtZero: true,
            grid: { color: '#eaf3fb' },
            ticks: {
              color: '#6a9cbf',
              callback: v => `${v} Cr`
            },
            title: {
              display: false,
            }
          }
        }
      }
    });
  };

  const initExposureChart = (ProductList) => {
    if (!exposureChartRef.current || !ProductList?.length) return;

    if (exposureChartInstanceRef.current) {
      exposureChartInstanceRef.current.destroy();
    }

    const ctx = exposureChartRef.current.getContext('2d');

    const makeGradient = (color) => {
      const grad = ctx.createLinearGradient(0, 0, 0, 300);
      grad.addColorStop(0, color);
      grad.addColorStop(1, '#ffffff');
      return grad;
    };

    exposureChartInstanceRef.current = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ProductList.map(p => `${p.zprd_type} - ${p.zprd_desc || 'Unknown'}`), datasets: [
          {
            label: 'Exposure (Cr)',
            data: ProductList.map(p => toNumber(p.zexposure) / 1e7),
            backgroundColor: makeGradient('#90caf9'),
            borderRadius: 6,
            maxBarThickness: 40
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => `${ctx.raw.toFixed(2)} Cr`
            }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: {
              color: '#6a9cbf',
              font: { size: 9 },
              maxRotation: 15,
              minRotation: 15,
              autoSkip: false
            }
          },
          y: {
            beginAtZero: true,
            grid: { color: '#eaf3fb' },
            ticks: {
              color: '#6a9cbf',
              callback: (val) => `${val} Cr`
            },
            title: {
              display: false,
            }
          }
        }
      }
    });
  };
  const inityeildRatioChart = (ProductList) => {
    if (!yieldRatioChartRef.current || !ProductList?.length) return;

    if (yieldRatioChartInstanceRef.current) {
      yieldRatioChartInstanceRef.current.destroy();
    }

    const ctx = yieldRatioChartRef.current.getContext('2d');

    const makeGradient = (color) => {
      const grad = ctx.createLinearGradient(0, 0, 0, 300);
      grad.addColorStop(0, color);
      grad.addColorStop(1, '#ffffff');
      return grad;
    };

    yieldRatioChartInstanceRef.current = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ProductList.map(p => `${p.zprd_type} - ${p.zprd_desc || 'Unknown'}`), datasets: [
          {
            label: 'Yield Ratio (%)',
            data: ProductList.map(p => toNumber(p.zinterest_ratio)),
            backgroundColor: makeGradient('#90caf9'),
            borderRadius: 6,
            maxBarThickness: 40
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => `${ctx.raw.toFixed(2)} Cr`
            }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: {
              color: '#6a9cbf',
              font: { size: 9 },
              maxRotation: 15,
              minRotation: 15,
              autoSkip: false
            }
          },
          y: {
            beginAtZero: true,
            grid: { color: '#eaf3fb' },
            ticks: {
              color: '#6a9cbf',
              callback: (val) => `${val} Cr`
            },
            title: {
              display: false,
            }
          }
        }
      }
    });
  };

  useEffect(() => {
    if (products?.length > 0) {
      initProductGroupedChart(products);
      initRateChart(products);
      initProductAssetStackedChart(products);
      initExposureChart(products);
      inityeildRatioChart(products);

    }

    return () => {
      if (prdGroupInstanceRef.current) {
        prdGroupInstanceRef.current.destroy();
        prdGroupInstanceRef.current = null;
      }
      if (rateChartInstanceRef.current) {
        rateChartInstanceRef.current.destroy();
        rateChartInstanceRef.current = null;
      }
      if (assetStackInstanceRef.current) {
        assetStackInstanceRef.current.destroy();
        assetStackInstanceRef.current = null;
      }
      if (exposureChartInstanceRef.current) {
        exposureChartInstanceRef.current.destroy();
        exposureChartInstanceRef.current = null;
      }
      if (yieldRatioChartInstanceRef.current) {
        yieldRatioChartInstanceRef.current.destroy();
        yieldRatioChartInstanceRef.current = null;  
      }
    };

  }, [products]);
  return (
    <div className={`page ${isActive ? 'active' : ''}`} id="page-portfolio">
      <div class="section-label">Product Portfolio KPIs</div>
      <div class="kpi-grid">

        <div class="kpi-card c1">
          <div class="kpi-body">
            <div class="kpi-top">
              <div class="kpi-icon-wrap"><svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z" /></svg></div>
              <span class="kpi-badge up">Largest</span>
            </div>
            <div class="kpi-label">Largest Product</div>
            <div class="kpi-value">{totals.lv_top_prd}</div>
            <div class="kpi-sub"><strong>Project Finance</strong> — highest outstanding book</div>
            <div class="kpi-spark"><div class="kpi-spark-fill" data-w="100"></div></div>
            <div class="kpi-divider"></div>
            <div class="kpi-footer"><div class="kpi-footer-dot"></div><span>₹<strong>39.70</strong> Cr O/S &middot; <strong>42.0%</strong> of book</span></div>
          </div>
        </div>

        <div class="kpi-card c2">
          <div class="kpi-body">
            <div class="kpi-top">
              <div class="kpi-icon-wrap"><svg viewBox="0 0 24 24"><path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z" /></svg></div>
              <span class="kpi-badge down">Highest</span>
            </div>
            <div class="kpi-label">Highest Rate Product</div>
            <div class="kpi-value">{totals.lv_hi_prd}</div>
            <div class="kpi-sub"><strong>Real Estate Loan</strong> — 10.25% p.a. interest</div>
            <div class="kpi-spark"><div class="kpi-spark-fill" data-w="88"></div></div>
            <div class="kpi-divider"></div>
            <div class="kpi-footer"><div class="kpi-footer-dot"></div><span>₹<strong>13.80</strong> Cr O/S &middot; DLF Group</span></div>
          </div>
        </div>

        <div class="kpi-card c3">
          <div class="kpi-body">
            <div class="kpi-top">
              <div class="kpi-icon-wrap"><svg viewBox="0 0 24 24"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2z" /></svg></div>
              <span class="kpi-badge up">Lowest</span>
            </div>
            <div class="kpi-label">Lowest Rate Product</div>
            <div class="kpi-value">{totals.lv_lo_prd}</div>
            <div class="kpi-sub"><strong>Working Capital Loan</strong> — 8.63% p.a. interest</div>
            <div class="kpi-spark"><div class="kpi-spark-fill" data-w="60"></div></div>
            <div class="kpi-divider"></div>
            <div class="kpi-footer"><div class="kpi-footer-dot"></div><span>₹<strong>12.55</strong> Cr O/S &middot; Tata Group lead</span></div>
          </div>
        </div>

        <div class="kpi-card c4">
          <div class="kpi-body">
            <div class="kpi-top">
              <div class="kpi-icon-wrap"><svg viewBox="0 0 24 24"><path d="M9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4zm2 2H5V5h14v14zm0-16H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z" /></svg></div>
              <span class="kpi-badge warn">Watch</span>
            </div>
            <div class="kpi-label">Non-Standard Assets</div>
            <div class="kpi-value">33.1%</div>
            <div class="kpi-sub">Watch + Special Mention accounts combined</div>
            <div class="kpi-spark"><div class="kpi-spark-fill" data-w="33.1"></div></div>
            <div class="kpi-divider"></div>
            <div class="kpi-footer"><div class="kpi-footer-dot"></div><span>₹<strong>31.25</strong> Cr under monitoring</span></div>
          </div>
        </div>

      </div>

      <div class="section-label">O/S &amp; Exposure Analysis — Product Level</div>
      <div class="two-col">
        <div class="chart-card">
          <div class="chart-header"><div><div class="chart-title">Outstanding vs Sanctioned by Product</div><div class="chart-subtitle">GROUPED BAR · O/S AMT VS LOAN AMT · Rs (Cr)</div></div></div>
          <div class="chart-wrap h280"><canvas ref={prdGroupRef} /></div>
        </div>
        <div class="chart-card">
          <div class="chart-header"><div><div class="chart-title">Unutilised Headroom by Product</div><div class="chart-subtitle">SANCTION MINUS O/S · AVAILABLE EXPOSURE · Rs (Cr)</div></div></div>
          <div class="chart-wrap h280"><canvas ref={exposureChartRef}></canvas></div>
        </div>
      </div>

      <div class="section-label">O/S Composition — Stacked &amp; Proportional View</div>
      <div class="two-col">
        <div class="chart-card">
          <div class="chart-header">
            <div><div class="chart-title">O/S Amount — Stacked by Asset Class</div><div class="chart-subtitle">STANDARD · WATCH · SPECIAL MENTION WITHIN EACH PRODUCT</div></div>
          </div>
          <div class="chart-wrap h260"><canvas ref={assetStackRef} /></div>
        </div>
        <div class="chart-card">
          <div class="chart-header"><div><div class="chart-title">Total Interest Due vs O/S Ratio</div><div class="chart-subtitle">INT DUE AS % OF O/S · YIELD INDICATOR</div></div></div>
          <div class="chart-wrap h260"><canvas ref={yieldRatioChartRef}></canvas></div>
        </div>
      </div>

      <div class="section-label">Rate Analysis &amp; Full Product Table</div>
      <div class="two-col">
        <div class="chart-card">
          <div class="chart-header"><div>
            <div class="chart-title">Interest Rate by Product Type</div>
            <div class="chart-subtitle">AVG RATE % — LOW TO HIGH</div>
          </div></div>
          <div class="chart-wrap h280"><canvas ref={rateChartRef}></canvas></div>
        </div>
        <div class="card">
          <div class="card-title">Portfolio Summary Table <span class="card-badge">5 PRODUCTS</span></div>
          <table class="data-table">
            <thead><tr><th>Product</th><th>Sanction (Cr)</th><th>O/S (Cr)</th><th>Int Rate</th><th>% Share</th><th>Band</th></tr></thead>
            <tbody>
              {products.map((p, index) => (
                <tr key={index}>
                  <td>{p.zprd_type} - {p.zprd_desc}</td>
                  <td>{(p.zsanction_amt / 1e7).toFixed(2)}</td>
                  <td>{(p.zos_amt / 1e7).toFixed(2)}</td>
                  <td>{p.zinterest_rate}%</td>
                  <td>
                    {((p.zos_amt / (totals.total_os_amt || 1)) * 100).toFixed(1)}%
                  </td>
                  <td>
                    {p.zinterest_rate >= 10
                      ? "High"
                      : p.zinterest_rate >= 7
                        ? "Medium"
                        : "Low"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
