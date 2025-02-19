# TurboGrant Implementation Plan

## Phase 1: Database Schema & Infrastructure

### 1.1 Supabase Database Tables

```sql
-- Research Projects
CREATE TABLE research_projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  title TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Written Descriptions
CREATE TABLE written_descriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES research_projects(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Scientific Figures
CREATE TABLE scientific_figures (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES research_projects(id) ON DELETE CASCADE,
  image_path TEXT NOT NULL,
  caption TEXT,
  order_index INTEGER NOT NULL,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Chalk Talks
CREATE TABLE chalk_talks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES research_projects(id) ON DELETE CASCADE,
  media_path TEXT NOT NULL,
  media_type TEXT NOT NULL, -- 'video' or 'audio'
  transcription TEXT,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Researcher Profiles
CREATE TABLE researcher_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES research_projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  title TEXT,
  institution TEXT,
  bio TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Grant Types
CREATE TABLE grant_types (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  organization TEXT NOT NULL,
  description TEXT,
  instructions TEXT,
  is_custom BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Project Grant Applications
CREATE TABLE project_grants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES research_projects(id) ON DELETE CASCADE,
  grant_type_id UUID REFERENCES grant_types(id),
  status TEXT NOT NULL, -- 'draft', 'in_progress', 'completed'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 1.2 Storage Buckets Setup

```typescript
// Storage buckets for different file types
const buckets = {
  descriptions: 'research-descriptions',
  figures: 'scientific-figures',
  chalkTalks: 'chalk-talks',
  customGrants: 'custom-grant-instructions',
};
```

## Phase 2: Core Components & Pages

### 2.1 Project Dashboard

- `/app/dashboard/page.tsx` - Main dashboard showing all projects
- `/app/dashboard/[projectId]/page.tsx` - Individual project view
- Components:
  - ProjectCard
  - ProjectHeader
  - ProjectProgress

### 2.2 Research Description Interface

- `/app/dashboard/[projectId]/description/page.tsx`
- Components:
  - DocumentUploader
  - DocumentPreview
  - DocumentList

### 2.3 Scientific Figures Interface

- `/app/dashboard/[projectId]/figures/page.tsx`
- Components:
  - ImageUploader
  - ImageGallery
  - CaptionEditor
  - FigureOrderManager

### 2.4 Chalk Talk Interface

- `/app/dashboard/[projectId]/chalk-talk/page.tsx`
- Components:
  - MediaUploader
  - MediaPlayer
  - TranscriptionViewer

### 2.5 Researcher Profile Interface

- `/app/dashboard/[projectId]/researchers/page.tsx`
- Components:
  - ResearcherForm
  - ResearcherList
  - InstitutionAutocomplete

### 2.6 Grant Selection Interface

- `/app/dashboard/[projectId]/grants/page.tsx`
- Components:
  - GrantSelector
  - CustomGrantUploader
  - GrantInstructionsViewer

## Phase 3: Form Components & Validation

### 3.1 Base Form Components

```typescript
// Form Components
-TextField - TextArea - FileUpload - ImageUpload - MediaUpload - MultiSelect - Checkbox - RadioGroup - DatePicker;
```

### 3.2 Validation Schemas

```typescript
// Zod Schemas
const researchProjectSchema = z.object({
  title: z.string().min(1).max(200),
  // ... other fields
});

const researcherProfileSchema = z.object({
  name: z.string().min(1),
  title: z.string().optional(),
  institution: z.string().optional(),
  bio: z.string().optional(),
});

const scientificFigureSchema = z.object({
  caption: z.string().min(1),
  order_index: z.number().min(0),
});

// ... other schemas
```

## Phase 4: File Handling & Storage

### 4.1 File Upload Handlers

```typescript
// Upload Utilities
const uploadHandlers = {
  description: async (file: File) => {
    // Handle document upload
  },
  figure: async (file: File) => {
    // Handle image upload
  },
  chalkTalk: async (file: File) => {
    // Handle media upload
  },
};
```

### 4.2 File Processing

```typescript
// Processing Utilities
const processors = {
  transcribe: async (mediaFile: File) => {
    // Handle transcription
  },
  validateDocument: async (file: File) => {
    // Validate document format
  },
  processImage: async (file: File) => {
    // Process and optimize image
  },
};
```

## Phase 5: Data Management

### 5.1 Server Actions

```typescript
// Server Actions
export const actions = {
  createProject: async (data: ProjectData) => {
    // Create new project
  },
  updateProject: async (id: string, data: ProjectData) => {
    // Update project
  },
  uploadDescription: async (projectId: string, file: File) => {
    // Handle description upload
  },
  uploadFigure: async (projectId: string, file: File, caption: string) => {
    // Handle figure upload
  },
  uploadChalkTalk: async (projectId: string, file: File) => {
    // Handle chalk talk upload
  },
};
```

### 5.2 Data Fetching

```typescript
// Data Fetching
export const queries = {
  getProject: async (id: string) => {
    // Get project details
  },
  getResearchers: async (projectId: string) => {
    // Get researcher profiles
  },
  getFigures: async (projectId: string) => {
    // Get scientific figures
  },
};
```

## Phase 6: UI/UX Implementation

### 6.1 Layout Components

```typescript
// Layouts
-DashboardLayout - ProjectLayout - FormLayout;
```

### 6.2 Navigation

```typescript
// Navigation
-Breadcrumbs - ProjectTabs - ProgressIndicator;
```

### 6.3 Feedback Components

```typescript
// Feedback
-LoadingSpinner - ErrorBoundary - SuccessMessage - ValidationError;
```

## Phase 7: Grant Type Management

### 7.1 Predefined Grants

```typescript
// Initial Grant Types
const initialGrants = [
  {
    name: 'NIH R01',
    organization: 'National Institutes of Health',
    description: 'Research Project Grant Program',
    instructions: '...',
  },
  {
    name: 'NSF Standard Grant',
    organization: 'National Science Foundation',
    description: 'Standard Grant',
    instructions: '...',
  },
  // ... more grants
];
```

### 7.2 Custom Grant Support

```typescript
// Custom Grant Handler
const handleCustomGrant = async (data: CustomGrantData) => {
  // Process custom grant upload
};
```

## Implementation Order

1. **Week 1-2: Infrastructure**

   - Set up Supabase tables
   - Configure storage buckets
   - Implement base authentication

2. **Week 3-4: Core Project Management**

   - Implement project creation
   - Build project dashboard
   - Create project detail views

3. **Week 5-6: File Upload Systems**

   - Build document upload system
   - Implement image upload with preview
   - Create media upload with player

4. **Week 7-8: Research Profiles**

   - Build researcher profile forms
   - Implement profile management
   - Create institution handling

5. **Week 9-10: Grant Management**

   - Implement grant type system
   - Build grant selection interface
   - Create custom grant upload

6. **Week 11-12: Polish & Integration**
   - Implement full validation
   - Add error handling
   - Create loading states
   - Polish UI/UX

## Next Steps

1. Begin with database schema implementation
2. Set up storage buckets
3. Create basic project management interface
4. Implement file upload systems
5. Build researcher profile management
6. Add grant selection system

Would you like me to proceed with any specific part of this implementation plan?
