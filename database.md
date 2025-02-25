# Turbo Grant Database Schema

This document provides a comprehensive overview of the database schema used in the Turbo Grant application. The database is implemented using Supabase, a PostgreSQL-based backend.

## Tables

### research_projects

This table stores information about research projects created by users.

| Column      | Type      | Description                                   |
|-------------|-----------|-----------------------------------------------|
| id          | string    | Primary key, unique identifier for the project |
| user_id     | string    | Foreign key to the user who owns the project  |
| title       | string    | Title of the research project                 |
| created_at  | timestamp | When the project was created                  |
| updated_at  | timestamp | When the project was last updated             |

### written_descriptions

This table stores written descriptions (documents) associated with research projects.

| Column      | Type      | Description                                   |
|-------------|-----------|-----------------------------------------------|
| id          | string    | Primary key, unique identifier                |
| project_id  | string    | Foreign key to the research_projects table    |
| file_path   | string    | Path to the stored file                       |
| file_name   | string    | Original name of the file                     |
| file_type   | string    | Type/format of the file                       |
| uploaded_at | timestamp | When the description was uploaded             |

### scientific_figures

This table stores scientific figures (images) associated with research projects.

| Column      | Type      | Description                                   |
|-------------|-----------|-----------------------------------------------|
| id          | string    | Primary key, unique identifier                |
| project_id  | string    | Foreign key to the research_projects table    |
| image_path  | string    | Path to the stored image                      |
| caption     | string    | Optional caption for the figure               |
| order_index | integer   | Order index for displaying multiple figures   |
| uploaded_at | timestamp | When the figure was uploaded                  |

### chalk_talks

This table stores chalk talks (video/audio presentations) associated with research projects.

| Column        | Type      | Description                                   |
|---------------|-----------|-----------------------------------------------|
| id            | string    | Primary key, unique identifier                |
| project_id    | string    | Foreign key to the research_projects table    |
| media_path    | string    | Path to the stored media file                 |
| media_type    | enum      | Type of media: 'video' or 'audio'             |
| transcription | string    | Optional transcription of the talk            |
| uploaded_at   | timestamp | When the chalk talk was uploaded              |

### researcher_profiles

This table stores profiles of researchers associated with research projects.

| Column      | Type      | Description                                   |
|-------------|-----------|-----------------------------------------------|
| id          | string    | Primary key, unique identifier                |
| project_id  | string    | Foreign key to the research_projects table    |
| name        | string    | Name of the researcher                        |
| title       | string    | Title/position of the researcher              |
| institution | string    | Institution the researcher is affiliated with |
| bio         | string    | Biography of the researcher                   |
| created_at  | timestamp | When the profile was created                  |

### grant_types

This table stores information about different types of grants.

| Column       | Type      | Description                                   |
|--------------|-----------|-----------------------------------------------|
| id           | string    | Primary key, unique identifier                |
| name         | string    | Name of the grant type                        |
| organization | string    | Organization offering the grant               |
| description  | string    | Description of the grant type                 |
| instructions | string    | Instructions for applying to the grant        |
| is_custom    | boolean   | Whether this is a custom grant type           |
| created_at   | timestamp | When the grant type was created               |

#### Row Level Security (RLS) Policies for grant_types

The `grant_types` table has the following RLS policies:

1. **Everyone can view grant types**: Allows all users (authenticated or not) to view records in the table.
2. **Authenticated users can create custom grant types**: Only authenticated users can insert new records, and only if the `is_custom` field is set to `true`.

These policies ensure that grant type data is publicly viewable, but only authenticated users can create custom grant types.

### project_grants

This table links research projects to grant types and tracks the status of grant applications.

| Column         | Type      | Description                                   |
|----------------|-----------|-----------------------------------------------|
| id             | string    | Primary key, unique identifier                |
| project_id     | string    | Foreign key to the research_projects table    |
| grant_type_id  | string    | Foreign key to the grant_types table          |
| status         | enum      | Status: 'draft', 'in_progress', or 'completed' |
| created_at     | timestamp | When the project-grant link was created       |
| updated_at     | timestamp | When the project-grant link was last updated  |

### foas

This table stores information about funding opportunities extracted from external sources.

| Column                   | Type      | Description                                   |
|--------------------------|-----------|-----------------------------------------------|
| id                       | string    | Primary key, unique identifier                |
| agency                   | enum      | Funding agency: 'NIH' or 'NSF'               |
| title                    | string    | Title of the funding opportunity              |
| foa_code                 | string    | Funding Opportunity Announcement code         |
| grant_type               | string    | Type of grant (e.g., 'R01', 'R21')           |
| description              | text      | Detailed description of the opportunity       |
| deadline                 | string    | Application deadline                          |
| num_awards               | integer   | Number of awards expected to be given         |
| award_ceiling            | number    | Maximum funding amount (optional)             |
| award_floor              | number    | Minimum funding amount (optional)             |
| letters_of_intent        | boolean   | Whether letters of intent are required        |
| preliminary_proposal     | boolean   | Whether preliminary proposals are required    |
| animal_trials            | boolean   | Whether animal trials are involved            |
| human_trials             | boolean   | Whether human trials are involved             |
| organization_eligibility | json      | Eligibility criteria for organizations        |
| user_eligibility         | json      | Eligibility criteria for individual applicants |
| grant_url                | string    | URL to the grant information                  |
| published_date           | string    | Date when the opportunity was published       |
| submission_requirements  | json      | Requirements for submission                   |
| created_at               | timestamp | When the record was created                   |
| updated_at               | timestamp | When the record was last updated              |

#### Row Level Security (RLS) Policies for foas

The `foas` table has the following RLS policies:

1. **Everyone can view funding opportunities**: Allows all users (authenticated or not) to view records in the table.
2. **Authenticated users can create funding opportunities**: Only authenticated users can insert new records.
3. **Authenticated users can update funding opportunities**: Only authenticated users can update existing records.
4. **Authenticated users can delete funding opportunities**: Only authenticated users can delete records.

These policies ensure that funding opportunity data is publicly viewable, but only authenticated users can modify the data.

## Relationships

- A user can have multiple research projects
- A research project can have multiple written descriptions, scientific figures, chalk talks, and researcher profiles
- A research project can be linked to multiple grant types through the project_grants table
- Funding opportunities are standalone records that can be referenced when creating grant applications

## JSON Structures

### organization_eligibility

This JSON object contains boolean flags for different types of organizations:

```json
{
  "Higher Education": boolean,
  "Non-Profit": boolean,
  "For-Profit": boolean,
  "Government": boolean,
  "Hospital": boolean,
  "Foreign": boolean,
  "Individual": boolean
}
```

### user_eligibility

This JSON object contains boolean flags for different roles:

```json
{
  "Principal Investigator (PI)": boolean,
  "Co-Principal Investigator(Co-PI)": boolean,
  "Co-Investigator (Co-I)": boolean,
  "Senior Personnel": boolean,
  "Postdoctoral Researcher": boolean,
  "Graduate Student": boolean,
  "Undergraduate Student": boolean,
  "Project Administrator": boolean,
  "Authorized Organizational Representative (AOR)": boolean
}
```

### submission_requirements

This JSON object contains information about submission requirements:

```json
{
  "required_documents": string[],
  "formats": string[],
  "additional_instructions": string
}
``` 