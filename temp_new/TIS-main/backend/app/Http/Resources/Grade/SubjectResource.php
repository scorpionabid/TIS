<?php

namespace App\Http\Resources\Grade;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class SubjectResource extends JsonResource
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
            'name' => $this->name,
            'code' => $this->code ?? null,
            'weekly_hours' => $this->when(
                isset($this->pivot),
                fn () => $this->pivot->weekly_hours ?? null
            ),
            'teacher' => $this->whenLoaded('teacher', function () {
                return [
                    'id' => $this->teacher->id,
                    'full_name' => $this->teacher->full_name,
                    'email' => $this->teacher->email,
                ];
            }),
        ];
    }
}
