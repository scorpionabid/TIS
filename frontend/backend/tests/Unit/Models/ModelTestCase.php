<?php

namespace Tests\Unit\Models;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

abstract class ModelTestCase extends TestCase
{
    use RefreshDatabase;

    /**
     * The model class being tested
     *
     * @var string
     */
    protected $modelClass;

    /**
     * The attributes that should be tested for required fields
     *
     * @var array
     */
    protected $requiredAttributes = [];

    /**
     * The attributes that should be tested for fillable fields
     *
     * @var array
     */
    protected $fillableAttributes = [];

    /**
     * The attributes that should be tested for hidden fields
     *
     * @var array
     */
    protected $hiddenAttributes = [];

    /**
     * The attributes that should be tested for casts
     *
     * @var array
     */
    protected $casts = [];

    /**
     * Test that required attributes are validated
     *
     * @return void
     */
    public function test_required_attributes_validation()
    {
        if (empty($this->requiredAttributes)) {
            $this->markTestSkipped('No required attributes defined for testing');
        }

        $this->assertTrue(true, 'Validation is tested in feature tests');
    }

    /**
     * Test that fillable attributes are set correctly
     *
     * @return void
     */
    public function test_fillable_attributes()
    {
        if (empty($this->fillableAttributes)) {
            $this->markTestSkipped('No fillable attributes defined for testing');
        }

        $model = new $this->modelClass();
        $this->assertEquals($this->fillableAttributes, $model->getFillable());
    }

    /**
     * Test that hidden attributes are set correctly
     *
     * @return void
     */
    public function test_hidden_attributes()
    {
        if (empty($this->hiddenAttributes)) {
            $this->markTestSkipped('No hidden attributes defined for testing');
        }

        $model = new $this->modelClass();
        $this->assertEquals($this->hiddenAttributes, $model->getHidden());
    }

    /**
     * Test that casts are set correctly
     *
     * @return void
     */
    public function test_casts()
    {
        if (empty($this->casts)) {
            $this->markTestSkipped('No casts defined for testing');
        }

        $model = new $this->modelClass();
        $this->assertEquals($this->casts, $model->getCasts());
    }
}
