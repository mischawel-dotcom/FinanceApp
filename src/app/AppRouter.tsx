import { BrowserRouter, Routes, Route } from 'react-router-dom';
import AppShell from './layout/AppShell';

// Pages
import DashboardPage from '@features/dashboard/DashboardPage';
import IncomePage from '@features/income/IncomePage';
import ExpensesPage from '@features/expenses/ExpensesPage';
import AssetsPage from '@features/assets/AssetsPage';
import GoalsPage from '@features/goals/GoalsPage';
import RecommendationsPage from '@features/recommendations/RecommendationsPage';
import PlanningPage from '@features/planning/PlanningPage';
import ReportsPage from '@features/reports/ReportsPage';
import SettingsPage from '@features/settings/SettingsPage';

export default function AppRouter() {
  return (
    <BrowserRouter basename="/FinanceApp" future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AppShell>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/income" element={<IncomePage />} />
          <Route path="/expenses" element={<ExpensesPage />} />
          <Route path="/assets" element={<AssetsPage />} />
          <Route path="/goals" element={<GoalsPage />} />
          <Route path="/recommendations" element={<RecommendationsPage />} />
          <Route path="/planning" element={<PlanningPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </AppShell>
    </BrowserRouter>
  );
}
