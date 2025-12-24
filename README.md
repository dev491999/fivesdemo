
# Zone Photo Tracker - Production Ready

A comprehensive zone management system with multi-role authentication, photo uploads with EXIF timestamp extraction, email notifications, and CEO approval workflow.

## Features

### Authentication & Roles
- **NextAuth** integration with role-based access control
- **CEO**: Access to all zones, can approve/reject work
- **Zone Managers**: Access only to their assigned zone (Zone 1-13)
- **Users**: Can upload photos to any zone

### Zone Management
- **13 Fixed Zones** with dedicated zone managers
- **Unique Work IDs** for every work record
- **3 Work Types**: WPP, WFP, FPP per zone
- **Before & After Photos** with EXIF timestamp extraction

### Workflow
1. **Before Photo Upload**: Creates new work with unique ID
2. **After Photo Upload**: Manager selects existing work by ID
3. **CEO Approval**: Review and approve/reject with comments
4. **Rejected Work**: Manager can delete after photos and re-submit

### Email Notifications
- Zone Manager notified on before photo upload
- CEO notified when work ready for approval
- Zone Manager notified of approval/rejection decisions

### Dashboard Tabs
- **Unsolved**: All zones visible, shows pending/in-progress work
- **Completed**: All zones visible, shows approved work
- **Rejected**: All zones visible, shows rejected work

## Setup Instructions

### 1. Installation
```bash
npm install
```

### 2. Environment Configuration
Update `.env.local` with your credentials:
- MongoDB Atlas connection
- Gmail SMTP settings
- NextAuth configuration

### 3. Default Users
The system creates these accounts automatically:
- **CEO**: ceo@company.com / password
- **Zone Managers**: manager1@company.com - manager13@company.com / password
- **User**: user@company.com / password

### 4. Run Development Server
```bash
npm run dev
```
Open http://localhost:3000

### 5. Production Deployment
```bash
npm run build
npm start
```

## Database Schema

### Zones Collection
- 13 zones with workRecords arrays
- Each work has unique _id, workType, photos, status

### Users Collection
- Authentication with role and assignedZone fields
- Zone managers restricted to their zone

## API Endpoints

- `/api/auth/[...nextauth]` - Authentication
- `/api/zones` - Zone listing with role filtering
- `/api/zones/[id]` - Individual zone data
- `/api/upload` - Photo upload with work creation/association
- `/api/zones/[id]/approve` - CEO approval workflow
- `/api/work/[workId]/after-photo/[photoId]` - Delete after photos

## Deployment

Ready for deployment to:
- **Render** (configured for production)
- **Vercel** with persistent file storage
- **Railway** or similar Node.js platforms

For production:
1. Update environment variables
2. Configure persistent storage for uploads
3. Set up email provider
4. Deploy with build commands: `npm run build` && `npm start`

## Support

Built for professional zone management with all business requirements implemented.
Production-ready with error handling and validation.
