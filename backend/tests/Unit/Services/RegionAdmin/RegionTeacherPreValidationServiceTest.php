<?php

namespace Tests\Unit\Services\RegionAdmin;

use App\Models\Institution;
use App\Services\RegionAdmin\RegionTeacherPreValidationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Maatwebsite\Excel\Facades\Excel;
use Tests\TestCase;

class RegionTeacherPreValidationServiceTest extends TestCase
{
    use RefreshDatabase;

    protected $service;
    protected $region;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = new RegionTeacherPreValidationService();
        $this->region = Institution::factory()->create(['level' => 1]);
    }

    /** @test */
    public function it_detects_internal_file_duplicates()
    {
        // This is a unit test for the checkInternalDuplicates method directly
        // since mocking the whole Excel process is complex in a quick test
        
        $method = new \ReflectionMethod(RegionTeacherPreValidationService::class, 'checkInternalDuplicates');
        $method->setAccessible(true);

        $row1 = [
            'email' => 'duplicate@example.com',
            'username' => 'user1',
            'utis_code' => '12345'
        ];

        $row2 = [
            'email' => 'duplicate@example.com', // Duplicate email
            'username' => 'user2',
            'utis_code' => '67890'
        ];

        // Process Row 1
        $errors1 = $method->invoke($this->service, $row1, 2);
        $this->assertEmpty($errors1);

        // Process Row 2 (Duplicate Email)
        $errors2 = $method->invoke($this->service, $row2, 3);
        $this->assertNotEmpty($errors2);
        $this->assertEquals('email', $errors2[0]['field']);
        $this->assertStringContainsString('fayl daxilində artıq istifadə olunub', $errors2[0]['message']);
    }
}
