<?php

namespace App\Console\Commands;

use App\Models\AcademicYear;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Symfony\Component\Console\Attribute\AsCommand;

#[AsCommand(name: 'atis:ensure-academic-years')]
class EnsureAcademicYearsCommand extends Command
{
    /**
     * The name and signature of the console command.
     */
    protected $signature = 'atis:ensure-academic-years
        {--base=2025-2026 : Base academic year name, e.g. 2025-2026}
        {--count=5 : Number of future academic years to ensure exist}';

    /**
     * The console command description.
     */
    protected $description = 'Ensure a base academic year is active and generate the next N academic years';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $baseYearName = $this->option('base') ?? '2025-2026';
        $futureCount = (int) ($this->option('count') ?? 5);
        $futureCount = max(0, min($futureCount, 20));

        [$startYear, $endYear] = $this->parseYearName($baseYearName);

        if (! $startYear || ! $endYear) {
            $this->error('Invalid base year format. Use YYYY-YYYY (e.g., 2025-2026).');

            return self::FAILURE;
        }

        DB::beginTransaction();

        try {
            $baseYear = AcademicYear::updateOrCreate(
                ['name' => $baseYearName],
                [
                    'start_date' => Carbon::create($startYear, 9, 1),
                    'end_date' => Carbon::create($endYear, 6, 30),
                    'is_active' => true,
                ]
            );

            AcademicYear::where('id', '!=', $baseYear->id)->update(['is_active' => false]);

            $created = [];

            for ($i = 1; $i <= $futureCount; $i++) {
                $futureStart = $startYear + $i;
                $futureEnd = $futureStart + 1;
                $name = sprintf('%d-%d', $futureStart, $futureEnd);

                $year = AcademicYear::firstOrCreate(
                    ['name' => $name],
                    [
                        'start_date' => Carbon::create($futureStart, 9, 1),
                        'end_date' => Carbon::create($futureEnd, 6, 30),
                        'is_active' => false,
                    ]
                );

                if ($year->wasRecentlyCreated) {
                    $created[] = $name;
                }
            }

            DB::commit();

            $this->info("Academic year '{$baseYearName}' was set as active.");

            if (! empty($created)) {
                $this->info('Generated academic years: ' . implode(', ', $created));
            } else {
                $this->info('All requested future academic years already existed.');
            }

            return self::SUCCESS;
        } catch (\Throwable $exception) {
            DB::rollBack();
            $this->error('Failed to ensure academic years: ' . $exception->getMessage());

            return self::FAILURE;
        }
    }

    /**
     * Parse academic year string.
     */
    private function parseYearName(string $name): array
    {
        if (preg_match('/^(?<start>\d{4})\s*-\s*(?<end>\d{4})$/', $name, $matches)) {
            $start = (int) $matches['start'];
            $end = (int) $matches['end'];

            if ($end === $start + 1) {
                return [$start, $end];
            }
        }

        return [null, null];
    }
}
