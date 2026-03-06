## 📋 HTTP Status Codes

- `200 OK` - Successful GET, PUT requests
- `201 Created` - Successful POST requests  
- `204 No Content` - Successful DELETE requests
- `400 Bad Request` - Validation errors
- `401 Unauthorized` - Authentication required
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Resource not found
- `422 Unprocessable Entity` - Validation failed
- `429 Too Many Requests` - Rate limit exceeded
- `500 Internal Server Error` - Server error

---

## 🔄 Standard Response Format

### Success Response
```json
{
  "success": true,
  "data": {
    // Response data
  },
  "message": "Operation completed successfully",
  "meta": {
    "timestamp": "2024-08-05T12:00:00Z",
    "version": "v1.0"
  }
}
```

### Error Response  
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": {
    "email": ["Email field is required"],
    "password": ["Password must be at least 8 characters"]
  },
  "meta": {
    "error_code": "VALIDATION_FAILED",
    "timestamp": "2024-08-05T12:00:00Z"
  }
}
```

### Pagination Format
```json
{
  "data": [...],
  "meta": {
    "current_page": 1,
    "per_page": 20,
    "total": 150,
    "last_page": 8,
    "from": 1,
    "to": 20
  },
  "links": {
    "first": "/api/users?page=1",
    "last": "/api/users?page=8", 
    "next": "/api/users?page=2",
    "prev": null
  }
}
```

---

## 🚀 Rate Limiting

- **Authentication**: 60 requests/minute
- **Standard operations**: 300 requests/hour
- **Bulk operations**: 10 requests/hour
- **File uploads**: 30 requests/hour
- **Analytics queries**: 100 requests/hour
- **Export operations**: 5 requests/hour

Rate limiting headers included in responses:
- `X-RateLimit-Limit` - Maximum requests allowed
- `X-RateLimit-Remaining` - Remaining requests
- `X-RateLimit-Reset` - Reset time (Unix timestamp)

---

**This documentation covers the complete ATİS Backend API with 435+ endpoints across all major functional areas. The API is designed for scalability, security, and ease of integration with the React frontend.**
