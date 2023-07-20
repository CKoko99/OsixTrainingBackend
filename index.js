const express = require('express');
const cors = require('cors');
const Multer = require('multer');
const { Readable } = require('stream');

const { GoogleSpreadsheet } = require('google-spreadsheet');
const { google } = require('googleapis');
const { JWT } = require('google-auth-library')
const fs = require('fs');
require('dotenv').config();

//SendGrid Email Service Setup
const sgMail = require('@sendgrid/mail')
sgMail.setApiKey(process.env.SENDGRID_API_KEY)

//Google Drive Setup
const CREDENTIALS = JSON.parse(fs.readFileSync('osix-training-auth-7e06b1ed392e.json'));

const googleDriveServiceAuth = new JWT({
  // env var values here are copied from service account credentials generated by google
  // see "Authentication" section in docs for more info
  email: CREDENTIALS.client_email,
  key: CREDENTIALS.private_key,
  scopes: [
    'https://www.googleapis.com/auth/drive',
  ],
});
const drive = google.drive({ version: 'v3', auth: googleDriveServiceAuth });

//Google Sheets Setup
const googleSheetsServiceAuth = new JWT({
  // env var values here are copied from service account credentials generated by google
  // see "Authentication" section in docs for more info
  email: CREDENTIALS.client_email,
  key: CREDENTIALS.private_key,
  scopes: [
    'https://www.googleapis.com/auth/spreadsheets',
  ],
});


const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID, googleSheetsServiceAuth);

const addRowToSheet = async (sheetName, headerData, row) => {
  try {
    // Load document info (e.g., title, worksheets)
    await doc.loadInfo();
    console.log(`Loaded doc: ` + doc.title);
    console.log(`sheetName: ` + sheetName);
    let sheet = doc.sheetsByTitle[sheetName];
    if (!sheet) {
      console.log("Sheet not found");
      sheet = await doc.addSheet({ title: sheetName });
      await sheet.setHeaderRow(headerData);
    } else {
      // Check if sheet has header values
      console.log("Sheet found");
      try {
        // Check if sheet has header values
        await sheet.loadHeaderRow();
      } catch (error) {
        console.log("Sheet has no header row.");
        await sheet.setHeaderRow(headerData);
      }
    }

    await sheet.addRow(row);
  } catch (error) {
    console.error('Error:', error.message);
  }
};



const app = express();
app.use(cors())
app.use(express.json());

app.get("/", (request, response) => {
  console.log(process.env.SENDGRID_API_KEY);

  return response.json({ message: process.env.SENDGRID_API_KEY }).status(200);
});
app.post("/send-emai", (request, response) => {
  console.log("here")
  console.log(request.body)
  const { to, subject, text, html } = request.body;
  sgMail.send({ to, from: 'Courtney@getaiu.com', subject, text, html })
    .then(() => response.json({ message: "Email sent successfully" }).status(200))
    .catch((error) => response.json({ message: error.message }).status(error.code));
});
app.post("/add-row", async (request, response) => {
  console.log(request.body)
  const row = []
  const sheetHeader = []
  //user responses
  for (let i = 0; i < request.body.length - 1; i++) {
    row.push(request.body[i][1])
    //Data will be formatted like [ '1 Timestamp', '7/19/2023, 10:39:46 AM' ], remove everything before the space and keep the rest
    //index of the space
    const spaceIndex = request.body[i][0].indexOf(" ")
    //everything after the space
    const header = request.body[i][0].substring(spaceIndex + 1)
    sheetHeader.push(header)

  }
  console.log(row)
  console.log("sheetHeader")
  console.log(sheetHeader)
  //Sheet Header Data

  await addRowToSheet(request.body[request.body.length - 1][1], sheetHeader, row);


  return response.json({ message: "Row added successfully" }).status(200);
});
const multer = Multer({
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

// Create a multer instance with the defined storage
const getFileLink = async (fileId) => {

  try {
    const response = await drive.files.get({
      fileId: fileId,
      fields: 'webViewLink', // Retrieve the web view link of the file
    });

    return response.data.webViewLink; // Return the web view link
  } catch (error) {
    console.error('Error getting file link:', error.message);
    return null;
  }
};
const setFilePublicAccess = async (fileId) => {

  try {
    // Set the file's sharing settings to public
    await drive.permissions.create({
      fileId: fileId,
      requestBody: {
        role: 'reader', // Change to 'writer' or 'owner' if you want different access levels
        type: 'anyone',
      },
    });
  } catch (error) {
    console.error('Error setting public access:', error.message);
  }
};

// Route to handle the file upload
app.post('/file', multer.single('file'), async (req, res) => {
  try {
    console.log(req.file); // The uploaded file can be accessed using req.file
    console.log(req.body); // Other form fields can be accessed using req.body

    if (!req.file) {
      res.status(400).send("No file uploaded.");
      return;
    }

    // Function to upload the file to Google Drive
    const uploadFileToDrive = async () => {
      const fileMetadata = {
        name: req.file.filename,
        parents: [process.env.GOOGLE_DRIVE_FOLDER_ID],
      };
      const media = {
        mimeType: req.file.mimetype,
        body: Readable.from(req.file.buffer),
      };

      // Use the drive.files.create method to upload the file directly to Google Drive
      const response = await drive.files.create({
        resource: fileMetadata,
        media: media,
        fields: 'id, webViewLink', // Return both the file ID and the web view link
      });

      // Log the file ID and web view link from Google Drive
      console.log('File ID:', response.data.id);
      console.log('File Link:', response.data.webViewLink);

      return response.data; // Return both file ID and web view link
    };

    // Call the async function to upload the file
    const fileInfo = await uploadFileToDrive();
    const fileId = fileInfo.id;
    await setFilePublicAccess(fileId);

    // Respond with the file link
    res.status(200).json({ message: "File uploaded successfully", fileLink: fileInfo.webViewLink });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "File upload failed" });
  }
});

const PORT = process.env.PORT || 3333;
app.listen(PORT, () => {
  //console log the url to the server
  console.log(`Server is running at address: ${``}`)
  console.log(`Server is running! on port: ${PORT}`)
});

