<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\HasOne;

class Teacher extends User
{
    protected $table = 'users';

    protected static function newFactory()
    {
        return \Database\Factories\TeacherFactory::new();
    }

    public function profile(): HasOne
    {
        return $this->hasOne(UserProfile::class, 'user_id');
    }
}
