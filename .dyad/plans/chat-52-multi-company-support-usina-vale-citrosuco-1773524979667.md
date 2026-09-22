---
title: "Multi-Company Support (Usina Vale & Citrosuco)"
summary: "Implement multi-tenancy for \"Usina Vale\" and \"Citrosuco\" with URL-based routing (/:company), isolated database tables/columns, and company-specific branding."
chatId: "52"
createdAt: "2026-03-14T21:49:39.667Z"
updatedAt: "2026-03-14T21:49:39.667Z"
---

## Overview
The goal is to implement multi-tenancy for the application, supporting two variants: **Usina Vale** and **Citrosuco**. Each company will have its own URL prefix (`/usina_vale` and `/citrosuco`), isolated data (using either specific tables or a `company` column), and company-specific branding (logos and colors).

## UI/UX Design
- **URL Routing**: All existing routes will be nested under a `:company` parameter. For example, `/search-parts` becomes `/usina_vale/search-parts`.
- **Root Redirect**: Accessing the root URL (`/`) will automatically redirect the user to `/usina_vale`.
- **Branding**:
  - The `AppHeader` will display the logo based on the current company (using `/Usina Vale.png` or `/CitroSuco.png` from the public folder).
  - Primary colors and site titles will adjust based on the selected company.
- **Navigation**: Users can switch companies via a selector or simply by changing the URL.

## Considerations
- **Data Isolation**: 
  - `parts` and `afs` will use company-specific tables: `parts`/`afs` for Usina Vale and `parts_citrosuco`/`afs_citrosuco` for Citrosuco.
  - Other data (Service Orders, Time Tracking, Custom Lists) will be isolated using a new `company` column in their respective tables.
- **Offline Sync**: The local Dexie database will need to be updated to store and filter data by company to ensure isolation even when offline.
- **User Permissions**: Since users share the same login, their profiles will remain shared, but their created data will be company-scoped.

## Technical Approach
1. **Company Context**: Create a `CompanyProvider` to manage the current company state, derived from the URL parameters.
2. **Routing Update**: Use React Router's nested routes and a Layout component that extracts the `:company` parameter.
3. **Service Layer Abstraction**: Modify `partListService` and other services to accept the current company and dynamically select the table or filter results.
4. **Database Schema Update**: Add a `company` column to `daily_service_orders`, `monthly_apontamentos`, and `custom_lists`. (Note: I will provide the SQL instructions, and implement the frontend logic to handle it).

## Implementation Steps

### 1. Company Context & Provider
- Create `src/context/CompanyContext.tsx` to hold the current company (`'usina_vale'` or `'citrosuco'`).
- Add a hook `useCompany` for easy access.

### 2. Update Routing
- Modify `src/App.tsx` to wrap existing routes with a `:company` parameter.
- Add a redirect from `/` to `/usina_vale`.
- Ensure all `Link` components and `navigate` calls are updated to include the company prefix.

### 3. Service Layer Refactoring
- Update `src/services/partListService.ts`:
  - Functions like `getParts`, `searchParts`, `getAfsFromService` will now use the company to determine the table name.
  - Functions for service orders and pointing will include the `company` filter in Supabase queries.
- Update `src/services/localDbService.ts`:
  - Add `company` column to Dexie tables: `simplePartsList`, `serviceOrderItems`, `parts`, `afs`, `monthlyApontamentos`, `dailyServiceOrders`.
  - Update search and retrieval logic to filter by `company`.

### 4. Branding & UI Components
- Update `src/components/AppHeader.tsx`:
  - Dynamically load logo based on company.
  - Update navigation links to include company prefix.
- Update `src/pages/Index.tsx`:
  - Update greeting and cards to be company-aware.
- Update `src/components/ServiceOrderListDisplay.tsx` and other components to use company-aware fetching.

## Code Changes

### `src/App.tsx`
- Refactor routes to be nested under `/:company`.
- Add a root route that redirects to `/usina_vale`.

### `src/services/partListService.ts`
- Implement a helper to get the table name based on company.
- Update all Supabase calls to use the correct table or filter by company.

### `src/services/localDbService.ts`
- Update schema version and stores.
- Update data access methods to include company scope.

### `src/components/AppHeader.tsx`
- Inject company context and update logo/links.

## Testing Strategy
- **Company Switching**: Verify that switching between `/usina_vale` and `/citrosuco` updates the logo and data displayed.
- **Data Isolation**: Create an Order in Usina Vale and verify it doesn't appear in Citrosuco.
- **Parts/AFs**: Verify that Citrosuco searches use the `parts_citrosuco` table.
- **Offline Support**: Test offline sync and local storage for both companies.
