<?php

namespace App\Http\Controllers;

use App\Events\NotificationSent;
use App\Events\TaskAssigned;
use App\Events\SurveyCreated;
use App\Events\UserLoggedIn;
use App\Models\User;
use App\Models\Task;
use App\Models\Survey;
use App\Models\Notification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TestWebSocketController extends Controller
{
    /**
     * Return success response
     */
    protected function successResponse($data, $message = 'Success', $status = 200): JsonResponse
    {
        return response()->json([
            'success' => true,
            'message' => $message,
            'data' => $data
        ], $status);
    }

    /**
     * Return error response
     */
    protected function errorResponse($message = 'Error', $status = 400): JsonResponse
    {
        return response()->json([
            'success' => false,
            'message' => $message
        ], $status);
    }
    /**
     * Test notification broadcasting
     */
    public function testNotification(Request $request): JsonResponse
    {
        $user = User::first(); // Get first user for testing
        
        if (!$user) {
            return $this->errorResponse('No users found for testing', 404);
        }

        // Create a test notification
        $notification = new Notification([
            'title' => 'Test Bildirişi',
            'message' => 'Bu bir WebSocket test bildirişidir',
            'type' => 'system_alert',
            'data' => [
                'test' => true,
                'timestamp' => now()->toISOString()
            ],
            'priority' => 'normal',
            'user_id' => $user->id
        ]);
        
        $notification->save();

        // Broadcast the notification
        NotificationSent::dispatch($notification, $user);

        return $this->successResponse([
            'notification' => $notification,
            'user' => $user->only(['id', 'username']),
            'message' => 'Test notification broadcasted successfully'
        ], 'Test bildirişi göndərildi');
    }

    /**
     * Test task assignment broadcasting
     */
    public function testTaskAssignment(Request $request): JsonResponse
    {
        $assignedUser = User::where('role_id', '!=', 1)->first(); // Not superadmin
        $assignedBy = User::where('role_id', 1)->first(); // Superadmin
        
        if (!$assignedUser || !$assignedBy) {
            return $this->errorResponse('Required users not found for testing', 404);
        }

        // Create a test task
        $task = new Task([
            'title' => 'Test Tapşırığı',
            'description' => 'Bu bir WebSocket test tapşırığıdır',
            'priority' => 'high',
            'status' => 'assigned',
            'deadline' => now()->addDays(7),
            'assigned_to' => $assignedUser->id,
            'created_by' => $assignedBy->id,
            'institution_id' => $assignedUser->institution_id
        ]);
        
        $task->save();

        // Broadcast the task assignment
        TaskAssigned::dispatch($task, $assignedUser, $assignedBy);

        return $this->successResponse([
            'task' => $task,
            'assigned_user' => $assignedUser->only(['id', 'username']),
            'assigned_by' => $assignedBy->only(['id', 'username']),
            'message' => 'Test task assignment broadcasted successfully'
        ], 'Test tapşırıq təyinatı göndərildi');
    }

    /**
     * Test survey creation broadcasting
     */
    public function testSurveyCreation(Request $request): JsonResponse
    {
        $creator = User::where('role_id', 1)->first(); // Superadmin
        
        if (!$creator) {
            return $this->errorResponse('SuperAdmin user not found for testing', 404);
        }

        // Create a test survey
        $survey = new Survey([
            'title' => 'Test Sorğusu',
            'description' => 'Bu bir WebSocket test sorğusudur',
            'status' => 'draft',
            'category' => 'test',
            'frequency' => 'once',
            'deadline' => now()->addDays(30),
            'created_by' => $creator->id,
            'target_institutions' => [1, 2, 3], // Target first 3 institutions
            'target_roles' => ['regionadmin', 'sektoradmin'], // Target specific roles
            'questions' => [
                [
                    'title' => 'Test sualı',
                    'type' => 'text',
                    'required' => true
                ]
            ]
        ]);
        
        $survey->save();

        // Broadcast the survey creation
        SurveyCreated::dispatch($survey, $creator);

        return $this->successResponse([
            'survey' => $survey,
            'creator' => $creator->only(['id', 'username']),
            'message' => 'Test survey creation broadcasted successfully'
        ], 'Test sorğu yaradılması göndərildi');
    }

    /**
     * Test user login broadcasting
     */
    public function testUserLogin(Request $request): JsonResponse
    {
        $user = User::first();
        
        if (!$user) {
            return $this->errorResponse('No users found for testing', 404);
        }

        $sessionInfo = [
            'ip' => $request->ip(),
            'user_agent' => $request->userAgent(),
            'login_time' => now()->toISOString()
        ];

        // Broadcast the user login
        UserLoggedIn::dispatch($user, $sessionInfo);

        return $this->successResponse([
            'user' => $user->only(['id', 'username']),
            'session' => $sessionInfo,
            'message' => 'Test user login broadcasted successfully'
        ], 'Test istifadəçi girişi göndərildi');
    }

    /**
     * Get WebSocket connection info
     */
    public function connectionInfo(): JsonResponse
    {
        return $this->successResponse([
            'reverb_host' => config('broadcasting.connections.reverb.host', '127.0.0.1'),
            'reverb_port' => config('broadcasting.connections.reverb.port', 8080),
            'app_key' => config('broadcasting.connections.reverb.key', 'atis-key'),
            'websocket_url' => 'ws://127.0.0.1:8080/app/atis-key',
            'status' => 'WebSocket server should be running on the configured host and port',
            'test_endpoints' => [
                'POST /api/test/websocket/notification' => 'Test notification broadcasting',
                'POST /api/test/websocket/task' => 'Test task assignment broadcasting', 
                'POST /api/test/websocket/survey' => 'Test survey creation broadcasting',
                'POST /api/test/websocket/login' => 'Test user login broadcasting'
            ]
        ], 'WebSocket əlaqə məlumatları');
    }

    /**
     * Test all WebSocket events
     */
    public function testAll(Request $request): JsonResponse
    {
        $results = [];

        try {
            // Test notification
            $notificationResult = $this->testNotification($request);
            $results['notification'] = $notificationResult->getData();
        } catch (\Exception $e) {
            $results['notification'] = ['error' => $e->getMessage()];
        }

        try {
            // Test task assignment
            $taskResult = $this->testTaskAssignment($request);
            $results['task'] = $taskResult->getData();
        } catch (\Exception $e) {
            $results['task'] = ['error' => $e->getMessage()];
        }

        try {
            // Test survey creation
            $surveyResult = $this->testSurveyCreation($request);
            $results['survey'] = $surveyResult->getData();
        } catch (\Exception $e) {
            $results['survey'] = ['error' => $e->getMessage()];
        }

        try {
            // Test user login
            $loginResult = $this->testUserLogin($request);
            $results['login'] = $loginResult->getData();
        } catch (\Exception $e) {
            $results['login'] = ['error' => $e->getMessage()];
        }

        return $this->successResponse([
            'results' => $results,
            'message' => 'All WebSocket tests completed'
        ], 'Bütün WebSocket testləri tamamlandı');
    }
}