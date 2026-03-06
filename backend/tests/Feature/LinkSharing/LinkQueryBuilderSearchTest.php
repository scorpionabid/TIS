<?php

namespace Tests\Feature\LinkSharing;

use App\Models\Institution;
use App\Models\LinkShare;
use App\Models\User;
use App\Services\LinkSharing\Domains\Query\LinkQueryBuilder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class LinkQueryBuilderSearchTest extends TestCase
{
    use RefreshDatabase;

    public function test_search_is_case_insensitive(): void
    {
        $role = Role::create(['name' => 'superadmin', 'guard_name' => 'sanctum']);
        $user = User::factory()->create();
        $user->assignRole($role);

        $institution = Institution::factory()->create();

        LinkShare::factory()
            ->for($user, 'sharedBy')
            ->for($institution)
            ->create([
                'title' => 'STEM Toolkit',
                'description' => 'Physics collection',
                'share_scope' => 'public',
                'status' => 'active',
            ]);

        $request = new Request([
            'search' => 'stem',
            'per_page' => 10,
        ]);

        $builder = app(LinkQueryBuilder::class);
        $results = $builder->getAccessibleLinks($request, $user);

        $this->assertCount(1, $results->items());
    }
}
