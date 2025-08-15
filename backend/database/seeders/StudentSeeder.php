<?php

namespace Database\Seeders;

use App\Models\Student;
use App\Models\Institution;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class StudentSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Get school institutions (based on names containing "məktəb", "lissey", or "gimnaziya")
        $institutions = Institution::where(function($query) {
                $query->where('name', 'like', '%məktəb%')
                      ->orWhere('name', 'like', '%lisey%') 
                      ->orWhere('name', 'like', '%gimnaziya%')
                      ->orWhere('name', 'like', '%School%');
            })
            ->take(5)
            ->get();

        if ($institutions->isEmpty()) {
            $this->command->info('No school institutions found. Please run institution seeder first.');
            return;
        }

        $studentData = [
            ['first_name' => 'Aysel', 'last_name' => 'Məmmədova', 'gender' => 'female'],
            ['first_name' => 'Rəşad', 'last_name' => 'Əliyev', 'gender' => 'male'],
            ['first_name' => 'Günel', 'last_name' => 'Həsənova', 'gender' => 'female'],
            ['first_name' => 'Elvin', 'last_name' => 'Qədirov', 'gender' => 'male'],
            ['first_name' => 'Nigar', 'last_name' => 'Bəylərova', 'gender' => 'female'],
            ['first_name' => 'Tural', 'last_name' => 'Nərimanov', 'gender' => 'male'],
            ['first_name' => 'Leyla', 'last_name' => 'Səfərova', 'gender' => 'female'],
            ['first_name' => 'Kamal', 'last_name' => 'Rəhimov', 'gender' => 'male'],
            ['first_name' => 'Səma', 'last_name' => 'Abbaszadə', 'gender' => 'female'],
            ['first_name' => 'Orxan', 'last_name' => 'Mustafayev', 'gender' => 'male'],
            ['first_name' => 'Fidan', 'last_name' => 'İbrahimova', 'gender' => 'female'],
            ['first_name' => 'Nihad', 'last_name' => 'Hacıyev', 'gender' => 'male'],
            ['first_name' => 'Səidə', 'last_name' => 'Məlikova', 'gender' => 'female'],
            ['first_name' => 'Vüsal', 'last_name' => 'Qariyev', 'gender' => 'male'],
            ['first_name' => 'Aydan', 'last_name' => 'Rəsulova', 'gender' => 'female'],
            ['first_name' => 'Murad', 'last_name' => 'Əhmədov', 'gender' => 'male'],
            ['first_name' => 'Zeynəb', 'last_name' => 'Şükürlü', 'gender' => 'female'],
            ['first_name' => 'Farid', 'last_name' => 'Cəfərov', 'gender' => 'male'],
            ['first_name' => 'Aysun', 'last_name' => 'Nağıyeva', 'gender' => 'female'],
            ['first_name' => 'Ruslan', 'last_name' => 'Məmmədzadə', 'gender' => 'male'],
        ];

        $gradeLevels = ['5', '6', '7', '8', '9', '10', '11'];
        $classes = ['A', 'B', 'C'];

        $studentCounter = 1;

        foreach ($institutions as $institution) {
            foreach ($gradeLevels as $gradeLevel) {
                foreach ($classes as $class) {
                    $className = $gradeLevel . $class;
                    
                    // Create 3-5 students per class
                    $studentsPerClass = rand(3, 5);
                    
                    for ($i = 0; $i < $studentsPerClass; $i++) {
                        if ($studentCounter > count($studentData)) {
                            break 3; // Break out of all loops
                        }
                        
                        $studentInfo = $studentData[$studentCounter - 1];
                        
                        $student = Student::create([
                            'student_number' => sprintf('%04d%03d', date('Y'), $studentCounter),
                            'first_name' => $studentInfo['first_name'],
                            'last_name' => $studentInfo['last_name'],
                            'institution_id' => $institution->id,
                            'class_name' => $className,
                            'grade_level' => $gradeLevel,
                            'birth_date' => now()->subYears(10 + (int)$gradeLevel)->subDays(rand(0, 365)),
                            'gender' => $studentInfo['gender'],
                            'parent_name' => $this->generateParentName($studentInfo['first_name'], $studentInfo['gender']),
                            'parent_phone' => '+994' . rand(50, 99) . rand(1000000, 9999999),
                            'parent_email' => strtolower($studentInfo['last_name']) . rand(1, 999) . '@example.com',
                            'address' => $this->generateAddress(),
                            'is_active' => true,
                        ]);
                        
                        $studentCounter++;
                        
                        $this->command->info("Created student: {$student->name} ({$student->student_number}) in {$institution->name} - {$className}");
                    }
                }
            }
        }

        $this->command->info('Student seeder completed successfully!');
    }

    /**
     * Generate parent name based on student info
     */
    private function generateParentName($studentFirstName, $gender): string
    {
        $fatherNames = ['Əli', 'Həsən', 'Məmməd', 'Rəşid', 'Farid', 'Kamal', 'Tural', 'Elvin'];
        $motherNames = ['Gülnar', 'Sevda', 'Nərmin', 'Günay', 'Lalə', 'Məryəm', 'Səidə', 'Aysel'];
        
        $fatherName = $fatherNames[array_rand($fatherNames)];
        $motherName = $motherNames[array_rand($motherNames)];
        
        return "{$fatherName} və {$motherName}";
    }

    /**
     * Generate random address
     */
    private function generateAddress(): string
    {
        $districts = ['Yasamal', 'Nəsimi', 'Səbail', 'Nərimanov', 'Binəqədi', 'Nizami', 'Suraxanı'];
        $streets = ['Nizami', 'Füzuli', 'Təbriz', 'Bakı', 'Azadlıq', 'Həsən bəy Zərdabi', 'Ş.Gəncəvi'];
        
        $district = $districts[array_rand($districts)];
        $street = $streets[array_rand($streets)];
        $building = rand(1, 150);
        $apartment = rand(1, 50);
        
        return "Bakı şəhəri, {$district} rayonu, {$street} küçəsi {$building}, mənzil {$apartment}";
    }
}