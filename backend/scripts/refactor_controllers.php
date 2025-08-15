<?php

/**
 * Automated Controller Refactoring Script
 * 
 * Bu script mövcud controllerləri yeni architecture pattern-ə avtomatik çevirir
 */

class ControllerRefactorer
{
    private string $controllersPath;
    private string $outputPath;
    private array $patterns;

    public function __construct(string $controllersPath = null, string $outputPath = null)
    {
        $this->controllersPath = $controllersPath ?? __DIR__ . '/../app/Http/Controllers';
        $this->outputPath = $outputPath ?? __DIR__ . '/../app/Http/Controllers/Refactored';
        $this->initializePatterns();
    }

    /**
     * Refactor all controllers
     */
    public function refactorAll(): void
    {
        echo "🚀 Starting automated controller refactoring...\n\n";

        if (!is_dir($this->outputPath)) {
            mkdir($this->outputPath, 0755, true);
        }

        $controllers = $this->getControllerFiles();
        
        foreach ($controllers as $controller) {
            $this->refactorController($controller);
        }

        echo "\n✅ Refactoring completed! Check {$this->outputPath} for results.\n";
    }

    /**
     * Refactor single controller
     */
    public function refactorController(string $controllerPath): void
    {
        $fileName = basename($controllerPath);
        $className = pathinfo($fileName, PATHINFO_FILENAME);
        
        echo "🔄 Refactoring {$className}...\n";

        $originalContent = file_get_contents($controllerPath);
        $refactoredContent = $this->applyRefactoringPatterns($originalContent, $className);

        $outputFile = $this->outputPath . '/' . $className . 'Refactored.php';
        file_put_contents($outputFile, $refactoredContent);

        echo "✅ {$className} refactored successfully\n";
    }

    /**
     * Apply refactoring patterns
     */
    private function applyRefactoringPatterns(string $content, string $className): string
    {
        // 1. Update class declaration
        $content = $this->updateClassDeclaration($content, $className);
        
        // 2. Add use statements
        $content = $this->addUseStatements($content);
        
        // 3. Add traits
        $content = $this->addTraits($content);
        
        // 4. Wrap methods with executeWithErrorHandling
        $content = $this->wrapMethodsWithErrorHandling($content);
        
        // 5. Replace validation patterns
        $content = $this->replaceValidationPatterns($content);
        
        // 6. Replace response patterns
        $content = $this->replaceResponsePatterns($content);
        
        // 7. Add helper methods
        $content = $this->addHelperMethods($content, $className);

        return $content;
    }

    /**
     * Update class declaration
     */
    private function updateClassDeclaration(string $content, string $className): string
    {
        $newClassName = $className . 'Refactored';
        
        $pattern = '/class\s+' . $className . '\s+extends\s+Controller/';
        $replacement = "class {$newClassName} extends BaseController";
        
        return preg_replace($pattern, $replacement, $content);
    }

    /**
     * Add use statements
     */
    private function addUseStatements(string $content): string
    {
        $useStatements = [
            'use App\Http\Traits\ValidationRules;',
            'use App\Http\Traits\ResponseHelpers;'
        ];

        // Find the position after existing use statements
        $lastUsePos = $this->findLastUseStatementPosition($content);
        
        if ($lastUsePos !== false) {
            $useStatementsStr = implode("\n", $useStatements) . "\n";
            $content = substr_replace($content, $useStatementsStr, $lastUsePos, 0);
        }

        return $content;
    }

    /**
     * Add traits to class
     */
    private function addTraits(string $content): string
    {
        $traitsCode = "\n    use ValidationRules, ResponseHelpers;\n";
        
        // Find class opening brace
        $pattern = '/class\s+\w+\s+extends\s+\w+\s*\{/';
        $replacement = '$0' . $traitsCode;
        
        return preg_replace($pattern, $replacement, $content);
    }

