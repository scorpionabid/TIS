# Enhanced User Modal Guide

## 🎯 Yenilənmiş İstifadəçi Modal Sistemi

Yeni UserModal artıq dinamik tab sistemi ilə müəllim və şagird üçün xüsusi sahələri dəstəkləyir.

## 🚀 Əsas Xüsusiyyətlər

### 1. **Dinamik Tab Sistemi**
- **Əsas məlumatlar**: Bütün istifadəçilər üçün əsas sahələr
- **Müəllim sahəsi**: Yalnız müəllim rolları seçdikdə aktivləşir  
- **Şagird sahəsi**: Yalnız şagird rolları seçdikdə aktivləşir
- **Əlavə məlumatlar**: Təcili əlaqə və əlavə qeydlər

### 2. **Avtomatik Tab Keçmələri**
```typescript
// Rol seçdikdə avtomatik olaraq uyğun tab aktivləşir
onChange: (value: string) => {
  setSelectedRole(value);
  if (isTeacherRole(value)) {
    setActiveTab('teacher');  // Müəllim tabına keç
  } else if (isStudentRole(value)) {
    setActiveTab('student');  // Şagird tabına keç
  }
}
```

### 3. **Müəllim Sahələri**
- **Fənlər**: Multi-select ilə fən seçimi
- **İxtisas**: Peşə ixtisası
- **İş təcrübəsi**: İl sayı
- **MİQ balı**: 0-999.99 arası
- **Sertifikasiya balı**: 0-999.99 arası  
- **Son sertifikasiya tarixi**: Tarix picker
- **Təhsil səviyyəsi**: Dropdown seçim
- **Universitet məlumatları**: Ad, il, GPA

### 4. **Şagird Sahələri**
- **Şagird MİQ balı**: Akademik göstərici
- **Əvvəlki məktəb**: Mətn sahəsi
- **Ailə gəliri**: Rəqəm sahəsi (AZN)

### 5. **UTIS Kod Sistemi**
- 7 rəqəmli unikal kod
- Avtomatik yaradılır (readonly)
- Modal başlığında göstərilir

## 🎨 UI/UX Təkmilləşdirmələri

### Tab Göstəriciləri
```tsx
{selectedRole && isTeacherRole(selectedRole) && (
  <Badge variant="secondary">Aktiv</Badge>
)}
```

### Rəngli Bölmə Başlıqları
- **Müəllim**: Mavi fon (blue-50)
- **Şagird**: Yaşıl fon (green-50)  
- **Əlavə**: Bənövşəyi fon (purple-50)

### Responsive Dizayn
- 4xl modal genişlik
- 2 sütunlu grid layout
- Scroll dəstəyi (max-h-[90vh])

## 💡 İstifadə Nümunəsi

```tsx
import { UserModal } from '@/components/modals/UserModal';

function MyComponent() {
  const [isOpen, setIsOpen] = useState(false);
  
  const handleSave = async (userData: any) => {
    // userData.profile içində bütün məlumatlar
    console.log('Teacher subjects:', userData.profile.subjects);
    console.log('MIQ score:', userData.profile.miq_score);
    
    // Backend-ə göndər
    await userService.createUser(userData);
  };

  return (
    <UserModal
      open={isOpen}
      onClose={() => setIsOpen(false)}
      onSave={handleSave}
      user={existingUser} // Edit üçün mövcud user
    />
  );
}
```

## 🔧 Technical Details

### Form Data Structure
```typescript
{
  // Basic user fields
  username: string;
  email?: string;
  role_id: number;
  
  // Profile data
  profile: {
    first_name: string;
    last_name: string;
    patronymic?: string;
    utis_code?: string;
    
    // Teacher fields
    subjects?: number[];
    specialty?: string;
    experience_years?: number;
    miq_score?: number;
    certification_score?: number;
    
    // Student fields  
    student_miq_score?: number;
    previous_school?: string;
    family_income?: number;
    
    // Additional fields
    emergency_contact_name?: string;
    notes?: string;
  }
}
```

### Role Detection Logic
```typescript
const isTeacherRole = (roleId: string) => {
  const role = availableRoles.find(r => r.id.toString() === roleId);
  return role && (
    role.name.toLowerCase().includes('teacher') || 
    role.name.toLowerCase().includes('müəllim') ||
    role.display_name.toLowerCase().includes('müəllim')
  );
};
```

## 🎓 Enhanced FormBuilder Features

### Multi-Select Support
```typescript
createField('subjects', 'Dərs verdiyi fənlər', 'multiselect', {
  options: subjects || [],
  placeholder: 'Fənləri seçin',
})
```

### onChange Callbacks
```typescript
createField('role_id', 'Rol', 'select', {
  onChange: (value: string) => {
    setSelectedRole(value);
    // Tab switching logic
  }
})
```

### Number Fields with Validation
```typescript
createField('miq_score', 'MİQ balı', 'number', {
  min: 0,
  max: 999.99,
  step: 0.01,
})
```

## 📝 Testing

Test komponenti yaradıldı: `UserModalTest.tsx`

```bash
# Komponenti test etmək üçün
import { UserModalTest } from '@/components/modals/UserModalTest';
```

## 🚨 Məsləhətlər

1. **Rol Seçimi**: İlk öncə rol seçin ki, uyğun tablar aktivləşsin
2. **Məcburi Sahələr**: Yalnız əsas məlumatlar məcburidir
3. **UTIS Kod**: Avtomatik yaradılır, manual dəyişmək olmaz  
4. **Fən Seçimi**: Müəllim rolları üçün mütləq fən seçimi tövsiyə olunur
5. **Data Validation**: Bütün rəqəm sahələrində min/max limitlər var

## 🔄 Migration Yolları

Köhnə UserModal istifadə edən yerlər:
1. Import yolunu yeniləyin
2. onSave callback-i profile structure-a uyğunlaşdırın  
3. Tab navigation-ı istifadə edin

Bu yenilik sistemi daha da peşəkar və istifadəçi dostu edir! 🎉