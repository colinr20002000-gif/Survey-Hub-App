# Project-Logs Analytics Dashboard - Setup Instructions

## Summary

I've successfully created a comprehensive Project-Logs analytics dashboard for your Survey Hub application. This dashboard provides powerful insights into project shifts, time allocation, and team performance.

## What Was Done

### 1. Fixed Critical Bug ✅
- **Issue**: White screen error when clicking "Projects" page due to undefined `totalPages` variable
- **Fix**: Added safety checks in ProjectsPage.jsx, AuditTrailPage.jsx, and Pagination component
- **Files Modified**:
  - `src/pages/ProjectsPage.jsx` (line 68-71)
  - `src/pages/AuditTrailPage.jsx` (line 117-120)
  - `src/components/ui/index.jsx` (line 141)

### 2. Created Database Schema ✅
- **File**: `supabase/migrations/20251023000000_create_project_logs_table.sql`
- **Features**:
  - Full schema matching your specifications
  - Indexes on frequently queried columns (date, project_no, type, client, cancelled)
  - Row Level Security (RLS) policies for Dashboard and Admin privileges
  - Proper data types including interval for time calculations

### 3. Created Comprehensive Dashboard ✅
- **File**: `src/pages/ProjectLogsPage.jsx`
- **Features Implemented**:

#### CSV Import Functionality
- One-click CSV upload button in header
- Automatic truncate and insert (replaces all existing data)
- Batch processing for large files
- User warning about data replacement

#### Global Filters
- **Date Range Filter** with presets:
  - Last 7 Days
  - Last 30 Days
  - This Month
  - Last Month
  - This Quarter
  - This Year
  - Custom Range (with calendar picker)
- **Multi-Select Filters**:
  - Projects (searchable dropdown)
  - Task Types (multi-select)
  - Clients (multi-select)
- **Simple Filters**:
  - Shift Type (All/Day/Night)
  - Cancelled Status (All/Yes/No)
- **Search**: Full-text search across projects, sites, clients, and types
- **Clear All Filters** button

#### KPI Cards (6 Metrics)
1. **Total Shifts**: Count of all shifts in filtered period
2. **Hours on Site**: Sum of total_site_time (converted to hours)
3. **Travel Time**: Sum of total_travel_time (converted to hours)
4. **Time Lost**: Sum of all time_lost columns (converted to hours)
5. **Cancellation Rate**: Percentage of cancelled shifts
6. **Avg. Staff Per Shift**: Average staff_attended_count

#### Interactive Charts (5 Charts)
1. **Shifts Over Time** (Line Chart)
   - X-axis: Date
   - Y-axis: Number of shifts
   - Shows trend over time

2. **Shifts by Task Type** (Pie/Donut Chart)
   - Visual breakdown of work types
   - Shows percentage distribution

3. **Top 10 Projects by Shifts** (Horizontal Bar Chart)
   - Y-axis: Project numbers
   - X-axis: Shift count
   - Sorted by volume

4. **Shift Pattern** (Stacked Bar Chart)
   - Shows Day vs Night shifts by day of week
   - Helps identify busy periods

5. **Time Allocation by Project** (Stacked Bar Chart)
   - Shows Site Time, Travel Time, and Time Lost
   - Top 10 projects by total time
   - Color-coded for easy analysis

#### Raw Data Table
- Sortable columns (click headers)
- Paginated display (25/50/100 per page)
- Responsive design
- Key columns:
  - Date
  - Project Number
  - Type
  - Client
  - Site Name
  - Site Time (formatted as "Xh Ym")
  - Time Lost (formatted with "+" indicator for multiple entries)
  - Staff Count
  - Cancelled Status (color-coded badges)
  - **Active Link** (opens project_log_link in new tab)

### 4. Navigation Integration ✅
- Added "Analytics" as a parent menu with subitems:
  - Dashboard (existing analytics page)
  - Project-Logs (new dashboard)
- Properly integrated with permission system (VIEW_ANALYTICS)
- Lazy-loaded for optimal performance

## Database Migration Instructions

### Option 1: Using Supabase CLI (Recommended)
```bash
# Navigate to your project
cd "E:\Visual Studio\survey-hub-app"

# Sync remote migrations first
npx supabase db pull

# Then apply the new migration
npx supabase db push
```

### Option 2: Manual Application
1. Go to your Supabase Dashboard
2. Navigate to SQL Editor
3. Open `supabase/migrations/20251023000000_create_project_logs_table.sql`
4. Copy the entire contents
5. Paste into SQL Editor
6. Run the query

