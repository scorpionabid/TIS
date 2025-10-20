<?php

namespace Tests\Feature;

use App\Models\Subject;
use App\Models\TeacherSubject;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Role as SpatieRole;
use Spatie\Permission\Middlewares\PermissionMiddleware;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

class SubjectManagementTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        /** @var PermissionRegistrar $registrar */
        $registrar = app(PermissionRegistrar::class);
        $registrar->forgetCachedPermissions();

        SpatieRole::firstOrCreate(['name' => 'superadmin', 'guard_name' => 'web']);
    }

    public function test_superadmin_can_create_and_update_subject(): void
    {
        $user = User::factory()->create();
        $user->assignRole('superadmin');

        Sanctum::actingAs($user, ['*']);
        $this->withoutMiddleware(PermissionMiddleware::class);

        $createPayload = [
            'name' => 'Biologiya',
            'code' => 'BIO-' . Str::upper(Str::random(4)),
            'description' => 'Biologiya fənni',
            'grade_levels' => [7, 8, 9],
            'weekly_hours' => 3,
            'category' => 'science',
        ];

        $createResponse = $this->postJson('/api/subjects', $createPayload);

        $createResponse->assertCreated()
            ->assertJson([
                'success' => true,
                'data' => [
                    'name' => 'Biologiya',
                    'category' => 'science',
                    'is_active' => true,
                ],
            ]);

        /** @var Subject $subject */
        $subject = Subject::firstWhere('code', $createPayload['code']);
        $this->assertNotNull($subject);
        $this->assertEqualsCanonicalizing([7, 8, 9], $subject->grade_levels);

        $updatePayload = [
            'name' => 'Biologiya (Yenilənmiş)',
            'weekly_hours' => 4,
            'grade_levels' => [8, 9, 10],
            'is_active' => false,
        ];

        $updateResponse = $this->putJson("/api/subjects/{$subject->id}", $updatePayload);

        $updateResponse->assertOk()
            ->assertJson([
                'success' => true,
                'data' => [
                    'name' => 'Biologiya (Yenilənmiş)',
                    'weekly_hours' => 4,
                    'is_active' => false,
                ],
            ]);

        $subject->refresh();
        $this->assertEqualsCanonicalizing([8, 9, 10], $subject->grade_levels);
        $this->assertFalse($subject->is_active);
    }

    public function test_subject_cannot_be_deleted_when_teacher_assignment_exists(): void
    {
        $user = User::factory()->create();
        $user->assignRole('superadmin');

        Sanctum::actingAs($user, ['*']);
        $this->withoutMiddleware(PermissionMiddleware::class);

        $subject = Subject::factory()->create();

        $teacher = User::factory()->create();

        TeacherSubject::create([
            'teacher_id' => $teacher->id,
            'subject_id' => $subject->id,
            'grade_levels' => [5],
            'specialization_level' => 'basic',
            'max_hours_per_week' => 10,
            'max_classes_per_day' => 4,
            'max_consecutive_classes' => 2,
            'valid_from' => now()->toDateString(),
            'is_active' => true,
        ]);

        $deleteResponse = $this->deleteJson("/api/subjects/{$subject->id}");

        $deleteResponse->assertStatus(422)
            ->assertJson([
                'success' => false,
                'message' => 'Bu fən hazırda istifadə edildiyi üçün silinə bilməz',
            ]);

        $this->assertDatabaseHas('subjects', ['id' => $subject->id]);
    }
}
