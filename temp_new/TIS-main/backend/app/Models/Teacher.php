<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Teacher extends User
{
    protected $table = 'users';

    protected static function newFactory()
    {
        return \Database\Factories\TeacherFactory::new();
    }

    /**
     * Müəllimin xüsusi profili (teacher_profiles cədvəli).
     * Əvvəl bu metod UserProfile-ə (ümumi profil) bağlı idi — DÜZƏLDİLDİ.
     */
    public function teacherProfile(): HasOne
    {
        return $this->hasOne(TeacherProfile::class, 'user_id');
    }

    /**
     * Ümumi istifadəçi profili (user_profiles cədvəli).
     * Köhnə `profile()` metodu saxlanılır — b/w uyğunluq üçün.
     */
    public function profile(): HasOne
    {
        return $this->hasOne(UserProfile::class, 'user_id');
    }

    /**
     * Müəllimin iş yerləri (teacher_workplaces cədvəli).
     */
    public function workplaces(): HasMany
    {
        return $this->hasMany(TeacherWorkplace::class, 'user_id');
    }

    /**
     * Müəllimin əsas iş yeri.
     */
    public function primaryWorkplace(): HasOne
    {
        return $this->hasOne(TeacherWorkplace::class, 'user_id')
            ->where('workplace_priority', 'primary')
            ->where('status', 'active');
    }

    /**
     * Müəllimin tədris etdiyi fənlər (teacher_subjects cədvəli).
     */
    public function teacherSubjects(): HasMany
    {
        return $this->hasMany(TeacherSubject::class, 'teacher_id');
    }
}
