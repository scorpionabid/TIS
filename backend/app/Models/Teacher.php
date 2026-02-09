<?php

namespace App\Models;

use App\Models\Traits\HasTeacher;
use App\Models\Traits\HasUser;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Teacher extends User
{
    use HasTeacher, HasUser;
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