### Option 3: Supabase Studio
1. Open Supabase Studio (local) or Dashboard (cloud)
2. Go to Table Editor
3. Create new table with the schema from the migration file

## Testing the Dashboard

1. **Start the dev server**:
   ```bash
   npm install  # If dependencies not installed
   npm run dev
   ```

2. **Navigate to Project-Logs**:
   - Click on "Analytics" in the sidebar
   - Click on "Project-Logs"

3. **Import Sample Data**:
   - Click "Import CSV" button
   - Select your CSV file with project logs
   - Confirm the import (this will replace all existing data)

4. **Test Filters**:
   - Try different date ranges
   - Select multiple projects/types/clients
   - Use the search box
   - Clear all filters

5. **Explore Charts**:
   - All charts update dynamically based on filters
   - Hover over data points for details
   - Charts are responsive and work on all screen sizes

## Key Features for Project Managers

### Quick Insights
- **At-a-glance KPIs** show overall performance
- **Color-coded badges** make cancelled shifts obvious
- **Trend charts** show patterns over time

### Filtering Power
- **Drill down by project** to analyze specific jobs
- **Compare shift types** to optimize scheduling
- **Identify problem areas** using time lost data

### Data Export Ready
- **Sortable table** for custom analysis
- **Direct links** to source project logs
- **Comprehensive data** in one place

## Technical Notes

### Time Interval Conversion
The dashboard properly handles PostgreSQL `interval` types by converting them to hours:
```javascript
EXTRACT(EPOCH FROM interval_column) / 3600
```

This is used for all time calculations in KPIs and charts.

### Performance Optimizations
- **useMemo hooks** prevent unnecessary recalculations
- **Lazy loading** for faster initial page load
- **Pagination** handles large datasets efficiently
- **Indexed columns** in database for fast queries

### Responsive Design
- **Mobile-friendly** filters and charts
- **Touch-optimized** interactions
- **Dark mode** support throughout

## Files Created/Modified

### Created
1. `supabase/migrations/20251023000000_create_project_logs_table.sql`
2. `src/pages/ProjectLogsPage.jsx`
3. `PROJECT_LOGS_SETUP.md` (this file)

### Modified
1. `src/pages/ProjectsPage.jsx` - Fixed totalPages bug
2. `src/pages/AuditTrailPage.jsx` - Fixed totalPages bug
3. `src/components/ui/index.jsx` - Added safety check in Pagination
4. `src/App.jsx` - Added ProjectLogsPage import and navigation

## Future Enhancements (Optional)

Consider adding these features in the future:
1. **Export to Excel/CSV** - Download filtered data
2. **Email Reports** - Schedule automated reports
3. **Custom Date Comparison** - Compare two time periods
4. **Staff Performance Metrics** - Track individual staff
5. **Cost Analysis** - Add budget/cost tracking
6. **Gantt Chart View** - Visualize project timelines
7. **Heat Map** - More detailed shift pattern analysis
8. **Alerts/Notifications** - Notify when metrics exceed thresholds

## Support

If you encounter any issues:
1. Check browser console (F12) for errors
2. Verify database migration was applied successfully
3. Ensure CSV headers match the database column names exactly
4. Check that user has VIEW_ANALYTICS permission

## CSV File Format

Your CSV should have these columns (in any order):
```
id,project_log_link,type,client,site_name,project_no,shift_start_date,
shift_start_day,night_or_day_shift,week_no,leave_place_of_rest,
arrive_place_of_rest,total_travel_time,arrive_on_site,leave_site,
total_site_time,time_lost,time_lost_2,time_lost_3,time_lost_4,
inorail_staff,elr,postcode,miles_from,yards_from,miles_to,yards_to,
total_yardage,was_shift_cancelled,staff_attended_count,
subcontractors_attended_count,survey_grid,fiscal_week,fiscal_month,
fiscal_quarter,fiscal_year,calendar_week,calendar_month,calendar_year
```

**Note**: Boolean values should be TRUE/FALSE or true/false
**Note**: Dates should be in YYYY-MM-DD format
**Note**: Times should be in HH:MM:SS format
**Note**: Intervals should be in PostgreSQL format (HH:MM:SS)

---

**Dashboard Created By**: Claude Code
**Date**: October 23, 2025
**Status**: ✅ Complete and Ready for Use
