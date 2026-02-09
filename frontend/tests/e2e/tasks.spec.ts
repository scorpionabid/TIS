import { test, expect } from '@playwright/test'

test.describe('Tasks E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('http://localhost:3000/login')
    await page.fill('input[type="email"]', 'superadmin@atis.az')
    await page.fill('input[type="password"]', 'admin123')
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL(/.*\/dashboard/)
  })

  test('should display tasks page', async ({ page }) => {
    await page.goto('http://localhost:3000/tasks')
    
    // Check page elements
    await expect(page.locator('h1')).toContainText('Tasks')
    await expect(page.locator('[data-testid="tasks-table"]')).toBeVisible()
    await expect(page.locator('[data-testid="create-task-button"]')).toBeVisible()
  })

  test('should create new task', async ({ page }) => {
    await page.goto('http://localhost:3000/tasks')
    
    // Click create task button
    await page.click('[data-testid="create-task-button"]')
    
    // Should open task modal
    await expect(page.locator('[data-testid="task-modal"]')).toBeVisible()
    
    // Fill task form
    await page.fill('[data-testid="task-title"]', 'Test Task E2E')
    await page.fill('[data-testid="task-description"]', 'This is a test task created by E2E automation')
    await page.selectOption('[data-testid="task-priority"]', 'high')
    
    // Submit form
    await page.click('[data-testid="save-task-button"]')
    
    // Should close modal and show success message
    await expect(page.locator('[data-testid="task-modal"]')).not.toBeVisible()
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible()
    
    // Check if task appears in table
    await expect(page.locator('[data-testid="tasks-table"]')).toContainText('Test Task E2E')
  })

  test('should edit existing task', async ({ page }) => {
    await page.goto('http://localhost:3000/tasks')
    
    // Find and click edit button for first task
    await page.click('[data-testid="edit-task-button"]:first-child')
    
    // Should open edit modal
    await expect(page.locator('[data-testid="task-modal"]')).toBeVisible()
    
    // Edit task title
    await page.fill('[data-testid="task-title"]', 'Edited Task E2E')
    await page.click('[data-testid="save-task-button"]')
    
    // Should update task
    await expect(page.locator('[data-testid="tasks-table"]')).toContainText('Edited Task E2E')
  })

  test('should delete task', async ({ page }) => {
    await page.goto('http://localhost:3000/tasks')
    
    // Get initial task count
    const initialCount = await page.locator('[data-testid="task-row"]').count()
    
    // Click delete button for first task
    await page.click('[data-testid="delete-task-button"]:first-child')
    
    // Should show confirmation dialog
    await expect(page.locator('[data-testid="confirm-dialog"]')).toBeVisible()
    
    // Confirm deletion
    await page.click('[data-testid="confirm-delete-button"]')
    
    // Should remove task from table
    await expect(page.locator('[data-testid="task-row"]')).toHaveCount(initialCount - 1)
  })

  test('should filter tasks by status', async ({ page }) => {
    await page.goto('http://localhost:3000/tasks')
    
    // Filter by status
    await page.selectOption('[data-testid="status-filter"]', 'pending')
    
    // Should filter table
    await expect(page.locator('[data-testid="tasks-table"]')).toBeVisible()
    
    // Check if filtered results are correct
    const statusBadges = page.locator('[data-testid="status-badge"]')
    const firstBadge = await statusBadges.first().textContent()
    expect(firstBadge).toBe('Pending')
  })

  test('should search tasks', async ({ page }) => {
    await page.goto('http://localhost:3000/tasks')
    
    // Search for specific task
    await page.fill('[data-testid="search-input"]', 'Test Task')
    
    // Should filter table
    await expect(page.locator('[data-testid="tasks-table"]')).toBeVisible()
    
    // Check if search results are correct
    await expect(page.locator('[data-testid="tasks-table"]')).toContainText('Test Task')
  })

  test('should handle pagination', async ({ page }) => {
    await page.goto('http://localhost:3000/tasks')
    
    // Check pagination elements
    await expect(page.locator('[data-testid="pagination"]')).toBeVisible()
    await expect(page.locator('[data-testid="next-page"]')).toBeVisible()
    
    // Click next page
    await page.click('[data-testid="next-page"]')
    
    // Should navigate to next page
    await expect(page.locator('[data-testid="current-page"]')).toContainText('2')
  })

  test('should handle bulk operations', async ({ page }) => {
    await page.goto('http://localhost:3000/tasks')
    
    // Select multiple tasks
    await page.check('[data-testid="task-checkbox"]:first-child')
    await page.check('[data-testid="task-checkbox"]:nth-child(2)')
    
    // Bulk operations should appear
    await expect(page.locator('[data-testid="bulk-actions"]')).toBeVisible()
    
    // Perform bulk action
    await page.click('[data-testid="bulk-complete-button"]')
    
    // Should show confirmation
    await expect(page.locator('[data-testid="bulk-confirm-dialog"]')).toBeVisible()
  })
})