    /**
     * Wrap methods with error handling
     */
    private function wrapMethodsWithErrorHandling(string $content): string
    {
        $methods = ['index', 'show', 'store', 'update', 'destroy'];
        
        foreach ($methods as $method) {
            $content = $this->wrapMethodWithErrorHandling($content, $method);
        }
        
        return $content;
    }

    /**
     * Wrap single method with error handling
     */
    private function wrapMethodWithErrorHandling(string $content, string $method): string
    {
        // Match complete method including nested braces
        $pattern = '/public\s+function\s+' . $method . '\s*\([^{]*\)\s*:\s*JsonResponse\s*\{/';
        
        return preg_replace_callback($pattern, function ($matches) use ($method) {
            $startPos = strpos($content, $matches[0]) + strlen($matches[0]);
            $braceCount = 1;
            $pos = $startPos;
            $methodEnd = $startPos;
            
            // Find matching closing brace
            while ($pos < strlen($content) && $braceCount > 0) {
                if ($content[$pos] === '{') {
                    $braceCount++;
                } elseif ($content[$pos] === '}') {
                    $braceCount--;
                    if ($braceCount === 0) {
                        $methodEnd = $pos;
                        break;
                    }
                }
                $pos++;
            }
            
            $methodBody = substr($content, $startPos, $methodEnd - $startPos);
            $methodBody = trim($methodBody);
            
            // Skip if already wrapped
            if (strpos($methodBody, 'executeWithErrorHandling') !== false) {
                return $matches[0];
            }
            
            $newMethodBody = "\n        return \$this->executeWithErrorHandling(function () use (\$request) {\n";
            $newMethodBody .= "            " . str_replace("\n", "\n            ", $methodBody) . "\n";
            $newMethodBody .= "        }, '{$method} operation');\n    ";
            
            return $matches[0] . $newMethodBody;
        }, $content);
    }

    /**
     * Replace validation patterns
     */
    private function replaceValidationPatterns(string $content): string
    {
        // Replace common validation patterns
        $patterns = [
            // Pagination validation
            '/\$request->validate\(\[\s*[\'"]per_page[\'"] => [\'"]nullable\|integer\|min:1\|max:100[\'"],?\s*[\'"]search[\'"] => [\'"]nullable\|string\|max:255[\'"],?[^\]]*\]\);/' => '$request->validate($this->getUserValidationRules());',
            
            // Bulk operation validation
            '/\$request->validate\(\[\s*[\'"](\w+)_ids[\'"] => [\'"]required\|array\|min:1\|max:\d+[\'"],?\s*[\'"](\w+)_ids\.\*[\'"] => [\'"]integer\|exists:\w+,id[\'"],?\s*\]\);/' => '$request->validate($this->getBulkOperationRules(\'$1\'));',
        ];

        foreach ($patterns as $pattern => $replacement) {
            $content = preg_replace($pattern, $replacement, $content);
        }

        return $content;
    }

    /**
     * Replace response patterns
     */
    private function replaceResponsePatterns(string $content): string
    {
        $patterns = [
            // Success responses
            '/return\s+response\(\)->json\(\[\s*[\'"]success[\'"] => true,\s*[\'"]message[\'"] => [\'"]([^\'\"]+)[\'"],?\s*[\'"]data[\'"] => ([^,\]]+),?\s*\]\);/' => 'return $this->success($2, \'$1\');',
            
            // Error responses
            '/return\s+response\(\)->json\(\[\s*[\'"]success[\'"] => false,\s*[\'"]message[\'"] => [\'"]([^\'\"]+)[\'"],?\s*\],?\s*(\d+)\);/' => 'return $this->error(\'$1\', $2);',
            
            // Paginated responses
            '/return\s+response\(\)->json\(\[\s*[\'"]success[\'"] => true,\s*[\'"]data[\'"] => \$\w+->items\(\),\s*[\'"]meta[\'"] => \[[^\]]+\],?\s*\]\);/' => 'return $this->paginated($data);',
        ];

        foreach ($patterns as $pattern => $replacement) {
            $content = preg_replace($pattern, $replacement, $content);
        }

        return $content;
    }

