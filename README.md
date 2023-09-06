# Getting Started with the new Osix Training Portal

The Purpose of this project was to create a secure backend web application for our new insurance training website
Frontend Repository can be seen [here](https://github.com/koko2loko/OsixTraining)

# Highlighted Features of the Backend

Supports File Uploading to Google Drive

Saving Quiz Data to google spreadsheet

Emailing Training Results to Managers on completion

Fetching Page Content from Firestore DB for Authenticated Users

# Technical Details
Server is built with Node, and Express

Uses various google apis 

# Enviroment Variables
    All Secrets are stored on google
SENDGRID_API_KEY=
GOOGLE_SHEET_ID=
GOOGLE_DRIVE_FOLDER_ID=
CREDENTIALS #Google Service Account
GMAIL_OAUTH #Used to send Emails
FIREBASE_CONFIG #Used to access firestore

# Deployment
Continous Integration / Continous Deployment pipeline is created using docker, google cloud build, and google cloud run

On every push to the main github branch a docker image is built and deployed, the backend server link can be found on google cloud run