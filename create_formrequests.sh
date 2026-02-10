#!/bin/bash

# FormRequest Creation Script
# Create FormRequest classes for controllers with inline validation

echo "🚀 Starting FormRequest Creation..."
echo "Target: 3 controllers → FormRequest classes"
echo ""

# Controllers to process
CONTROLLERS=(
    "backend/app/Http/Controllers/Attendance/RegionalAttendanceController.php"
    "backend/app/Http/Controllers/PermissionController.php"
    "backend/app/Http/Controllers/UserBulkController.php"
)

for controller in "${CONTROLLERS[@]}"; do
    echo "📝 Processing: $controller"
    
    # Get controller name
    controller_name=$(basename "$controller" .php)
    
    # Create FormRequest directory if not exists
    formrequest_dir="backend/app/Http/Requests"
    mkdir -p "$formrequest_dir"
    
    # Create StoreRequest
    store_request="${formrequest_dir}/${controller_name}StoreRequest.php"
    echo "📋 Creating: $store_request"
    
    cat > "$store_request" << EOF
<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ${controller_name}StoreRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            // Add validation rules based on controller
        ];
    }

    /**
     * Get custom error messages for validation failures.
     *
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            // Add custom messages
        ];
    }
}
EOF

    # Create UpdateRequest
    update_request="${formrequest_dir}/${controller_name}UpdateRequest.php"
    echo "📋 Creating: $update_request"
    
    cat > "$update_request" << EOF
<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ${controller_name}UpdateRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            // Add validation rules based on controller
        ];
    }

    /**
     * Get custom error messages for validation failures.
     *
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            // Add custom messages
        ];
    }
}
EOF

    echo "✅ FormRequest created: $controller_name"
    echo ""
done

echo "🎉 FormRequest Creation Complete!"
echo "📊 Summary:"
echo "- 3 controllers processed"
echo "- 6 FormRequest classes created"
echo "- Ready for controller updates"
echo ""
echo "🚀 Next: Update controllers to use FormRequest"
