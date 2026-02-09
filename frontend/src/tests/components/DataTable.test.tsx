import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { DataTable } from '@/components/ui/data-table'
import { useDataTable } from '@/hooks/useDataTable'

// Mock data
const mockData = [
  { id: 1, name: 'John Doe', email: 'john@example.com', role: 'admin' },
  { id: 2, name: 'Jane Smith', email: 'jane@example.com', role: 'user' },
  { id: 3, name: 'Bob Johnson', email: 'bob@example.com', role: 'user' }
]

const mockColumns = [
  { id: 'name', header: 'Name', accessor: 'name', sortable: true },
  { id: 'email', header: 'Email', accessor: 'email', sortable: true },
  { id: 'role', header: 'Role', accessor: 'role', sortable: true }
]

describe('DataTable Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders table with data', () => {
    render(
      <DataTable
        columns={mockColumns}
        data={mockData}
        pagination={{
          page: 1,
          perPage: 10,
          total: mockData.length,
          onPageChange: vi.fn(),
          onPerPageChange: vi.fn()
        }}
      />
    )

    expect(screen.getByText('Name')).toBeInTheDocument()
    expect(screen.getByText('Email')).toBeInTheDocument()
    expect(screen.getByText('Role')).toBeInTheDocument()
  })

  it('renders loading state', () => {
    render(
      <DataTable
        columns={mockColumns}
        data={[]}
        isLoading={true}
        pagination={{
          page: 1,
          perPage: 10,
          total: 0,
          onPageChange: vi.fn(),
          onPerPageChange: vi.fn()
        }}
      />
    )

    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  it('renders empty state', () => {
    render(
      <DataTable
        columns={mockColumns}
        data={[]}
        empty={{
          title: 'No Data',
          description: 'There are no records to display'
        }}
      />
    )

    expect(screen.getByText('No Data')).toBeInTheDocument()
    expect(screen.getByText('There are no records to display')).toBeInTheDocument()
  })

  it('handles row click', async () => {
    const onRowClick = vi.fn()
    
    render(
      <DataTable
        columns={mockColumns}
        data={mockData}
        onRowClick={onRowClick}
        pagination={{
          page: 1,
          perPage: 10,
          total: mockData.length,
          onPageChange: vi.fn(),
          onPerPageChange: vi.fn()
        }}
      />
    )

    const firstRow = screen.getByText('John Doe').closest('tr')
    fireEvent.click(firstRow)

    expect(onRowClick).toHaveBeenCalledWith(mockData[0])
  })

  it('handles sorting', async () => {
    const onSort = vi.fn()
    
    render(
      <DataTable
        columns={mockColumns}
        data={mockData}
        onSort={onSort}
        sortColumn="name"
        sortDirection="asc"
        pagination={{
          page: 1,
          perPage: 10,
          total: mockData.length,
          onPageChange: vi.fn(),
          onPerPageChange: vi.fn()
        }}
      />
    )

    const nameHeader = screen.getByText('Name')
    fireEvent.click(nameHeader)

    expect(onSort).toHaveBeenCalledWith('name', 'desc')
  })

  it('handles pagination', async () => {
    const onPageChange = vi.fn()
    
    render(
      <DataTable
        columns={mockColumns}
        data={mockData}
        pagination={{
          page: 1,
          perPage: 2,
          total: mockData.length,
          onPageChange,
          onPerPageChange: vi.fn()
        }}
      />
    )

    const nextPageButton = screen.getByText('Next')
    fireEvent.click(nextPageButton)

    expect(onPageChange).toHaveBeenCalledWith(2)
  })
})
