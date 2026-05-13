<?php

namespace Tests\Unit\Services\Import;

use App\Models\InstitutionType;
use App\Services\Import\InstitutionCsvTemplateService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class InstitutionCsvTemplateServiceTest extends TestCase
{
    use RefreshDatabase;

    protected InstitutionCsvTemplateService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = new InstitutionCsvTemplateService();
    }

    #[Test]
    public function it_generates_template_for_school_with_level_4()
    {
        $institutionType = InstitutionType::create([
            'key' => 'secondary_school',
            'default_level' => 4,
            'name' => 'Secondary School',
            'label' => 'Secondary School',
            'label_az' => 'Orta Məktəb',
            'label_en' => 'Secondary School',
            'label_ru' => 'Средняя школа'
        ]);

        $filePath = $this->service->generateTemplateByType('secondary_school', ';');

        $this->assertFileExists($filePath);

        $content = file_get_contents($filePath);
        $this->assertStringStartsWith("\xEF\xBB\xBF", $content); // BOM
        
        $content = substr($content, 3);
        $lines = explode("\n", trim($content));
        $this->assertCount(2, $lines); // Header + Sample row

        $headers = str_getcsv($lines[0], ';', '"', '\\');
        $this->assertEquals('Ad (name)*', $headers[0]);
        $this->assertContains('Sinif Sayı', $headers);
        $this->assertContains('SchoolAdmin İstifadəçi Adı*', $headers);

        unlink($filePath);
    }

    #[Test]
    public function it_generates_template_for_kindergarten_with_level_5()
    {
        $institutionType = InstitutionType::create([
            'key' => 'kindergarten',
            'default_level' => 5,
            'name' => 'Kindergarten',
            'label' => 'Kindergarten',
            'label_az' => 'Bağça',
            'label_en' => 'Kindergarten',
            'label_ru' => 'Детский сад'
        ]);

        $filePath = $this->service->generateTemplateByType('kindergarten', ',');

        $this->assertFileExists($filePath);

        $content = file_get_contents($filePath);
        $content = substr($content, 3);
        $lines = explode("\n", trim($content));

        $headers = str_getcsv($lines[0], ',', '"', '\\');
        $this->assertContains('Qrup Sayı', $headers);
        $this->assertContains('PreschoolAdmin Email*', $headers);

        unlink($filePath);
    }
}
