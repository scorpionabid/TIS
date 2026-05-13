<?php

namespace Tests\Unit\Services\Import;

use App\Models\InstitutionType;
use App\Services\Import\Domains\Parsing\DataTypeParser;
use App\Services\Import\InstitutionCsvParserService;
use Illuminate\Http\UploadedFile;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class InstitutionCsvParserServiceTest extends TestCase
{
    protected InstitutionCsvParserService $service;

    protected function setUp(): void
    {
        parent::setUp();
        
        $dataTypeParser = new DataTypeParser();
        $this->service = new InstitutionCsvParserService($dataTypeParser);
    }

    #[Test]
    public function it_can_parse_valid_csv_file_with_semicolon()
    {
        $csvContent = "name;short_name;institution_code;utis_code;region_code;contact_info;location;established_date;is_active;parent_id;class_count;student_count;teacher_count;username;email;password;first_name;last_name;phone;department\n";
        $csvContent .= "Test School;TS;CODE1;UTIS1;REG1;test@test.com;Baku;2020-01-01;1;;10;200;15;admin;admin@test.com;pass;John;Doe;123;Dept1\n";

        $file = UploadedFile::fake()->createWithContent('test.csv', $csvContent);

        $institutionType = new InstitutionType();
        $institutionType->key = 'secondary_school';
        $institutionType->level = 4;

        $data = $this->service->parseCsvFile($file, $institutionType, ';');

        $this->assertCount(1, $data);
        $this->assertEquals('Test School', $data[0]['name']);
        $this->assertEquals('TS', $data[0]['short_name']);
        $this->assertEquals('CODE1', $data[0]['institution_code']);
        $this->assertEquals('UTIS1', $data[0]['utis_code']);
        $this->assertEquals(10, $data[0]['class_count']);
        $this->assertEquals(200, $data[0]['student_count']);
        $this->assertEquals(15, $data[0]['teacher_count']);
        $this->assertEquals('admin', $data[0]['schooladmin']['username']);
        $this->assertEquals('admin@test.com', $data[0]['schooladmin']['email']);
        $this->assertEquals('pass', $data[0]['schooladmin']['password']);
    }

    #[Test]
    public function it_can_detect_delimiter_automatically()
    {
        $csvContent = "name,short_name,institution_code,utis_code,region_code,contact_info\n";
        $csvContent .= "Test,TS,CODE,UTIS,REG,test@test.com\n";

        $file = UploadedFile::fake()->createWithContent('test.csv', $csvContent);

        $institutionType = new InstitutionType();
        $institutionType->key = 'general';
        $institutionType->level = 3;

        $data = $this->service->parseCsvFile($file, $institutionType, 'auto');

        $this->assertCount(1, $data);
        $this->assertEquals('Test', $data[0]['name']);
    }

    #[Test]
    public function it_strips_bom_from_file_content()
    {
        $bom = "\xEF\xBB\xBF";
        $content = $bom . "name,short_name\nTest,TS";
        
        $stripped = $this->service->stripBom($content);
        
        $this->assertStringNotContainsString($bom, $stripped);
        $this->assertStringStartsWith("name,short", $stripped);
    }

    #[Test]
    public function it_validates_file_structure()
    {
        $csvContent = "name,short_name,code\nTest,TS,123";
        $file = UploadedFile::fake()->createWithContent('test.csv', $csvContent);

        $result = $this->service->validateFileStructure($file, ',');

        $this->assertFalse($result['valid']);
        $this->assertNotEmpty($result['errors']);
        $this->assertEquals(3, $result['column_count']);
    }
}
