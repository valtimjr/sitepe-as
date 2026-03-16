"use client";

import React from 'react';
import { Outlet } from 'react-router-dom';
import AppHeader from './AppHeader';
import { SidebarProvider } from './ui/sidebar';
import Sidebar from './Sidebar';

const Layout = () => {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <AppHeader />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;