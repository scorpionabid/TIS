<?php

namespace App\Http\Traits;

trait ValidationRules
{
    /**
     * Common pagination validation rules
     */
    protected function getPaginationRules(): array
    {
        return [
            'per_page' => 'nullable|integer|min:1|max:100',
            'page' => 'nullable|integer|min:1'
        ];
    }

    /**
     * Common search validation rules
     */
    protected function getSearchRules(): array
    {
        return [
            'search' => 'nullable|string|max:255'
        ];
    }

    /**
     * Common sorting validation rules
     */
    protected function getSortingRules(array $sortableFields = []): array
    {
        $rules = [
            'sort_direction' => 'nullable|string|in:asc,desc'
        ];

        if (!empty($sortableFields)) {
            $rules['sort_by'] = 'nullable|string|in:' . implode(',', $sortableFields);
        }

        return $rules;
    }

    /**
     * Common date range validation rules
     */
    protected function getDateRangeRules(string $prefix = ''): array
    {
        $prefix = $prefix ? $prefix . '_' : '';
        
        return [
            $prefix . 'from' => 'nullable|date',
            $prefix . 'to' => 'nullable|date|after_or_equal:' . $prefix . 'from'
        ];
    }

    /**
     * Common status validation rules
     */
    protected function getStatusRules(): array
    {
        return [
            'status' => 'nullable|string|in:active,inactive',
            'is_active' => 'nullable|boolean'
        ];
    }

    /**
     * Common bulk operation validation rules
     */
    protected function getBulkOperationRules(string $entityName = 'items', int $maxItems = 100): array
    {
        $idField = $this->getIdFieldName($entityName);
        $tableName = $this->getTableName($entityName);

        return [
            $idField => "required|array|min:1|max:{$maxItems}",
            "{$idField}.*" => "integer|exists:{$tableName},id"
        ];
    }

    /**
     * User-specific validation rules
     */
    protected function getUserValidationRules(): array
    {
        return array_merge(
            $this->getPaginationRules(),
            $this->getSearchRules(),
            $this->getSortingRules(['username', 'email', 'created_at', 'last_login_at']),
            $this->getDateRangeRules('created'),
            $this->getDateRangeRules('last_login'),
            [
                'role' => 'nullable|string|exists:roles,name',
                'institution' => 'nullable|integer|exists:institutions,id',
                'institution_id' => 'nullable|integer|exists:institutions,id',
                'department' => 'nullable|string'
            ]
        );
    }

    /**
     * Institution-specific validation rules
     */
    protected function getInstitutionValidationRules(): array
    {
        return array_merge(
            $this->getPaginationRules(),
            $this->getSearchRules(),
            $this->getSortingRules(['name', 'type', 'level', 'created_at', 'established_date']),
            $this->getStatusRules(),
            [
                'type' => 'nullable|string|in:ministry,region,sektor,school,vocational,university',
                'level' => 'nullable|integer|between:1,5',
                'parent_id' => 'nullable|integer|exists:institutions,id',
                'region_code' => 'nullable|string|max:10'
            ]
        );
    }

    /**
     * Department-specific validation rules
     */
    protected function getDepartmentValidationRules(): array
    {
        return array_merge(
            $this->getPaginationRules(),
            $this->getSearchRules(),
            $this->getSortingRules(['name', 'short_name', 'department_type', 'created_at']),
            $this->getStatusRules(),
            [
                'institution_id' => 'nullable|integer|exists:institutions,id',
                'parent_id' => 'nullable|integer|exists:departments,id',
                'department_type' => 'nullable|string|max:50',
                'hierarchy' => 'nullable|boolean'
            ]
        );
    }

    /**
     * Survey-specific validation rules
     */
    protected function getSurveyValidationRules(): array
    {
        return array_merge(
            $this->getPaginationRules(),
            $this->getSearchRules(),
            $this->getSortingRules(['title', 'created_at', 'starts_at', 'ends_at']),
            $this->getStatusRules(),
            [
                'type' => 'nullable|string|in:public,targeted,private',
                'creator_id' => 'nullable|integer|exists:users,id',
                'institution_id' => 'nullable|integer|exists:institutions,id',
                'starts_from' => 'nullable|date',
                'starts_to' => 'nullable|date',
                'ends_from' => 'nullable|date',
                'ends_to' => 'nullable|date'
            ]
        );
    }

    /**
     * Task-specific validation rules
     */
    protected function getTaskValidationRules(): array
    {
        return array_merge(
            $this->getPaginationRules(),
            $this->getSearchRules(),
            $this->getSortingRules(['title', 'priority', 'status', 'due_date', 'created_at']),
            [
                'status' => 'nullable|string|in:pending,in_progress,completed,cancelled',
                'priority' => 'nullable|string|in:low,medium,high,urgent',
                'assignee_id' => 'nullable|integer|exists:users,id',
                'creator_id' => 'nullable|integer|exists:users,id',
                'institution_id' => 'nullable|integer|exists:institutions,id',
                'due_from' => 'nullable|date',
                'due_to' => 'nullable|date'
            ]
        );
    }

    /**
     * Export validation rules
     */
    protected function getExportValidationRules(): array
    {
        return [
            'format' => 'required|string|in:csv,json,xlsx',
            'filters' => 'nullable|array',
            'include_deleted' => 'nullable|boolean',
            'include_relations' => 'nullable|boolean'
        ];
    }

    /**
     * Get ID field name for entity
     */
    private function getIdFieldName(string $entityName): string
    {
        return $entityName === 'items' ? 'ids' : "{$entityName}_ids";
    }

    /**
     * Get table name for entity
     */
    private function getTableName(string $entityName): string
    {
        $tableMap = [
            'users' => 'users',
            'institutions' => 'institutions',
            'departments' => 'departments',
            'surveys' => 'surveys',
            'tasks' => 'tasks',
            'items' => 'items'
        ];

        return $tableMap[$entityName] ?? $entityName;
    }
}