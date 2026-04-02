<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Institution;
use App\Models\Region;
use Illuminate\Support\Facades\DB;

class SyncRegions extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'app:sync-regions';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Sync institutions (level 2 and 3) to regions table';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Sinxronizasiya başlayır...');

        $institutions = Institution::whereIn('level', [2, 3])->get();
        $count = 0;

        foreach ($institutions as $inst) {
            $region = Region::updateOrCreate(
                ['institution_id' => $inst->id],
                [
                    'name' => $inst->name,
                    'code' => $inst->code ?? 'REG-' . $inst->id,
                    'is_active' => true,
                ]
            );

            if ($inst->level == 2) {
                $this->line("Level 2 (İdarə): {$inst->name}");
            } else {
                $this->line("Level 3 (Sektor): {$inst->name}");
            }
            $count++;
        }

        $this->info("Ümumi {$count} region/sektor sinxronizasiya edildi.");
    }
}
