# Budget Planner

Budget Planner is a web-based personal finance management system built to help users keep track of their money in a simple and organized way.

The application allows users to record their income and expenses, organize spending into categories, set savings goals, and view their financial activity through useful visualizations. It also includes an admin side for managing users, categories, alerts, and overall system activity.

## What the project includes

### User
- User registration and login
- Personal dashboard
- Income tracking
- Expense tracking and categorization
- Savings goals
- Spending analytics
- Overspending alerts
- Monthly financial summaries

### Admin
- Admin login and authentication
- User management
- Category management
- Budget and spending monitoring
- Alert management
- System activity and audit information

## How it works

The application starts with a role selection where the user can choose between the User and Admin modules.

Users can manage their personal financial information from their dashboard, while administrators can monitor and manage the overall application through the admin dashboard.

The project currently uses browser-based storage for handling application data, making it easy to run and test without requiring a separate database setup.

## Technologies Used

- HTML
- CSS
- JavaScript
- LocalStorage
- Git
- GitHub

## Project Structure

```text
BUDGETPLANNER/
│
├── admin/
│   ├── ad.html
│   ├── ad.css
│   ├── ad.js
│   ├── manager-dashboard.html
│   ├── manager-dashboard.css
│   └── manager-dashboard.js
│
├── user/
│   ├── login.html
│   ├── login.css
│   ├── login.js
│   ├── dashboard.html
│   ├── dashboard.css
│   └── dashboard.js
│
├── auth.js
├── role.html
├── role.css
└── role.js
