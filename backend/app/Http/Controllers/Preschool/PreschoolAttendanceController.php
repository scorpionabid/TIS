<?php

declare(strict_types=1);

namespace App\Http\Controllers\Preschool;

use App\Http\Controllers\BaseController;
use App\Http\Requests\Preschool\StorePreschoolAttendanceRequest;
use App\Http\Requests\Preschool\UploadPreschoolPhotoRequest;
use App\Models\Grade;
use App\Models\PreschoolAttendance;
use App\Models\PreschoolAttendancePhoto;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class PreschoolAttendanceController extends BaseController
{
    private const PRESCHOOL_TYPES = ['kindergarten', 'preschool_center', 'nursery'];

    public function index(Request $request): JsonResponse
    {
        $user        = Auth::user();
        $institution = $user->institution;

        if (! $institution || ! in_array($institution->type, self::PRESCHOOL_TYPES)) {
            return response()->json(['success' => false, 'message' => 'Müəssisə tapılmadı.'], 403);
        }

        $date = $request->get('date', now()->format('Y-m-d'));

        $groups = Grade::where('institution_id', $institution->id)
            ->where('is_active', true)
            ->orderBy('name')
            ->get();

        $existingRecords = PreschoolAttendance::where('institution_id', $institution->id)
            ->where('attendance_date', $date)
            ->with('photos')
            ->get()
            ->keyBy('grade_id');

        $groupsData = $groups->map(function (Grade $group) use ($existingRecords) {
            $record = $existingRecords->get($group->id);

            return [
                'group_id'       => $group->id,
                'group_name'     => $group->name,
                'total_enrolled' => (int) ($group->student_count ?? 0),
                'attendance'     => $record ? [
                    'id'              => $record->id,
                    'present_count'   => $record->present_count,
                    'absent_count'    => $record->absent_count,
                    'attendance_rate' => $record->attendance_rate,
                    'notes'           => $record->notes,
                    'is_locked'       => $record->is_locked,
                    'photo_count'     => $record->photos->count(),
                    'photos'          => $record->photos->map(fn (PreschoolAttendancePhoto $p) => [
                        'id'  => $p->id,
                        'url' => route('preschool.photos.serve', ['photo' => $p->id]),
                    ])->values(),
                ] : null,
            ];
        });

        return response()->json([
            'success' => true,
            'data'    => [
                'date'        => $date,
                'institution' => ['id' => $institution->id, 'name' => $institution->name],
                'groups'      => $groupsData,
            ],
            'message' => 'Davamiyyət məlumatları yükləndi.',
        ]);
    }

    public function store(StorePreschoolAttendanceRequest $request): JsonResponse
    {
        $user        = Auth::user();
        $institution = $user->institution;

        if (! $institution || ! in_array($institution->type, self::PRESCHOOL_TYPES)) {
            return response()->json(['success' => false, 'message' => 'Müəssisə tapılmadı.'], 403);
        }

        $savedCount = 0;
        $failedIds  = [];

        DB::transaction(function () use ($request, $user, &$savedCount, &$failedIds): void {
            foreach ($request->groups as $groupData) {
                try {
                    $grade = Grade::where('id', $groupData['group_id'])
                        ->where('institution_id', $user->institution_id)
                        ->first();

                    if (! $grade) {
                        $failedIds[] = $groupData['group_id'];
                        continue;
                    }

                    $record = PreschoolAttendance::getOrCreate(
                        $grade->id,
                        $request->attendance_date,
                        $user->id
                    );

                    if ($record->is_locked) {
                        $failedIds[] = $groupData['group_id'];
                        continue;
                    }

                    $record->present_count  = min((int) $groupData['present_count'], $record->total_enrolled ?: PHP_INT_MAX);
                    $record->total_enrolled = (int) ($grade->student_count ?? $record->total_enrolled);
                    $record->notes          = $groupData['notes'] ?? $record->notes;
                    $record->recorded_by    = $user->id;
                    $record->calculateAndSaveRate();
                    $record->save();

                    $savedCount++;
                } catch (\Exception $e) {
                    Log::error('PreschoolAttendance save error', [
                        'group_id' => $groupData['group_id'],
                        'error'    => $e->getMessage(),
                    ]);
                    $failedIds[] = $groupData['group_id'];
                }
            }
        });

        return response()->json([
            'success' => $savedCount > 0,
            'data'    => [
                'saved_count'  => $savedCount,
                'failed_count' => count($failedIds),
                'failed_ids'   => $failedIds,
            ],
            'message' => $savedCount > 0
                ? "{$savedCount} qrup üçün davamiyyət saxlandı."
                : 'Heç bir qrup saxlanılmadı.',
        ]);
    }

    public function uploadPhotos(UploadPreschoolPhotoRequest $request, PreschoolAttendance $attendance): JsonResponse
    {
        $user = Auth::user();

        if ($attendance->institution_id !== $user->institution_id && ! $user->hasRole('superadmin')) {
            return response()->json(['success' => false, 'message' => 'İcazəsiz əməliyyat.'], 403);
        }

        $photoDate   = $attendance->attendance_date->format('Y-m-d');
        $year        = Carbon::parse($photoDate)->format('Y');
        $month       = Carbon::parse($photoDate)->format('m');
        $storagePath = "preschool-photos/{$year}/{$month}/{$attendance->institution_id}";

        $savedPhotos = [];

        foreach ($request->file('files') as $file) {
            $filename = uniqid('photo_', true) . '.' . $file->getClientOriginalExtension();
            $fullPath = "{$storagePath}/{$filename}";

            Storage::disk('local')->put($fullPath, file_get_contents($file->getRealPath()));

            $photo = PreschoolAttendancePhoto::create([
                'preschool_attendance_id' => $attendance->id,
                'institution_id'          => $attendance->institution_id,
                'uploaded_by'             => $user->id,
                'photo_date'              => $photoDate,
                'file_path'               => $fullPath,
                'original_filename'       => $file->getClientOriginalName(),
                'mime_type'               => $file->getMimeType() ?? 'image/jpeg',
                'file_size_bytes'         => $file->getSize(),
            ]);

            $savedPhotos[] = [
                'id'  => $photo->id,
                'url' => route('preschool.photos.serve', ['photo' => $photo->id]),
            ];
        }

        return response()->json([
            'success' => true,
            'data'    => ['photos' => $savedPhotos, 'count' => count($savedPhotos)],
            'message' => count($savedPhotos) . ' şəkil uğurla yükləndi.',
        ], 201);
    }

    public function deletePhoto(PreschoolAttendancePhoto $photo): JsonResponse
    {
        $user = Auth::user();

        if ($photo->uploaded_by !== $user->id && ! $user->hasRole('superadmin')) {
            return response()->json(['success' => false, 'message' => 'İcazəsiz əməliyyat.'], 403);
        }

        Storage::disk('local')->delete($photo->file_path);
        $photo->delete();

        return response()->json([
            'success' => true,
            'message' => 'Şəkil silindi.',
        ]);
    }

    public function servePhoto(PreschoolAttendancePhoto $photo): BinaryFileResponse|JsonResponse
    {
        $user = Auth::user();

        if (! $this->canAccessPhoto($user, $photo)) {
            return response()->json(['success' => false, 'message' => 'İcazəsiz əməliyyat.'], 403);
        }

        $path = Storage::disk('local')->path($photo->file_path);

        if (! file_exists($path)) {
            return response()->json(['success' => false, 'message' => 'Fayl tapılmadı.'], 404);
        }

        return response()->file($path, [
            'Content-Type'        => $photo->mime_type,
            'Content-Disposition' => 'inline; filename="' . $photo->original_filename . '"',
        ]);
    }

    private function canAccessPhoto(User $user, PreschoolAttendancePhoto $photo): bool
    {
        if ($user->hasRole('superadmin')) {
            return true;
        }

        if ($user->institution_id === $photo->institution_id) {
            return true;
        }

        if ($user->hasAnyRole(['sektoradmin', 'regionoperator', 'regionadmin'])) {
            return true;
        }

        return false;
    }
}
