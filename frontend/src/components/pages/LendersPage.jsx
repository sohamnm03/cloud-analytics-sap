import { useEffect, useMemo, useRef, useState } from 'react';
import Chart from 'chart.js/auto';

function toNumber(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function formatCrores(value, decimals = 2) {
  const crores = toNumber(value) / 1e7;
  return crores.toLocaleString('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function normalizeLender(lender) {
  return {
    zcounterpty: String(lender?.zcounterpty || ''),
    zclosing_amt: toNumber(lender?.zclosing_amt),
  };
}

function getRiskBand(sharePct) {
  if (sharePct >= 10) {
    return { label: 'High', className: 'pill red' };
  }

  if (sharePct >= 5) {
    return { label: 'Medium', className: 'pill yellow' };
  }

  return { label: 'Low', className: 'pill blue' };
}

export function LendersPage({ isActive = false, lenders = [], totals = {} }) {
  const [chartMode, setChartMode] = useState('bar');
  const mainChartRef = useRef(null);
  const donutChartRef = useRef(null);
  const cumulativeChartRef = useRef(null);
  const tierChartRef = useRef(null);

  const lenderRows = useMemo(() => {
    const normalized = Array.isArray(lenders) ? lenders.map(normalizeLender) : [];
    return normalized
      .filter((row) => row.zcounterpty && row.zclosing_amt > 0)
      .sort((a, b) => b.zclosing_amt - a.zclosing_amt);
  }, [lenders]);

  const totalExposure = useMemo(() => {
    const sumFromLenders = lenderRows.reduce((sum, row) => sum + row.zclosing_amt, 0);
    const totalFromState = toNumber(totals?.lv_total_b);
    return totalFromState > 0 ? totalFromState : sumFromLenders;
  }, [lenderRows, totals]);

  const lenderCount = lenderRows.length;
  const top1 = lenderRows[0] || null;
  const top2 = lenderRows[1] || null;
  const top3Amount = lenderRows.slice(0, 3).reduce((sum, row) => sum + row.zclosing_amt, 0);

  const top1Pct = totalExposure > 0 && top1 ? (top1.zclosing_amt / totalExposure) * 100 : 0;
  const top2Pct = totalExposure > 0 && top2 ? (top2.zclosing_amt / totalExposure) * 100 : 0;
  const top3Pct = totalExposure > 0 ? (top3Amount / totalExposure) * 100 : 0;

  const tableRows = useMemo(() => {
    let cumulative = 0;
    return lenderRows.map((row, index) => {
      const sharePct = totalExposure > 0 ? (row.zclosing_amt / totalExposure) * 100 : 0;
      cumulative += sharePct;
      const band = getRiskBand(sharePct);

      return {
        rank: index + 1,
        name: row.zcounterpty,
        exposureCr: formatCrores(row.zclosing_amt),
        sharePct,
        cumulativePct: cumulative,
        riskLabel: band.label,
        riskClassName: band.className,
      };
    });
  }, [lenderRows, totalExposure]);

  const top8 = useMemo(() => lenderRows.slice(0, 8), [lenderRows]);

  const top8Total = useMemo(
    () => top8.reduce((sum, row) => sum + row.zclosing_amt, 0),
    [top8],
  );

  const donutLegend = useMemo(
    () => top8.map((row) => {
      const pct = top8Total > 0 ? (row.zclosing_amt / top8Total) * 100 : 0;
      return {
        label: row.zcounterpty,
        amountCr: formatCrores(row.zclosing_amt),
        pct,
      };
    }),
    [top8, top8Total],
  );

  const tierCounts = useMemo(
    () => tableRows.reduce(
      (acc, row) => {
        if (row.sharePct >= 10) {
          acc.high += 1;
        } else if (row.sharePct >= 5) {
          acc.mid += 1;
        } else {
          acc.low += 1;
        }
        return acc;
      },
      { high: 0, mid: 0, low: 0 },
    ),
    [tableRows],
  );

  useEffect(() => {
    if (!isActive) {
      return undefined;
    }

    const palette = ['#1565c0', '#0288d1', '#00acc1', '#1e88e5', '#1976d2', '#006064', '#01579b', '#283593'];

    const destroyChart = (chart) => {
      if (chart && typeof chart.destroy === 'function') {
        chart.destroy();
      }
    };

    const topLabels = top8.map((row) => row.zcounterpty);
    const topValuesCr = top8.map((row) => row.zclosing_amt / 1e7);

    let mainChart = null;
    if (mainChartRef.current && topLabels.length) {
      mainChart = new Chart(mainChartRef.current.getContext('2d'), {
        type: 'bar',
        data: {
          labels: topLabels,
          datasets: [{
            label: 'Exposure (Cr)',
            data: topValuesCr,
            backgroundColor: palette.slice(0, topLabels.length).map((color) => `${color}66`),
            borderColor: palette.slice(0, topLabels.length),
            borderWidth: 1.5,
            borderRadius: 8,
            maxBarThickness: 38,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: false,
          indexAxis: chartMode === 'hbar' ? 'y' : 'x',
          plugins: {
            legend: { display: false },
          },
          scales: {
            x: {
              ticks: { maxRotation: chartMode === 'hbar' ? 0 : 35 },
              grid: { display: false },
            },
            y: {
              beginAtZero: true,
              grid: { color: '#eaf3fb' },
              ticks: {
                callback: (value) => `${value} Cr`,
              },
            },
          },
        },
      });
    }

    let donutChart = null;
    if (donutChartRef.current && topLabels.length) {
      donutChart = new Chart(donutChartRef.current.getContext('2d'), {
        type: 'doughnut',
        data: {
          labels: topLabels,
          datasets: [{
            data: topValuesCr,
            backgroundColor: palette.slice(0, topLabels.length).map((color) => `${color}cc`),
            borderWidth: 0,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: false,
          cutout: '62%',
          plugins: {
            legend: { display: false },
          },
        },
      });
    }

    let cumulativeChart = null;
    if (cumulativeChartRef.current && tableRows.length) {
      const cumulativeLabels = tableRows.map((row) => `L${row.rank}`);
      const cumulativeValues = tableRows.map((row) => Number(row.cumulativePct.toFixed(2)));
      cumulativeChart = new Chart(cumulativeChartRef.current.getContext('2d'), {
        type: 'line',
        data: {
          labels: cumulativeLabels,
          datasets: [{
            label: 'Cumulative %',
            data: cumulativeValues,
            fill: true,
            tension: 0.3,
            borderColor: '#1565c0',
            backgroundColor: 'rgba(21,101,192,.10)',
            pointBackgroundColor: '#1565c0',
            pointRadius: 3,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: false,
          plugins: { legend: { display: false } },
          scales: {
            y: {
              beginAtZero: true,
              max: 100,
              ticks: { callback: (value) => `${value}%` },
              grid: { color: '#eaf3fb' },
            },
            x: {
              grid: { display: false },
            },
          },
        },
      });
    }

    let tierChart = null;
    if (tierChartRef.current && tableRows.length) {
      tierChart = new Chart(tierChartRef.current.getContext('2d'), {
        type: 'doughnut',
        data: {
          labels: ['>=10%', '5-10%', '<5%'],
          datasets: [{
            data: [tierCounts.high, tierCounts.mid, tierCounts.low],
            backgroundColor: ['#d32f2f', '#f57c00', '#1976d2'],
            borderWidth: 0,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: false,
          cutout: '58%',
          plugins: { legend: { display: false } },
        },
      });
    }

    return () => {
      destroyChart(mainChart);
      destroyChart(donutChart);
      destroyChart(cumulativeChart);
      destroyChart(tierChart);
    };
  }, [chartMode, isActive, tableRows, tierCounts.high, tierCounts.low, tierCounts.mid, top8]);

  return (
    <div className={`page ${isActive ? 'active' : ''}`} id="page-lenders">
      <div className="section-label">Lender Concentration KPIs</div>

      <div className="kpi-grid">
        <div className="kpi-card c1">
          <div className="kpi-body">
            <div className="kpi-top">
              <div className="kpi-icon-wrap">
                <svg viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                </svg>
              </div>
              <span className="kpi-badge up">Top Lender</span>
            </div>
            <div className="kpi-label" id="lend1Name">{top1?.zcounterpty || '—'}</div>
            <div className="kpi-value" id="lend1B">{top1 ? `Rs ${formatCrores(top1.zclosing_amt)} Cr` : '—'}</div>
            <div className="kpi-sub">Largest single lender exposure</div>
            <div className="kpi-spark">
              <div className="kpi-spark-fill" id="sparkL1" style={{ width: `${Math.min(top1Pct, 100)}%` }} />
            </div>
            <div className="kpi-divider" />
            <div className="kpi-footer">
              <div className="kpi-footer-dot" />
              <span id="lend1Footer">{top1 ? `${top1Pct.toFixed(1)}% of total book` : '—'}</span>
            </div>
          </div>
        </div>

        <div className="kpi-card c2">
          <div className="kpi-body">
            <div className="kpi-top">
              <div className="kpi-icon-wrap">
                <svg viewBox="0 0 24 24">
                  <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
                </svg>
              </div>
              <span className="kpi-badge neutral">Top 3</span>
            </div>
            <div className="kpi-label">Top 3 Lenders</div>
            <div className="kpi-value" id="top3Pct">{totalExposure > 0 ? `${top3Pct.toFixed(1)}%` : '—'}</div>
            <div className="kpi-sub">Concentration of top 3 counterparties</div>
            <div className="kpi-spark">
              <div className="kpi-spark-fill" id="sparkTop3" style={{ width: `${Math.min(top3Pct, 100)}%` }} />
            </div>
            <div className="kpi-divider" />
            <div className="kpi-footer">
              <div className="kpi-footer-dot" />
              <span id="top3Footer">{top3Amount > 0 ? `Rs ${formatCrores(top3Amount)} Cr combined` : '—'}</span>
            </div>
          </div>
        </div>

        <div className="kpi-card c3">
          <div className="kpi-body">
            <div className="kpi-top">
              <div className="kpi-icon-wrap">
                <svg viewBox="0 0 24 24">
                  <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z" />
                </svg>
              </div>
              <span className="kpi-badge neutral">Total</span>
            </div>
            <div className="kpi-label">Total Lenders</div>
            <div className="kpi-value" id="lendCnt">{lenderCount || '—'}</div>
            <div className="kpi-sub">Distinct counterparties in portfolio</div>
            <div className="kpi-spark">
              <div className="kpi-spark-fill" style={{ width: `${Math.min(25 + lenderCount * 3, 100)}%` }} />
            </div>
            <div className="kpi-divider" />
            <div className="kpi-footer">
              <div className="kpi-footer-dot" />
              <span id="lendCntFooter">{totalExposure > 0 ? `Total Rs ${formatCrores(totalExposure)} Cr` : '—'}</span>
            </div>
          </div>
        </div>

        <div className="kpi-card c4">
          <div className="kpi-body">
            <div className="kpi-top">
              <div className="kpi-icon-wrap">
                <svg viewBox="0 0 24 24">
                  <path d="M7 2v11h3v9l7-12h-4l4-8z" />
                </svg>
              </div>
              <span className="kpi-badge up">L2</span>
            </div>
            <div className="kpi-label" id="lend2Name">{top2?.zcounterpty || '—'}</div>
            <div className="kpi-value" id="lend2Pct">{top2 ? `${top2Pct.toFixed(1)}%` : '—'}</div>
            <div className="kpi-sub">Second largest lender concentration</div>
            <div className="kpi-spark">
              <div className="kpi-spark-fill" id="sparkL2" style={{ width: `${Math.min(top2Pct, 100)}%` }} />
            </div>
            <div className="kpi-divider" />
            <div className="kpi-footer">
              <div className="kpi-footer-dot" />
              <span id="lend2Footer">{top2 ? `Rs ${formatCrores(top2.zclosing_amt)} Cr exposure` : '—'}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="section-label">Lender Exposure Analysis</div>
      <div className="chart-card" style={{ marginBottom: 18 }}>
        <div className="chart-header">
          <div>
            <div className="chart-title">Lender Exposures (Rs Cr)</div>
            <div className="chart-subtitle">TOP 8 COUNTERPARTIES</div>
          </div>
          <div className="chart-tabs">
            <button
              className={`tab ${chartMode === 'bar' ? 'active' : ''}`}
              onClick={() => {
                setChartMode('bar');
              }}
            >
              Bar
            </button>
            <button
              className={`tab ${chartMode === 'hbar' ? 'active' : ''}`}
              onClick={() => {
                setChartMode('hbar');
              }}
            >
              H-Bar
            </button>
          </div>
        </div>
        <div className="chart-wrap h320">
          <canvas id="lenderMainChart" ref={mainChartRef} />
        </div>
      </div>

      <div className="three-col">
        <div className="chart-card">
          <div className="chart-header">
            <div>
              <div className="chart-title">Top Lenders Share</div>
              <div className="chart-subtitle">DONUT VIEW</div>
            </div>
          </div>
          <div className="chart-wrap h200">
            <canvas id="lenderDonut" ref={donutChartRef} />
          </div>
          <div className="donut-legend" id="lenderDonutLegend">
            {donutLegend.length ? donutLegend.map((item, index) => (
              <div className="legend-row" key={`${item.label}-${index}`}>
                <div className="legend-dot" />
                <div className="legend-label">{item.label}</div>
                <div className="legend-val">Rs {item.amountCr} Cr</div>
                <div className="legend-pct">{item.pct.toFixed(1)}%</div>
              </div>
            )) : (
              <div className="legend-row">
                <div className="legend-label">No lender data</div>
              </div>
            )}
          </div>
        </div>

        <div className="chart-card">
          <div className="chart-header">
            <div>
              <div className="chart-title">Cumulative Concentration</div>
              <div className="chart-subtitle">%</div>
            </div>
          </div>
          <div className="chart-wrap h200">
            <canvas id="lenderCumulChart" ref={cumulativeChartRef} />
          </div>
        </div>

        <div className="chart-card">
          <div className="chart-header">
            <div>
              <div className="chart-title">Tier Distribution</div>
              <div className="chart-subtitle">&ge;10% / 5-10% / &lt;5%</div>
            </div>
          </div>
          <div className="chart-wrap h200">
            <canvas id="lenderTierDonut" ref={tierChartRef} />
          </div>
          <div className="donut-legend">
            <div className="legend-row">
              <div className="legend-label">High (&ge;10%)</div>
              <div className="legend-val">{tierCounts.high}</div>
            </div>
            <div className="legend-row">
              <div className="legend-label">Medium (5-10%)</div>
              <div className="legend-val">{tierCounts.mid}</div>
            </div>
            <div className="legend-row">
              <div className="legend-label">Low (&lt;5%)</div>
              <div className="legend-val">{tierCounts.low}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="section-label">Lender Detail Table</div>
      <div className="chart-card">
        <table className="data-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Counterparty</th>
              <th>Exposure (Cr)</th>
              <th>Share %</th>
              <th>Cumulative %</th>
              <th>Risk Band</th>
            </tr>
          </thead>
          <tbody id="lenderTable">
            {tableRows.length ? tableRows.map((row) => (
              <tr key={`${row.name}-${row.rank}`}>
                <td>{row.rank}</td>
                <td>{row.name}</td>
                <td>{row.exposureCr}</td>
                <td>{row.sharePct.toFixed(2)}%</td>
                <td>{row.cumulativePct.toFixed(2)}%</td>
                <td>
                  <span className={row.riskClassName}>{row.riskLabel}</span>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center' }}>No lender data available.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
