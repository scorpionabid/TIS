<?php

namespace App\Http\Requests\RegionAdmin;

use Illuminate\Foundation\Http\FormRequest;

class ImportTeacherRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('teachers.create') 
            || $this->user()->hasAnyRole(['superadmin', 'regionadmin']);
    }

    public function rules(): array
    {
        return [
            'file' => 'required|file|mimes:csv,txt,xlsx,xls|max:10240',
            'skip_duplicates' => 'nullable|boolean',
            'update_existing' => 'nullable|boolean',
            'strategy' => 'nullable|string|in:strict,skip_errors',
            'valid_rows_only' => 'nullable|boolean',
        ];
    }
}
