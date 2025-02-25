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
| grant_url                | string    | URL to the grant information. This is a critical field that is stored for all funding opportunities. For direct URL inputs and CSV processing, the original URL is preserved. For HTML uploads, a reference to the uploaded file is stored. |
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

## Features

### Funding Opportunity Extraction

The application provides several ways to extract funding opportunity information:

1. **CSV Upload**: Upload a CSV file containing a list of URLs or solicitation numbers to batch process multiple funding opportunities at once. The CSV must have either a "URL" or "Solicitation" column.
   - For solicitation numbers, the system automatically converts them to URLs based on the format:
     - NIH format (e.g., "PA-25-303") → https://grants.nih.gov/grants/guide/pa-files/PA-25-303.html
     - NSF format (e.g., "NSF 25-535") → https://www.nsf.gov/pubs/25-535/nsf25-535.htm

2. **URL Input**: Enter a single URL to fetch and process a funding opportunity announcement.

3. **HTML Upload**: Upload an HTML file containing a funding opportunity announcement.

4. **Text Input**: Paste text content of a funding opportunity announcement.

The extraction process uses OpenAI to analyze the content and extract structured information about the funding opportunity, which can then be saved to the database.

### Simple CSV Processing

The application provides a dedicated tab for quickly importing funding opportunities from a CSV file without using AI extraction:

1. **Process CSV Tab**: A tab in the grants interface that allows users to upload a CSV file with basic funding opportunity information.
   - Requires a CSV file with at least "Title" and either "URL" or "Solicitation URL" columns
   - Automatically determines the agency based on the presence of a "Parent_Organization" column:
     - If the column exists, entries are marked as NIH
     - If the column doesn't exist, entries are marked as NSF
   - Displays a preview of extracted entries before saving
   - Allows batch saving of all entries to the database
   - Creates basic funding opportunity records with auto-generated FOA codes and default values for required fields
   - Handles quoted fields and properly parses CSV data with commas within quoted strings
   - Provides clear feedback on the number of entries successfully saved
   - Validates CSV format and content before processing
   - Implements robust error handling:
     - Validates URL format for each entry
     - Checks title length and presence
     - Provides detailed error messages for failed entries
     - Handles malformed CSV data gracefully
     - Reports skipped rows with reasons

This feature provides a faster alternative to the AI-based extraction for cases where users have a list of funding opportunities but don't need detailed extraction of all fields.

### CSV Format Requirements

For the Process CSV tab, the CSV file must adhere to the following format:

1. **Required Columns**:
   - `Title`: The title of the funding opportunity
   - Either:
     - `URL`: The URL where the funding opportunity can be found, or
     - `Solicitation URL`: Alternative column name for the URL

2. **Optional Columns**:
   - `Parent_Organization`: If this column exists (regardless of its content), the system will mark entries as NIH grants. If absent, entries will be marked as NSF grants.

3. **Example CSV Format**:
   ```
   Title,URL,Parent_Organization
   "Research on Emerging Technologies","https://grants.nih.gov/example1.html","NIH"
   "Advanced Computing Infrastructure","https://grants.nih.gov/example2.html","NIH"
   ```

   Or with Solicitation URL:
   ```
   Title,Solicitation URL,Parent_Organization
   "Research on Emerging Technologies","https://grants.nih.gov/example1.html","NIH"
   "Advanced Computing Infrastructure","https://grants.nih.gov/example2.html","NIH"
   ```

   Or for NSF grants:
   ```
   Title,URL
   "Quantum Information Science","https://www.nsf.gov/example1.html"
   "Environmental Sustainability","https://www.nsf.gov/example2.html"
   ```

When entries are saved from the CSV, the system automatically generates the following:
- A unique FOA code with an "AUTO-" prefix
- Current date for published_date
- Default values for required fields
- Empty JSON objects for eligibility criteria and submission requirements

These entries can later be updated with more detailed information if needed.

### Funding Opportunity Browsing

The application provides a dedicated view to browse and search all funding opportunities stored in the database:

1. **FOA List View**: A tab in the grants interface that displays all funding opportunities in the database.
   - Includes a search function to filter opportunities by title, agency, FOA code, or grant type
   - Displays a list of opportunities with key information (title, agency, FOA code, deadline)
   - Clicking on an opportunity displays its full details in a side panel
   - Details can be expanded to show all information including eligibility criteria and submission requirements

This view allows users to quickly find and review funding opportunities that have already been extracted and saved to the database, facilitating the grant application process.

## API Endpoints

### /api/extract-grant

This endpoint extracts funding opportunity information from text content.

**Method**: POST

**Request Body**:
```json
{
  "text": "HTML or text content of the funding opportunity"
}
```

**Response**:
```json
{
  "message": "Funding opportunity information extracted successfully",
  "data": {
    // FundingOpportunity object
  }
}
```

### /api/fetch-url

This endpoint fetches HTML content from a URL and returns it as text.

**Method**: POST

**Request Body**:
```json
{
  "url": "https://example.com/funding-opportunity"
}
```

**Response**:
```json
{
  "message": "URL content fetched successfully",
  "data": "Extracted text content from the URL"
}
```

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