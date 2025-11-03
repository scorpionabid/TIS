## 📦 Inventory Management

> `routes/api/specialized.php` → `Route::prefix('inventory')`

### Anbar obyektləri

| Method | Route | Permission | Qeyd |
| --- | --- | --- | --- |
| GET | `/api/inventory` | `inventory.read` | Filtrlənə bilən siyahı |
| POST | `/api/inventory` | `inventory.create` | Yeni inventar |
| GET | `/api/inventory/{inventory}` | `inventory.read` | Detal |
| PUT | `/api/inventory/{inventory}` | `inventory.update` | Yeniləmə |
| DELETE | `/api/inventory/{inventory}` | `inventory.delete` | Silmə |
| POST | `/api/inventory/{inventory}/duplicate` | `inventory.create` | Mövcud obyektin kopyası |
| POST | `/api/inventory/bulk-create` | `inventory.manage` | Kütləvi əlavə |
| POST | `/api/inventory/bulk-update` | `inventory.manage` | Kütləvi yeniləmə |
| GET | `/api/inventory/search` | `inventory.read` | Axtarış |
| GET | `/api/inventory/categories` | `inventory.read` | Kateqoriya siyahısı |
| GET | `/api/inventory/low-stock` | `inventory.maintenance` | Aşağı stok |
| GET | `/api/inventory/expired` | `inventory.maintenance` | Muddəti bitmiş |
| POST | `/api/inventory/{inventory}/reorder` | `inventory.manage` | Yenidən sifariş |

### Əməliyyatlar və servis

| Method | Route | Permission | Təsvir |
| --- | --- | --- | --- |
| GET | `/api/inventory/transactions` | `inventory.transactions` | Əməliyyat siyahısı |
| POST | `/api/inventory/transactions` | `inventory.transactions` | Yeni əməliyyat |
| GET | `/api/inventory/transactions/{transaction}` | `inventory.transactions` | Əməliyyat detalı |
| POST | `/api/inventory/transactions/bulk` | `inventory.transactions` | Kütləvi əməliyyat |
| GET | `/api/inventory/transactions/user/{user}` | `inventory.transactions` | İstifadəçi üzrə tarixçə |
| GET | `/api/inventory/maintenance` | `inventory.maintenance` | Baxım siyahısı |
| POST | `/api/inventory/maintenance` | `inventory.maintenance` | Baxım planlama |
| GET | `/api/inventory/maintenance/{maintenance}` | `inventory.maintenance` | Baxım detalı |
| PUT | `/api/inventory/maintenance/{maintenance}` | `inventory.maintenance` | Yeniləmə |
| POST | `/api/inventory/maintenance/{maintenance}/complete` | `inventory.maintenance` | Baxımı tamamlayır |

### Inventar analitikası

| Method | Route | Permission | Qeyd |
| --- | --- | --- | --- |
| GET | `/api/inventory/analytics` | `inventory.analytics` | Ümumi göstəricilər |
| GET | `/api/inventory/analytics/abc-analysis` | `inventory.analytics` | ABC analizi |
| GET | `/api/inventory/analytics/usage-trends` | `inventory.analytics` | İstifadə trendi |
| GET | `/api/inventory/analytics/seasonal-patterns` | `inventory.analytics` | Mövsümi pattern |
| GET | `/api/inventory/analytics/demand-forecast` | `inventory.analytics` | Tələb proqnozu |
| GET | `/api/inventory/analytics/reorder-recommendations` | `inventory.analytics` | Yenidən sifariş tövs.| 
| GET | `/api/inventory/analytics/cost-analysis` | `inventory.analytics` | Xərc analizi |
| GET | `/api/inventory/analytics/carrying-costs` | `inventory.analytics` | Saxlama xərcləri |
| GET | `/api/inventory/analytics/stockout-analysis` | `inventory.analytics` | Stockout analizi |
| GET | `/api/inventory/analytics/excess-inventory` | `inventory.analytics` | Artıq stok |
| GET | `/api/inventory/analytics/vendor-performance` | `inventory.analytics` | Təchizatçı performansı |
| GET | `/api/inventory/analytics/category-performance` | `inventory.analytics` | Kateqoriya performansı |
| GET | `/api/inventory/analytics/location-analysis` | `inventory.analytics` | Lokasiya analizi |
| GET | `/api/inventory/analytics/optimization-opportunities` | `inventory.analytics` | Optimallaşdırma fürsətləri |

---

