# Audit Trail System Documentation

## Overview

The audit trail system provides comprehensive logging and tracking of all user activities and system events in the TraceSys application. It records actions from both instructors and students, providing security, compliance, and monitoring capabilities.

## Features

- ✅ **Universal User Tracking**: Records activities from all user roles (admin, instructor, student, user, mechanic)
- ✅ **Comprehensive Activity Categories**: Security, academic, submission, attendance, user management, system
- ✅ **Rich Context Data**: IP address, user agent, location, session tracking
- ✅ **Flexible Filtering**: Search, category, severity, status, user, date range filters
- ✅ **Statistics Dashboard**: Activity counts, trends, and analytics
- ✅ **Export Capabilities**: CSV export for compliance and reporting
- ✅ **Automatic Logging**: Middleware for seamless integration
- ✅ **Manual Logging**: Helper functions for custom events

## Database Schema

### AuditLog Model

```typescript
{
  id: string;                    // UUID primary key
  userId?: string;               // User who performed the action
  sessionId?: string;            // Session identifier
  action: string;                // Action performed (e.g., "User Created")
  resource: string;              // Resource affected (e.g., "User Management")
  resourceId?: string;           // ID of the specific resource
  details: string;               // Detailed description
  ipAddress: string;             // IP address of the request
  userAgent: string;             // Browser/client information
  severity: "low" | "medium" | "high";
  category: "security" | "academic" | "submission" | "attendance" | "user_management" | "system";
  status: "success" | "failed" | "warning";
  country?: string;              // Geographic location
  region?: string;
  city?: string;
  metadata?: string;             // JSON string for additional data
  createdAt: Date;               // Timestamp
}
```

## API Endpoints

### Base URL: `/api/v1/audit`

| Method | Endpoint | Description | Authentication |
|--------|----------|-------------|----------------|
| POST | `/audit/` | Create audit log | Required |
| GET | `/audit/` | Get audit logs with filters | Required |
| GET | `/audit/stats` | Get audit statistics | Required |
| GET | `/audit/users` | Get users for filtering | Required |
| GET | `/audit/categories` | Get available categories | Required |
| GET | `/audit/severities` | Get available severities | Required |
| GET | `/audit/statuses` | Get available statuses | Required |
| GET | `/audit/export` | Export logs to CSV | Required |
| GET | `/audit/:id` | Get specific audit log | Required |
| DELETE | `/audit/cleanup` | Delete old logs | Required |

### Query Parameters for GET `/audit/`

- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 10)
- `search` (string): Search in action, resource, details
- `category` (string): Filter by category
- `severity` (string): Filter by severity
- `status` (string): Filter by status
- `userId` (string): Filter by user ID
- `startDate` (string): Start date filter (ISO format)
- `endDate` (string): End date filter (ISO format)

## Usage Examples

### 1. Manual Audit Logging

```typescript
import { logAuditEvent } from "@/middlewares/audit";

// In a controller
await logAuditEvent(req, {
  action: "Student Grade Updated",
  resource: "Academic Records",
  resourceId: studentId,
  details: `Updated grade for ${studentName} from ${oldGrade} to ${newGrade}`,
  category: "academic",
  severity: "medium",
  metadata: {
    oldGrade,
    newGrade,
    reason: "Additional project completion"
  }
});
```

### 2. Using Audit Middleware

```typescript
import { auditMiddlewares } from "@/middlewares/audit";

// Apply to routes
router.post("/agency/", isAuthenticated, auditMiddlewares.agencyCreate, createAgencyController);
router.put("/agency/:id", isAuthenticated, auditMiddlewares.agencyUpdate, updateAgencyController);
router.delete("/agency/:id", isAuthenticated, auditMiddlewares.agencyDelete, deleteAgencyController);
```

### 3. Custom Audit Middleware

