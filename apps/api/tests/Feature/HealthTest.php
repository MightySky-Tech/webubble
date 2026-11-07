<?php

namespace Tests\Feature;

use Tests\TestCase;

/** WB-001: the versioned API is reachable and reports its database connection. */
class HealthTest extends TestCase
{
    public function test_v1_health_reports_ok_when_database_is_reachable(): void
    {
        $this->getJson('/api/v1/health')
            ->assertOk()
            ->assertJsonPath('status', 'ok')
            ->assertJsonPath('service', 'webubble-api')
            ->assertJsonPath('checks.database', 'ok');
    }

    public function test_unversioned_api_paths_are_not_served(): void
    {
        $this->getJson('/api/health')->assertNotFound();
    }
}
