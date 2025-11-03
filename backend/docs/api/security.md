## 🔒 Authentication & Permissions

### Required Headers
```
Authorization: Bearer {token}
Content-Type: application/json
Accept: application/json
```

### Permission Levels
- `*.read` - View operations
- `*.create` - Create operations  
- `*.update` - Update operations
- `*.delete` - Delete operations
- `*.manage` - Full management access

### Role-Based Access
- **SuperAdmin**: All permissions system-wide
- **RegionAdmin**: Full access within assigned region
- **SektorAdmin**: Full access within assigned sector  
- **SchoolAdmin**: Full access within assigned school
- **Müəllim**: Limited access for teaching operations
- **UBR**: Event management and specific UBR functions
- **Psixoloq**: Psychology support operations

### Regional Data Isolation
All data queries are automatically filtered by user's institutional hierarchy to ensure data isolation between regions/sectors/schools.

---

