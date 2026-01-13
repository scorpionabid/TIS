# Task Page Improvement Plan

Based on the analysis of the "Tasks" page, the following improvement plan has been prepared.

## 1. Hybrid Sorting Logic Correction

- **Problem:** Currently, sorting is done on both the server (backend) and the client (frontend). Client-side sorting only covers the data on the current page, which can mislead users.
- **Suggestion:** Move all sorting logic to the server-side. This requires making corresponding changes in the backend to support sorting on all columns.

## 2. Client-Side Statistics Calculation

- **Problem:** Statistical data (number of pending, in-progress tasks) is calculated based only on the data on the current page. This does not provide accurate information about the total count.
- **Suggestion:** The API should return an object reflecting the overall statistical data in the response to the request made to the `/api/tasks` endpoint.

## 3. Complexity of the `ExcelTaskTable` Component

- **Problem:** The `ExcelTaskTable` component and its related hooks (`useInlineEdit`, `useBulkEdit`) are very complex. This makes future changes, bug fixing, and performance optimization difficult.
- **Suggestion:** Be cautious when adding new functionality to this component. Add integration or end-to-end tests to check complex user interactions and prevent regressions. Focus performance optimization efforts primarily on this component.

## 4. API Request within `Tasks.tsx`

- **Problem:** The main page component sends direct API requests for `assignableUsers` and `availableDepartments`.
- **Suggestion:** Move this logic to the `useTasksData` hook or a new hook to centralize the data-fetching logic and keep the page component clean.
