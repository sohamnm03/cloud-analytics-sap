import { useEffect, useState } from "react";
import {
  ChartTooltip,
  DashboardHeader,
  ExportOverlay,
  FtrEditModal,
  LoadingScreen,
} from "./components/layout/DashboardShell";
import { AnalyticsPage }    from "./components/pages/AnalyticsPage";
import { MaturityPage }     from "./components/pages/MaturityPage";
import { LendersPage }      from "./components/pages/LendersPage";
import { OverviewPage }     from "./components/pages/OverviewPage";
import { PortfolioPage }    from "./components/pages/PortfolioPage";
import {BorrowersPage}      from "./components/pages/BorrowersPage";
import { TransactionsPage } from "./components/pages/TransactionsPage";
import { useAuth }          from "./hooks/useAuth";
import { queryData }        from "./lib/api";
import { activateDashboardPage, bootCofDashboard } from "./lib/cofDashboardEngine";

function SessionError({ message }) {
  return (
    <div className="wrapper" style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: "32px" }}>
      <div className="card" style={{ maxWidth: "560px", width: "100%", padding: "28px" }}>
        <div className="section-eyebrow">Session Error</div>
        <h2 style={{ margin: "10px 0 12px", fontSize: "1.5rem" }}>Backend session required</h2>
        <p style={{ margin: 0, color: "var(--text-muted)" }}>{message}</p>
      </div>
    </div>
  );
}

function App() {
  const auth = useAuth();
  const [activePage, setActivePage] = useState("overview");
  const [isLoading,  setIsLoading]  = useState(true);
  const [loadError,  setLoadError]  = useState("");
  const [reportState, setReportState] = useState({ totals: {}, lenders: [], products: [], borrowers: [], portfolios: [], assets: [], sanctionVsOs: [], productBpExposure: [] });

  useEffect(() => {
    if (auth.status !== "valid") return undefined;

    let cancelled = false;

    (async () => {
      try {
        // queryData(apiBase, token, queryType, filters)
        // session_id is picked up automatically from the URL by api.js
        const dashboard = await queryData(
  auth.env.apiBase,
  auth.env.token,
  "cof_dashboard",
  {}, // filters
  [
    {
      zprd_type: "LOAN",
      zprd_desc: "Test Loan",
      zcounterpty: "HDFC",
      zrate_type: "Fixed",
      zportfo_desc: "Secured",
      zclosing_amt: 1000000,
      zaccrual_amt: 5000,
      zwt_avg_amt: 1000000,
      zavg_funds: 1000000,
      zwt_int_amt: 3000,
      zavg_rate_eir: 5.5,
      zend_date: "20271231"
    },
        {
      zprd_type: "EMI",
      zprd_desc: "Test Loan 2",
      zcounterpty: "ICICI",
      zrate_type: "Fixed",
      zportfo_desc: "Secured",
      zclosing_amt: 1000000,
      zaccrual_amt: 5000,
      zwt_avg_amt: 1000000,
      zavg_funds: 1000000,
      zwt_int_amt: 3000,
      zavg_rate_eir: 5.5,
      zend_date: "20271231"
    }
  ]
);

        if (!cancelled) {
          const rs = dashboard?.render_state || {};
          setReportState({
            totals:       rs.totals       || {},
            lenders:      Array.isArray(rs.lenders)      ? rs.lenders      : [],
            products: Array.isArray(rs.products) ? rs.products : [],
            borrowers: Array.isArray(rs.borrowers) ? rs.borrowers : [],
            portfolios: Array.isArray(rs.portfolios) ? rs.portfolios : [],
            assets: Array.isArray(rs.asset_classification) ? rs.asset_classification : [],
            sanctionVsOs: Array.isArray(rs.sanctionVsOs) ? rs.sanctionVsOs : [],
            productBpExposure : Array.isArray(rs.productBpExposure ) ? rs.productBpExposure : [],
          });
          bootCofDashboard(dashboard);
        }
      } catch (error) {
        if (!cancelled) {
          setLoadError(error instanceof Error ? error.message : "Unable to load dashboard data.");
        }
      } finally {
        window.setTimeout(() => { if (!cancelled) setIsLoading(false); }, 600);
      }
    })();

    return () => { cancelled = true; };
  }, [auth.status, auth.env]);

  useEffect(() => {
    const id = window.setTimeout(() => activateDashboardPage(activePage), 0);
    return () => window.clearTimeout(id);
  }, [activePage]);

  if (auth.status === "error") return <SessionError message={auth.error} />;
  if (loadError)               return <SessionError message={loadError} />;

  return (
    <>
      {isLoading || auth.status === "loading" ? <LoadingScreen /> : null}
      <ExportOverlay />
      <FtrEditModal />
      <ChartTooltip />
      <div className="wrapper">
        <DashboardHeader activePage={activePage} onPageChange={setActivePage} />
        <OverviewPage
          isActive={activePage === "overview"}
          totals={reportState.totals}
          products={reportState.products}
          borrowers={reportState.borrowers}
          portfolios={reportState.portfolios}
          assets={reportState.assets}
          sanctionVsOs={reportState.sanctionVsOs}
          productBpExposure ={reportState.productBpExposure}
        />
        <AnalyticsPage isActive={activePage === "analytics"} />
        <PortfolioPage
          isActive={activePage === "portfolio"}
          totals={reportState.totals}
          products={reportState.products}
        />
        <BorrowersPage 
        isActive = {activePage === "borrower"}
        totals={reportState.totals}
        />
        <MaturityPage isActive={activePage === "maturity"} />
        <TransactionsPage
          isActive={activePage === "transactions"}
          totals={reportState.totals}
          transactions={reportState.transactions}
        />
        <LendersPage
          isActive={activePage === "lenders"}
          lenders={reportState.lenders}
          totals={reportState.totals}
        />
      </div>
    </>
  );
}

export default App;