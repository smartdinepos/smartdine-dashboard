import React from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Home from './Components/Home.jsx';
import RestaurantLayout from './Components/restaurant/RestaurantLayout.jsx';
import MenuPage from './Components/restaurant/section/MenuPage.jsx';
import UpsellPage from './Components/restaurant/section/Upsell.jsx';
import OrdersPage from './Components/restaurant/section/OrdersPage.jsx';
import TablesPage from './Components/restaurant/section/TablesPage.jsx';
import BillingPage from './Components/restaurant/section/BillingPage.jsx';
import SettingsPage from './Components/restaurant/section/SettingsPage.jsx';
import HelpPage from './Components/restaurant/section/HelpPage.jsx';
import CategoryGroups from './Components/restaurant/section/CategoryGroups.jsx';
import CategoriesPage from './Components/restaurant/section/CategoriesPage.jsx';
import CategoryEditPage from './Components/restaurant/section/CategoryEditPage.jsx';
import 'antd/dist/reset.css';
import './index.css';

const router = createBrowserRouter([
  { path: '/', element: <Home /> },
  {
    path: '/restaurants/:rid',
    element: <RestaurantLayout />,
    children: [
      { index: true, element: <Navigate to='menu' replace /> },
      { path: 'menu', element: <MenuPage />, handle: { title: 'Menu Management' } },
      { path: 'category-groups', element: <CategoryGroups />, handle: { title: 'Category Groups' } },
      { path: 'categories', element: <CategoriesPage />, handle: { title: 'Categories' } },
      { path: 'categories/:categoryId', element: <CategoryEditPage />, handle: { title: 'Edit Category' } },
      { path: 'upsell', element: <UpsellPage />, handle: { title: 'Upsell' } },
      { path: 'orders', element: <OrdersPage />, handle: { title: 'Orders' } },
      { path: 'tables', element: <TablesPage />, handle: { title: 'Tables' } },
      { path: 'billing', element: <BillingPage />, handle: { title: 'Billing' } },
      { path: 'settings', element: <SettingsPage />, handle: { title: 'Settings' } },
      { path: 'help', element: <HelpPage />, handle: { title: 'Help' } }
    ]
  }
]);

const client = new QueryClient();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </React.StrictMode>
);
