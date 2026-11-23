Reac# GCC360 Development Skills

## Product Context

GCC360 is a Customer 360-degree feedback platform for Welspun GCC.

**Tagline:** One Customer. One Memory. One GCC View.

The platform captures customer meetings, feedback, sentiment, commitments, action items, and customer relationship history.

## Primary Technology Stack

- Mobile app: React Native with Expo
- Web application: React or React Native Web
- Backend: Python with FastAPI
- Database: PostgreSQL
- ORM: SQLAlchemy or SQLModel
- Migrations: Alembic
- Authentication: JWT initially, enterprise SSO later
- File storage: S3-compatible object storage
- Notifications: Expo Push Notifications and email
- Caching/background jobs: Redis with Celery or RQ
- Deployment: Docker-based cloud deployment

## Required Skills

### 1. Product and Business Analysis

- Convert business requirements into user stories
- Define user roles and permissions
- Design customer relationship workflows
- Define feedback categories and sentiment rules
- Design action ownership and closure workflows
- Define leadership dashboards and KPIs
- Identify MVP scope and future-phase features

### 2. JavaScript and TypeScript

- Variables, functions, objects, arrays, and modules
- Promises and async/await
- TypeScript types, interfaces, enums, and generics
- Error handling
- Package management with npm
- Environment configuration
- Clean and reusable component design

### 3. React and React Native

- Functional components
- Props and state
- Hooks, including `useState`, `useEffect`, and custom hooks
- Component composition
- React Native layouts and styling
- Responsive design for mobile and web
- Navigation and route protection
- Form handling and validation
- Loading, empty, and error states
- Accessibility
- Android and iOS build workflows

Recommended libraries:

- React Navigation
- React Hook Form
- Zod
- TanStack Query
- Axios
- Expo Secure Store
- Expo Notifications
- Expo Document Picker
- React Native Paper or NativeWind

### 4. Mobile Application Skills

- Expo project setup
- Secure local storage
- Push notifications
- Camera and document uploads
- Image and file previews
- Network failure handling
- Offline drafts for meeting feedback
- Form autosave
- App permissions
- Android and iOS release builds

### 5. Python and FastAPI

- Python functions, classes, modules, and virtual environments
- Type hints
- Async programming
- FastAPI routes and dependency injection
- Pydantic request and response schemas
- REST API design
- HTTP status codes
- Pagination, filtering, and sorting
- Error handling and validation
- File upload endpoints
- Background tasks
- OpenAPI documentation

Recommended libraries:

- FastAPI
- Uvicorn
- Pydantic Settings
- SQLAlchemy or SQLModel
- Alembic
- Psycopg
- Pytest
- Python-Jose or an equivalent JWT library

### 6. PostgreSQL and Data Modeling

- Tables, columns, and data types
- Primary and foreign keys
- One-to-many and many-to-many relationships
- Constraints and validation
- Indexes
- Transactions
- Joins and aggregation queries
- Database migrations
- Full-text search
- Backup and restore
- Query performance analysis

Core entities:

- User
- Role
- Customer
- Stakeholder
- Meeting
- Meeting participant
- Feedback
- Action item
- Attachment
- Notification
- Audit log

### 7. Authentication and Security

- Password hashing
- JWT access and refresh tokens
- Role-based access control
- Customer- and function-level permissions
- Confidential feedback restrictions
- API authorization checks
- Secure file uploads
- Input validation
- SQL injection prevention
- CORS configuration
- HTTPS
- Secrets management
- Audit logging
- OWASP API security principles

### 8. Dashboard and Web Skills

- Responsive layouts
- Search and filtering
- Data tables
- Pagination
- Charts and trend lines
- Action ageing reports
- Sentiment summaries
- Export to CSV or Excel
- Admin master-data screens
- Role-specific navigation

### 9. Notifications and Integrations

- Mobile push notifications
- Email notification templates
- Due-date and overdue reminders
- Critical escalation alerts
- Notification preferences
- Calendar integration
- Future Microsoft Teams integration
- Retry handling for failed notifications

### 10. File and Attachment Handling

- Multipart uploads
- File type and size validation
- Object storage integration
- Secure download URLs
- Image and document previews
- Attachment permissions
- Malware scanning where required
- File retention rules

### 11. Testing

Backend testing:

- Unit tests with Pytest
- API tests
- Database integration tests
- Authorization tests
- Validation and error tests

Mobile and web testing:

- Component tests with Jest
- React Native Testing Library
- Navigation tests
- Form validation tests
- API mocking
- End-to-end tests with Playwright or Detox

Important scenarios to test:

- Unauthorized users cannot access restricted feedback
- A meeting can create multiple action items
- Overdue actions are identified correctly
- Closed actions require closure information
- Deleted or inactive customers cannot receive new meetings
- Mobile forms recover from network failure

### 12. DevOps and Deployment

- Git branching and pull requests
- Docker and Docker Compose
- Environment variables
- Local PostgreSQL development
- CI/CD pipelines
- Database migration deployment
- Application logging
- Error monitoring
- Health checks
- Database backups
- HTTPS and domain configuration
- Cloud deployment

Recommended tools:

- Git and GitHub
- Docker
- GitHub Actions
- Postman
- Sentry or equivalent error monitoring
- Prometheus/Grafana or managed monitoring

### 13. AI Features for Later Phases

- Voice-to-text conversion
- Meeting note summarization
- Sentiment classification
- Suggested action extraction
- Repeated-theme detection
- Customer risk scoring
- AI-generated pre-meeting briefs
- Human approval workflows
- Privacy and data-retention controls for AI processing

AI features should be added after structured meeting and feedback data is available.

## Development Standards

- Use TypeScript for frontend code where practical.
- Use type hints for all Python functions.
- Keep API routes thin and move business logic into service modules.
- Validate all external input.
- Use database migrations instead of manual schema changes.
- Never commit passwords, tokens, or production credentials.
- Enforce authorization on every protected endpoint.
- Provide loading, empty, success, and error states in the UI.
- Keep customer, meeting, feedback, and action data auditable.
- Write tests for every important workflow.
- Use consistent naming across frontend, backend, and database layers.

## Recommended Learning Sequence

1. JavaScript and TypeScript fundamentals
2. React fundamentals
3. React Native and Expo
4. Python fundamentals
5. FastAPI and REST APIs
6. PostgreSQL and SQLAlchemy
7. Authentication and role-based access control
8. File uploads and notifications
9. Testing and API documentation
10. Docker and deployment
11. Dashboards and analytics
12. AI-assisted features

## MVP Skill Priority

The first development team should be strongest in:

1. React Native and Expo
2. FastAPI and Python
3. PostgreSQL data modeling
4. Authentication and permissions
5. Forms and API integration
6. Action tracking workflows
7. Testing and deployment

## Suggested Team Composition

- Product owner or business analyst
- React Native/frontend developer
- FastAPI/backend developer
- PostgreSQL/database developer
- UI/UX designer
- QA engineer
- DevOps engineer, part-time for MVP

For a small team, one full-stack developer can cover the backend and database, while one React Native developer handles the mobile and web interfaces.
