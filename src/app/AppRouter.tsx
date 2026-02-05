import { BrowserRouter, Routes, Route } from 'react-router-dom';
import AppShell from './layout/AppShell';

// Pages
import DashboardPage from '@features/dashboard/DashboardPage';
import IncomePage from '@features/income/IncomePage';
import ExpensesPage from '@features/expenses/ExpensesPage';
import AssetsPage from '@features/assets/AssetsPage';
import GoalsPage from '@features/goals/GoalsPage';
import RecommendationsPage from '@features/recommendations/RecommendationsPage';
import ReportsPage from '@features/reports/ReportsPage';

export default function AppRouter() {
  return (
    <BrowserRouter>
      <AppShell>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/income" element={<IncomePage />} />
          <Route path="/expenses" element={<ExpensesPage />} />
          <Route path="/assets" element={<AssetsPage />} />
          <Route path="/goals" element={<GoalsPage />} />
          <Route path="/recommendations" element={<RecommendationsPage />} />
          <Route path="/reports" element={<ReportsPage />} />
        </Routes>
      </AppShell>
    </BrowserRouter>
  );
}
