<?php

namespace App\Http\Resources\Grade;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class StudentResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'full_name' => $this->full_name,
            'email' => $this->email,
            'gender' => $this->gender ?? null,
            'date_of_birth' => $this->date_of_birth ?? null,
            'enrollment_date' => $this->when(
                isset($this->pivot),
                fn() => $this->pivot->enrollment_date ?? null
            ),
        ];
    }
}