```typescript
import { createAuditMiddleware } from "@/middlewares/audit";

const customAudit = createAuditMiddleware({
  action: "Custom Action",
  resource: "Custom Resource",
  category: "system",
  severity: "low",
  includeRequestBody: true,
  includeResponseBody: false,
  skipSuccessLogs: false
});

router.post("/custom-endpoint", isAuthenticated, customAudit, customController);
```

## Activity Categories

### Security
- Login/logout attempts
- Failed authentication
- Access violations
- Password changes
- Account lockouts

### Academic
- Grade updates
- Course management
- Requirement approvals/rejections
- Report evaluations
- Academic record changes

### Submission
- Report submissions
- Requirement submissions
- File uploads
- Document submissions

### Attendance
- Clock in/out events
- Attendance approvals
- Time tracking
- Location verification

### User Management
- User creation
- User updates
- Role changes
- Account activation/deactivation
- Agency management

### System
- System operations
- Automated processes
- Data synchronization
- Maintenance tasks

## Severity Levels

### Low
- Routine operations
- Successful actions
- Non-critical updates

### Medium
- Important changes
- User management actions
- Academic updates

### High
- Security events
- Data deletions
- Critical system changes
- Failed operations

## Integration Guide

### 1. Add Audit Logging to Existing Controllers

```typescript
import { logAuditEvent } from "@/middlewares/audit";

export const updateController = async (req: Request, res: Response) => {
  // ... existing logic ...
  
  const result = await updateData(id, updateData);
  
  // Add audit logging
  await logAuditEvent(req, {
    action: "Resource Updated",
    resource: "Resource Type",
    resourceId: id,
    details: `Updated ${resourceName}`,
    category: "user_management",
    severity: "medium",
    metadata: { updatedFields: Object.keys(updateData) }
  });
  
  res.status(200).json({ success: true, data: result });
};
```

### 2. Use Predefined Middleware

```typescript
import { auditMiddlewares } from "@/middlewares/audit";

// Apply to routes
router.post("/", isAuthenticated, auditMiddlewares.userCreate, createController);
router.put("/:id", isAuthenticated, auditMiddlewares.userUpdate, updateController);
router.delete("/:id", isAuthenticated, auditMiddlewares.userDelete, deleteController);
```

### 3. Frontend Integration

```typescript
// Fetch audit logs
const fetchAuditLogs = async (filters) => {
  const response = await fetch(`/api/v1/audit/?${new URLSearchParams(filters)}`);
  return response.json();
};

// Export audit logs
const exportAuditLogs = async (filters) => {
  const response = await fetch(`/api/v1/audit/export?${new URLSearchParams(filters)}`);
  const blob = await response.blob();
  // Download the CSV file
};
```

## Security Considerations

1. **Data Privacy**: Audit logs contain sensitive information - ensure proper access controls
2. **Retention Policy**: Implement data retention policies to manage log storage
3. **Access Control**: Restrict audit log access to authorized personnel only
4. **Data Integrity**: Audit logs should be immutable once created
5. **Performance**: Consider indexing and archiving strategies for large datasets

## Maintenance

### Cleanup Old Logs

```typescript
// Delete logs older than 90 days
const deletedCount = await deleteOldAuditLogsData(90);
```

### Monitoring

- Monitor audit log creation rates
- Set up alerts for high-severity events
- Regular review of failed operations
- Track user activity patterns

## Troubleshooting

### Common Issues

1. **Missing Audit Logs**: Check if audit middleware is properly applied
2. **Performance Issues**: Consider pagination and indexing
3. **Storage Space**: Implement log rotation and cleanup
4. **Permission Errors**: Verify user authentication and authorization

### Debug Mode

Enable debug logging to troubleshoot audit system issues:

```typescript
// In audit service
console.log("Creating audit log:", auditData);
```

## Future Enhancements

- Real-time audit log streaming
- Advanced analytics and reporting
- Integration with external monitoring tools
- Automated alerting system
- Machine learning for anomaly detection
