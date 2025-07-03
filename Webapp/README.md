# Complaint Submission Website

This is a React website for submitting complaints, built with Vite and Material UI. The site uses a blue (#002f6c) and white color scheme and allows users to:

1. Select Sub-product, Issue Group, Issue, and Sub-issue from dropdowns (options are easily editable in `src/complaintOptions.js`).
2. Enter complaint details in a long text field.
3. Submit the complaint, which sends the data to an API and displays the response.

## How to Run

### Using Docker

1. Build and start the Docker container:
   ```sh
   docker-compose up --build
   ```

2. Access the application in your browser at:
   ```
   http://localhost:4444
   ```

### Local Development

#### Frontend

1. Install dependencies:
   ```sh
   npm install
   ```
2. Start the development server:
   ```sh
   npm run dev
   ```

#### Backend

1. Navigate to the backend directory:
   ```sh
   cd Webapp
   ```
2. (Optional) Create a virtual environment and activate it:
   ```sh
   python -m venv venv
   .\venv\Scripts\activate
   ```
3. Install backend dependencies:
   ```sh
   pip install -r requirements.txt
   ```
4. Start the backend server:
   ```sh
   python backend.py
   ```

## Customizing Dropdown Options
Edit `src/complaintOptions.js` to change the dropdown values.

## Theming
The color scheme is blue (#002f6c) and white, set in `src/theme.js`.

## API Integration
Replace the placeholder API endpoint in `src/App.jsx` with your actual backend endpoint.
