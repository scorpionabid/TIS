## 🔐 Authentication & Session Management

> **Qeyd:** Aşağıdakı bütün qeyri-publik endpoint-lər `auth:sanctum` middleware-i tələb edir. Əlavə `permission:*` və ya `role:*` yoxlaması bu modulda tətbiq olunmur.

### Autentifikasiya

#### **POST** `/api/login`
İstifadəçi daxilolması. Rate limiting `LoginRequest` vasitəsilə tətbiq olunur (`App\Http\Requests\Auth\LoginRequest`).

**Request Body (misal):**
```json
{
  "login": "superadmin@atis.az",
  "password": "admin123",
  "remember": true,
  "device_name": "Desktop Chrome",
  "device_id": "browser-uuid-123"
}
```

**Response (200):**
```json
{
  "message": "Uğurlu giriş",
  "data": {
    "user": {
      "id": 1,
      "username": "admin",
      "email": "superadmin@atis.az",
      "roles": ["SuperAdmin"],
      "permissions": ["users.read", "..."]
    },
    "token": "1|xxxxx",
    "expires_at": "2024-08-06T12:00:00Z"
  }
}
```

#### **POST** `/api/logout`
Cari access token-i deaktiv edir. Header: `Authorization: Bearer {token}`.

#### **GET** `/api/me`
Aktiv istifadəçi məlumatını qaytarır (`AuthController@me`).

#### **POST** `/api/refresh-token`
Sanctum token yenilənməsi. Eyni header tələb olunur.

### Profil İdarəetməsi

| Method | Route | İzah | Controller metodu |
| --- | --- | --- | --- |
| GET | `/api/profile` | Profil məlumatlarını göstərir | `ProfileController@show` |
| PUT | `/api/profile` | Əsas məlumatları yeniləyir | `ProfileController@update` |
| POST | `/api/profile/avatar` | Avatar yükləyir | `ProfileController@uploadAvatar` |
| DELETE | `/api/profile/avatar` | Avatarı silir | `ProfileController@removeAvatar` |
| GET | `/api/profile/activity` | Aktivlik jurnalını qaytarır | `ProfileController@getActivity` |
| PUT | `/api/profile/password` | Profil kontekstində parol dəyişir | `ProfileController@updatePassword` |

### Parol və Bərpa

| Method | Route | Qapalı/Açıq | Qeydlər |
| --- | --- | --- | --- |
| POST | `/api/password/reset/request` | Publik | E-mailə bərpa linki göndərir (`PasswordController@requestReset`) |
| POST | `/api/password/reset/confirm` | Publik | Token və yeni parol ilə təsdiq |
| PUT | `/api/password/change` | `auth:sanctum` | Daxil olmuş istifadəçi üçün parol dəyişimi (`PasswordController@changePassword`) |

### Sessiya İdarəetməsi

| Method | Route | Məqsəd |
| --- | --- | --- |
| GET | `/api/sessions` | Aktiv sessiyaların siyahısı |
| DELETE | `/api/sessions/{sessionId}` | Seçilmiş sessiyanı ləğv edir |
| DELETE | `/api/sessions/current` | Cari sessiyanı bağlayır |
| DELETE | `/api/sessions/others` | Cari sessiya istisna olmaqla digərlərini bağlayır |
| DELETE | `/api/sessions/all` | Bütün sessiyaları bağlayır |

### Cihaz İdarəetməsi

| Method | Route | Məqsəd |
| --- | --- | --- |
| GET | `/api/devices` | Qeydiyyatdan keçmiş cihazları list edir |
| POST | `/api/devices/register` | Yeni cihaz əlavə edir |
| PUT | `/api/devices/{deviceId}` | Cihaz məlumatını yeniləyir |
| DELETE | `/api/devices/{deviceId}` | Cihazı sistemdən çıxarır |

### Naviqasiya Endpoint-ləri

| Method | Route | Məqsəd |
| --- | --- | --- |
| GET | `/api/navigation` | Rol əsaslı menyunu qaytarır (`NavigationController@getNavigation`) |
| GET | `/api/navigation/permissions` | Menü elementlərini permission-larla birlikdə qaytarır |

### Permission Xülasəsi

| Route prefix | Middleware |
| --- | --- |
| `/api/login`, `/api/password/reset/*`, `/api/test`, `/api/health`, `/api/ping`, `/api/version`, `/api/config/*`, `/api/setup/*` | Publik |
| `/api/*` (digər autentifikasiya moduluna aid endpoint-lər) | `auth:sanctum` |

### Publik Sistem Endpoint-ləri

| Method | Route | Məqsəd |
| --- | --- | --- |
| GET | `/api/test` | Sürətli idarəetmə üçün JSON “alive” cavabı |
| GET | `/api/health` | Laravel sağlamlıq yoxlaması (`HealthController@health`) |
| GET | `/api/ping` | Sadə ping cavabı |
| GET | `/api/version` | Backend versiyası və `commit_hash` (əgər mövcuddursa) |
| GET | `/api/config/app` | Frontend üçün lazımi konfiqurasiyanı qaytarır |
| GET | `/api/config/constants` | Constants siyahısı (enum-lar, limitlər) |
| GET | `/api/setup/status` | İlk quraşdırma vəziyyətini bildirir |
| POST | `/api/setup/initialize` | Setup Wizard üçün ilkinləşdirmə əməliyyatı |
| POST | `/api/setup/sample-structure` | Demo məlumat quruluşu yaradır |
| GET | `/api/setup/validate` | Sistem konfiqurasiyasını yoxlayır |
| GET | `/api/test/websocket/info` | Reverb/WebSocket parametrlərini qaytarır |

---

