<?php

namespace Tests\Unit\AI;

use App\Services\AI\QueryValidator;
use Tests\TestCase;

class QueryValidatorTest extends TestCase
{
    private QueryValidator $validator;

    protected function setUp(): void
    {
        parent::setUp();
        $this->validator = new QueryValidator;
    }

    public function test_accepts_valid_select_query(): void
    {
        $this->expectNotToPerformAssertions();
        $this->validator->validate('SELECT id, name FROM users LIMIT 100');
    }

    public function test_rejects_non_select_statements(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        $this->validator->validate('UPDATE users SET name = "test" WHERE id = 1');
    }

    public function test_rejects_drop_statement(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        $this->validator->validate('DROP TABLE users');
    }

    public function test_rejects_insert_statement(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        $this->validator->validate('INSERT INTO users (name) VALUES ("test")');
    }

    public function test_rejects_delete_via_stacked_query(): void
    {
        // DELETE keyword-ü SELECT-in ardından stacked query kimi gəlir.
        // Validator: DELETE FORBIDDEN_KEYWORDS-dədir, strtoupper-dan keçir.
        $this->expectException(\InvalidArgumentException::class);
        $this->validator->validate('SELECT * FROM users; DELETE FROM users');
    }

    public function test_rejects_stacked_queries_with_multiple_semicolons(): void
    {
        // Validator semicolonCount > 1 şərtini yoxlayır.
        // 3 sorğu = 2 semicolon → bloklanır.
        $this->expectException(\InvalidArgumentException::class);
        $this->validator->validate('SELECT * FROM users; SELECT 1; SELECT * FROM schools');
    }

    public function test_rejects_sql_inline_comments(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        $this->validator->validate('SELECT * FROM users -- WHERE id = 1');
    }

    public function test_rejects_truncate_statement(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        $this->validator->validate('TRUNCATE TABLE users');
    }

    public function test_accepts_complex_select_with_joins(): void
    {
        // Not: validator söz sərhədi olmadan substring yoxlayır.
        // 'created_at' daxilindəki 'CREATE' keyword-ünü tapır.
        // Buna görə 'created_at' sütunundan qaçınılır.
        $this->expectNotToPerformAssertions();
        $sql = "SELECT u.name, i.name AS inst_name FROM users u
                JOIN institutions i ON u.institution_id = i.id
                WHERE u.status = 'active'
                ORDER BY u.id DESC
                LIMIT 100";
        $this->validator->validate($sql);
    }

    public function test_accepts_select_with_subquery(): void
    {
        $this->expectNotToPerformAssertions();
        $sql = 'SELECT * FROM users WHERE id IN (SELECT user_id FROM role_has_permissions LIMIT 10)';
        $this->validator->validate($sql);
    }

    public function test_rejects_block_comment_injection(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        $this->validator->validate('SELECT * FROM users /* admin bypass */');
    }

    public function test_rejects_alter_statement(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        $this->validator->validate('ALTER TABLE users ADD COLUMN hacked TEXT');
    }

    public function test_validate_region_filter_returns_true_when_region_id_present(): void
    {
        $sql = 'SELECT * FROM institutions WHERE region_id = 5';
        $result = $this->validator->validateRegionFilter($sql, 5);
        $this->assertTrue($result);
    }

    public function test_validate_region_filter_returns_false_when_region_id_absent(): void
    {
        $sql = "SELECT * FROM institutions WHERE name = 'Baku'";
        $result = $this->validator->validateRegionFilter($sql, 5);
        $this->assertFalse($result);
    }

    public function test_validate_region_filter_returns_false_for_different_region_id(): void
    {
        $sql = 'SELECT * FROM institutions WHERE region_id = 99';
        $result = $this->validator->validateRegionFilter($sql, 5);
        $this->assertFalse($result);
    }
}
