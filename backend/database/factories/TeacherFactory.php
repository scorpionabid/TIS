<?php

namespace Database\Factories;

use App\Models\Teacher;

class TeacherFactory extends UserFactory
{
    protected $model = Teacher::class;

    public function definition(): array
    {
        return parent::definition();
    }
}
