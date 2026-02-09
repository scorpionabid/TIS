<?php

namespace App\Models;

use App\Models\Traits\HasCreator;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SurveyTemplate extends Model
{
    use HasFactory, HasCreator;

    protected $fillable = [
        'name',
        'description',
        'questions',
        'settings',
    ];

    protected $casts = [
        'questions' => 'array',
        'settings' => 'array',
    ];

    /**
     * Get the title attribute (alias for name)
     */
    public function getTitleAttribute()
    {
        return $this->name;
    }
}
