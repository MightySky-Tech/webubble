<?php

namespace Tests;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;

abstract class TestCase extends BaseTestCase
{
    protected function setUpTraits()
    {
        if ($this->app && in_array(
            RefreshDatabase::class,
            class_uses_recursive(static::class),
            true,
        )) {
            $database = $this->app['config']->get('database.connections.pgsql.database');
            if (
                $this->app['config']->get('database.default') !== 'pgsql'
                || $database !== 'webubble_test_wb'
            ) {
                throw new \RuntimeException('API tests must use the isolated webubble_test_wb database.');
            }
        }

        return parent::setUpTraits();
    }
}