    /**
     * Add helper methods based on controller type
     */
    private function addHelperMethods(string $content, string $className): string
    {
        $helperMethods = $this->getHelperMethodsForController($className);
        
        if (!empty($helperMethods)) {
            // Find the last method in the class
            $lastBracePos = strrpos($content, '}');
            $helperMethodsCode = "\n" . implode("\n\n", $helperMethods) . "\n";
            
            $content = substr_replace($content, $helperMethodsCode, $lastBracePos, 0);
        }

        return $content;
    }

    /**
     * Get helper methods for specific controller
     */
    private function getHelperMethodsForController(string $className): array
    {
        $methods = [];

        if (strpos($className, 'User') !== false) {
            $methods[] = $this->getUserHelperMethods();
        }

        if (strpos($className, 'Institution') !== false) {
            $methods[] = $this->getInstitutionHelperMethods();
        }

        if (strpos($className, 'Task') !== false) {
            $methods[] = $this->getTaskHelperMethods();
        }

        return array_filter($methods);
    }

    /**
     * Get user helper methods
     */
    private function getUserHelperMethods(): string
    {
        return '    /**
     * Apply user-specific filters
     */
    protected function applyUserFilters($query, Request $request)
    {
        if ($request->filled(\'role\')) {
            $query->whereHas(\'role\', function ($q) use ($request) {
                $q->where(\'name\', $request->role);
            });
        }

        if ($request->filled(\'status\')) {
            $query->where(\'is_active\', $request->status === \'active\');
        }

        if ($request->filled([\'institution\', \'institution_id\'])) {
            $institutionId = $request->institution ?? $request->institution_id;
            $query->where(\'institution_id\', $institutionId);
        }
    }

    /**
     * Override search filter for users
     */
    protected function applySearchFilter($query, string $search)
    {
        $query->where(function ($q) use ($search) {
            $q->where(\'username\', \'ILIKE\', "%{$search}%")
              ->orWhere(\'email\', \'ILIKE\', "%{$search}%")
              ->orWhereHas(\'profile\', function ($pq) use ($search) {
                  $pq->where(\'first_name\', \'ILIKE\', "%{$search}%")
                     ->orWhere(\'last_name\', \'ILIKE\', "%{$search}%");
              });
        });
        
        return $query;
    }';
    }

    /**
     * Get institution helper methods
     */
    private function getInstitutionHelperMethods(): string
    {
        return '    /**
     * Apply institution-specific filters
     */
    protected function applyInstitutionFilters($query, Request $request)
    {
        if ($request->filled(\'type\')) {
            $query->where(\'type\', $request->type);
        }

        if ($request->filled(\'level\')) {
            $query->where(\'level\', $request->level);
        }

        if ($request->has(\'parent_id\')) {
            if ($request->parent_id) {
                $query->where(\'parent_id\', $request->parent_id);
            } else {
                $query->whereNull(\'parent_id\');
            }
        }
    }

    /**
     * Override search filter for institutions
     */
    protected function applySearchFilter($query, string $search)
    {
        $query->where(function ($q) use ($search) {
            $q->where(\'name\', \'ILIKE\', "%{$search}%")
              ->orWhere(\'code\', \'ILIKE\', "%{$search}%")
              ->orWhere(\'address\', \'ILIKE\', "%{$search}%");
        });
        
        return $query;
    }';
    }

    /**
     * Get task helper methods
     */
    private function getTaskHelperMethods(): string
    {
        return '    /**
     * Apply task-specific filters
     */
    protected function applyTaskFilters($query, Request $request)
    {
        if ($request->filled(\'status\')) {
            $query->where(\'status\', $request->status);
        }

        if ($request->filled(\'priority\')) {
            $query->where(\'priority\', $request->priority);
        }

        if ($request->filled(\'assigned_to\')) {
            $query->where(\'assigned_to\', $request->assigned_to);
        }
    }

    /**
     * Override search filter for tasks
     */
    protected function applySearchFilter($query, string $search)
    {
        $query->where(function ($q) use ($search) {
            $q->where(\'title\', \'ILIKE\', "%{$search}%")
              ->orWhere(\'description\', \'ILIKE\', "%{$search}%");
        });
        
        return $query;
    }';
    }

    /**
     * Get controller files
     */
    private function getControllerFiles(): array
    {
        $files = [];
        $iterator = new RecursiveIteratorIterator(
            new RecursiveDirectoryIterator($this->controllersPath)
        );

        foreach ($iterator as $file) {
            if ($file->isFile() && $file->getExtension() === 'php') {
                $fileName = $file->getFilename();
                
                // Skip base classes and already refactored files
                if (!in_array($fileName, ['Controller.php', 'BaseController.php']) && 
                    !strpos($fileName, 'Refactored')) {
                    $files[] = $file->getPathname();
                }
            }
        }

        return $files;
    }

    /**
     * Find last use statement position
     */
    private function findLastUseStatementPosition(string $content): int|false
    {
        $lines = explode("\n", $content);
        $lastUseLineIndex = -1;

        foreach ($lines as $index => $line) {
            if (preg_match('/^use\s+/', trim($line))) {
                $lastUseLineIndex = $index;
            }
        }

        if ($lastUseLineIndex === -1) {
            return false;
        }

        // Calculate position after the last use statement
        $position = 0;
        for ($i = 0; $i <= $lastUseLineIndex; $i++) {
            $position += strlen($lines[$i]) + 1; // +1 for newline
        }

        return $position;
    }

    /**
     * Initialize refactoring patterns
     */
    private function initializePatterns(): void
    {
        $this->patterns = [
            'validation' => [
                'pagination' => '/\$request->validate\(\[\s*[\'"]per_page[\'"] => [\'"]nullable\|integer\|min:1\|max:100[\'"],?\s*[\'"]search[\'"] => [\'"]nullable\|string\|max:255[\'"],?/',
                'bulk_operations' => '/\$request->validate\(\[\s*[\'"](\w+)_ids[\'"] => [\'"]required\|array\|min:1\|max:\d+[\'"],?\s*[\'"](\w+)_ids\.\*[\'"] => [\'"]integer\|exists:\w+,id[\'"],?/',
            ],
            'responses' => [
                'success' => '/return\s+response\(\)->json\(\[\s*[\'"]success[\'"] => true,\s*[\'"]message[\'"] => [\'"]([^\'\"]+)[\'"],?\s*[\'"]data[\'"] => ([^,\]]+),?\s*\]\);/',
                'error' => '/return\s+response\(\)->json\(\[\s*[\'"]success[\'"] => false,\s*[\'"]message[\'"] => [\'"]([^\'\"]+)[\'"],?\s*\],?\s*(\d+)\);/',
                'paginated' => '/return\s+response\(\)->json\(\[\s*[\'"]success[\'"] => true,\s*[\'"]data[\'"] => \$\w+->items\(\),\s*[\'"]meta[\'"] => \[[^\]]+\],?\s*\]\);/',
            ]
        ];
    }
}

// CLI interface
if (php_sapi_name() === 'cli') {
    $refactorer = new ControllerRefactorer();
    
    if (isset($argv[1]) && $argv[1] === 'single' && isset($argv[2])) {
        // Refactor single controller
        $controllerPath = $argv[2];
        if (file_exists($controllerPath)) {
            $refactorer->refactorController($controllerPath);
        } else {
            echo "❌ Controller file not found: {$controllerPath}\n";
        }
    } else {
        // Refactor all controllers
        $refactorer->refactorAll();
    }
}

echo "\n📋 Usage:\n";
echo "  Refactor all: php refactor_controllers.php\n";
echo "  Refactor single: php refactor_controllers.php single /path/to/Controller.php\n\n";