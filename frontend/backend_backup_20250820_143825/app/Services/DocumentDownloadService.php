<?php

namespace App\Services;

use App\Models\Document;
use App\Models\DocumentDownload;
use App\Models\DocumentAccessLog;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class DocumentDownloadService
{
    /**
     * Download document file
     */
    public function downloadDocument(Document $document, bool $forceDownload = true): StreamedResponse
    {
        $user = Auth::user();

        // Check if user can download this document
        if (!$this->canUserDownloadDocument($user, $document)) {
            abort(403, 'Bu sənədi yükləmək icazəniz yoxdur.');
        }

        // Check if document is downloadable
        if (!$document->is_downloadable) {
            abort(403, 'Bu sənəd yüklənmə üçün əlçatan deyil.');
        }

        // Check if file exists
        if (!Storage::exists($document->file_path)) {
            abort(404, 'Fayl tapılmadı.');
        }

        // Log download
        $this->logDownload($document, $user);

        // Determine download filename
        $downloadFilename = $document->original_filename;

        // Stream file download
        return Storage::download(
            $document->file_path,
            $downloadFilename,
            [
                'Content-Type' => $document->mime_type,
                'Content-Disposition' => ($forceDownload ? 'attachment' : 'inline') . '; filename="' . $downloadFilename . '"',
                'Cache-Control' => 'no-cache, must-revalidate',
                'Pragma' => 'no-cache',
                'Expires' => '0'
            ]
        );
    }

    /**
     * Preview document online
     */
    public function previewDocument(Document $document): StreamedResponse
    {
        $user = Auth::user();

        // Check if user can view this document
        if (!$this->canUserViewDocument($user, $document)) {
            abort(403, 'Bu sənədi görüntüləmək icazəniz yoxdur.');
        }

        // Check if document is viewable online
        if (!$document->is_viewable_online) {
            abort(403, 'Bu sənəd onlayn görüntülənmə üçün əlçatan deyil.');
        }

        // Check if file exists
        if (!Storage::exists($document->file_path)) {
            abort(404, 'Fayl tapılmadı.');
        }

        // Log preview
        $this->logAccess($document, 'preview');

        // Return file for inline viewing
        return $this->downloadDocument($document, false);
    }

    /**
     * Get download statistics for document
     */
    public function getDownloadStatistics(Document $document): array
    {
        return [
            'total_downloads' => DocumentDownload::where('document_id', $document->id)->count(),
            'unique_downloaders' => DocumentDownload::where('document_id', $document->id)
                                                  ->distinct('user_id')
                                                  ->count('user_id'),
            'recent_downloads' => DocumentDownload::where('document_id', $document->id)
                                                ->with('user:id,first_name,last_name')
                                                ->orderBy('downloaded_at', 'desc')
                                                ->limit(10)
                                                ->get(),
            'downloads_by_month' => $this->getDownloadsByMonth($document)
        ];
    }

    /**
     * Bulk download multiple documents as ZIP
     */
    public function bulkDownload(array $documentIds): StreamedResponse
    {
        $user = Auth::user();
        $documents = Document::whereIn('id', $documentIds)->get();

        // Filter documents user can download
        $allowedDocuments = $documents->filter(function ($doc) use ($user) {
            return $this->canUserDownloadDocument($user, $doc) && $doc->is_downloadable;
        });

        if ($allowedDocuments->isEmpty()) {
            abort(403, 'Heç bir sənədi yükləmək icazəniz yoxdur.');
        }

        // Create temporary ZIP file
        $zipFilename = 'documents_' . now()->format('Y-m-d_H-i-s') . '.zip';
        $zipPath = storage_path('app/temp/' . $zipFilename);
        
        // Ensure temp directory exists
        if (!file_exists(dirname($zipPath))) {
            mkdir(dirname($zipPath), 0755, true);
        }

        $zip = new \ZipArchive();
        if ($zip->open($zipPath, \ZipArchive::CREATE) !== TRUE) {
            abort(500, 'ZIP faylı yaradıla bilmədi.');
        }

        // Add files to ZIP
        foreach ($allowedDocuments as $document) {
            if (Storage::exists($document->file_path)) {
                $zip->addFile(
                    Storage::path($document->file_path),
                    $document->original_filename
                );
                
                // Log download
                $this->logDownload($document, $user);
            }
        }

        $zip->close();

        // Return ZIP file and delete after download
        return response()->download($zipPath, $zipFilename, [
            'Content-Type' => 'application/zip'
        ])->deleteFileAfterSend(true);
    }

    /**
     * Log document download
     */
    private function logDownload(Document $document, $user): void
    {
        DocumentDownload::create([
            'document_id' => $document->id,
            'user_id' => $user->id,
            'downloaded_at' => now(),
            'ip_address' => request()->ip(),
            'user_agent' => request()->userAgent()
        ]);

        // Also log as access
        $this->logAccess($document, 'download');
    }

    /**
     * Log document access
     */
    private function logAccess(Document $document, string $action): void
    {
        DocumentAccessLog::create([
            'document_id' => $document->id,
            'user_id' => Auth::id(),
            'action' => $action,
            'ip_address' => request()->ip(),
            'user_agent' => request()->userAgent()
        ]);
    }

    /**
     * Check if user can download document
     */
    private function canUserDownloadDocument($user, Document $document): bool
    {
        // Check basic access first
        if (!$this->canUserViewDocument($user, $document)) {
            return false;
        }

        // Check download-specific permissions
        if ($document->access_level === 'download_restricted') {
            return $user->hasRole(['superadmin', 'regionadmin', 'sektoradmin']);
        }

        return true;
    }

    /**
     * Check if user can view document
     */
    private function canUserViewDocument($user, Document $document): bool
    {
        // SuperAdmin can access everything
        if ($user->hasRole('superadmin')) {
            return true;
        }

        // Public documents
        if ($document->is_public) {
            return true;
        }

        // Owner can access
        if ($document->uploaded_by === $user->id) {
            return true;
        }

        // Institution-based access
        if ($document->access_level === 'institution' && 
            $document->institution_id === $user->institution_id) {
            return true;
        }

        // Role-based access
        if (!empty($document->allowed_roles)) {
            $userRoles = $user->getRoleNames()->toArray();
            if (!empty(array_intersect($userRoles, $document->allowed_roles))) {
                return true;
            }
        }

        // User-specific access
        if (!empty($document->allowed_users) && 
            in_array($user->id, $document->allowed_users)) {
            return true;
        }

        // Institution-specific access
        if (!empty($document->allowed_institutions) && 
            in_array($user->institution_id, $document->allowed_institutions)) {
            return true;
        }

        return false;
    }

    /**
     * Get downloads by month for chart
     */
    private function getDownloadsByMonth(Document $document): array
    {
        return DocumentDownload::where('document_id', $document->id)
                              ->selectRaw('DATE_FORMAT(downloaded_at, "%Y-%m") as month, COUNT(*) as count')
                              ->groupBy('month')
                              ->orderBy('month')
                              ->limit(12)
                              ->pluck('count', 'month')
                              ->toArray();
    }
}