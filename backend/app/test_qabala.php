<?php
require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$academicYearId = 3;

$sql = "
SELECT id, name, 
    (
        (SELECT COALESCE(SUM(hours), 0) FROM curriculum_plans 
        WHERE institution_id = institutions.id AND academic_year_id = 3 AND subject_id <> 57)
        -
        (SELECT COALESCE(SUM(weekly_hours), 0) FROM teaching_loads 
        WHERE institution_id = institutions.id AND academic_year_id = 3 AND subject_id <> 57 AND deleted_at IS NULL)
    ) as curriculum_main_vacancies
FROM institutions 
WHERE parent_id = 8 AND is_active = true
ORDER BY id ASC;
";
$results = \Illuminate\Support\Facades\DB::select($sql);

foreach ($results as $row) {
    if ($row->curriculum_main_vacancies != 0) {
        echo $row->id . " - " . $row->name . " -> " . $row->curriculum_main_vacancies . "\n";
    }
}
