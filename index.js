const express = require('express');
const bodyParser = require('body-parser');
const md5 = require("md5");
const path = require('path');
const mime = require('mime-types');

const cors = require('cors');
const Multer = require('multer');
const { Readable } = require('stream');

const { GoogleSpreadsheet } = require('google-spreadsheet');
const { google } = require('googleapis');
const { JWT } = require('google-auth-library')
const fs = require('fs');
const busboy = require('busboy');
require('dotenv').config();

//Cros Setup to limit domainds
const allowedOrigins = ["http://statewidenetwork.com", "http://localhost:3000"];

const corsOptions = {
  origin: function (origin, callback) {
    if (allowedOrigins.indexOf(origin) !== -1) {
      // Allow the request
      callback(null, true);
    } else {
      // Deny the request
      callback(new Error("Not allowed by CORS"));
    }
  },
};

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
        await sheet.addRow(row);
      }
    }

    await sheet.addRow(row);
  } catch (error) {
    console.error('Error:', error.message);
  }
};



const app = express();
app.use(bodyParser.raw({ type: 'application/octet-stream', limit: '100mb' }));
app.use(cors(corsOptions))


app.use(express.json());
app.use('/uploads', express.static('uploads'));

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*'); // Replace '*' with the specific allowed origin if needed
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  next();
});

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


app.post('/upload', async (req, res) => {
  const { name, currentChunkIndex, totalChunks } = req.query;
  const firstChunk = parseInt(currentChunkIndex) === 0;
  const lastChunk = parseInt(currentChunkIndex) === parseInt(totalChunks) - 1;
  const ext = name.split('.').pop();
  const data = req.body.toString().split(',')[1];
  const buffer = Buffer.from(data, 'base64');
  const tmpFilename = 'tmp_' + md5(name + req.ip) + '.' + ext;
  if (firstChunk && fs.existsSync('./uploads/' + tmpFilename)) {
    fs.unlinkSync('./uploads/' + tmpFilename);
  }
  fs.appendFileSync('./uploads/' + tmpFilename, buffer);
  if (lastChunk) {
    console.log("last chunk")
    const finalFilename = md5(Date.now()).substr(0, 6) + '.' + ext;
    fs.renameSync('./uploads/' + tmpFilename, './uploads/' + finalFilename);
    const response = await uploadToDrive(finalFilename);
    res.status(200).json(response);

    await unlinkAsync('./uploads/' + finalFilename);
  } else {
    res.json('ok');
  }
});

// Upload file from "uploads" folder to Google Drive
async function uploadToDrive(filename) {
  console.log("upload to drive");
  const fileMetadata = {
    name: filename,
    parents: [process.env.GOOGLE_DRIVE_FOLDER_ID],
  };
  const media = {
    mimeType: mime.lookup('./uploads/' + filename) || 'application/octet-stream',
    body: fs.createReadStream('./uploads/' + filename),
  };

  try {
    console.log("try");
    const response = await drive.files.create({
      resource: fileMetadata,
      media: media,
      fields: 'id, webViewLink', // Return both the file ID and the web view link
    });

    console.log("response");
    console.log(response);

    const fileInfo = response.data;
    const fileId = fileInfo.id;
    await setFilePublicAccess(fileId);

    return { message: 'File uploaded successfully', fileLink: fileInfo.webViewLink };
  } catch (error) {
    console.log("Error uploading to drive");
    console.log(error);

    return { message: 'Error uploading file', error: error };
  }
}


app.post('/file', async (req, res) => {
  try {
    const bb = busboy({
      headers: req.headers,
      limits: {
        fileSize: 1024 * 1024 * 1024, // 10MB limit
      },
    });

    let fileStream;
    let fileName;
    let mimeType;

    console.log("We're in the upload file route")
    bb.on('file', async (fieldname, file, filename, encoding, mimetype) => {
      console.log("on BB")
      fileStream = file;
      fileName = filename;
      mimeType = mimetype;

      // Function to upload the file to Google Drive
      const uploadFileToDrive = async () => {
        console.log("on upload to drive")
        const fileMetadata = {
          name: fileName,
          parents: [process.env.GOOGLE_DRIVE_FOLDER_ID],
        };
        const media = {
          mimeType: mimeType,
          body: fileStream,
        };

        // Use the drive.files.create method to upload the file directly to Google Drive
        try {
          const response = await drive.files.create({
            resource: fileMetadata,
            media: media,
            fields: 'id, webViewLink', // Return both the file ID and the web view link
          });

          // Log the file ID and web view link from Google Drive
          console.log('File ID:', response.data.id);
          console.log('File Link:', response.data.webViewLink);

          return response.data; // Return both file ID and web view link
        } catch (error) {

          console.log('Error uploading the file to Google Drive:', error.message);
          throw error;
        }
      }


      const fileInfo = await uploadFileToDrive();

      const fileId = fileInfo.id;
      await setFilePublicAccess(fileId);
      res.status(200).json({ message: 'File uploaded successfully', fileLink: fileInfo.webViewLink });

    });
    req.pipe(bb);
  } catch (error) {
    console.log('Error uploading the file to Google Drive:', error.message);
    throw error;
  }
});



const PORT = process.env.PORT || 3333;
app.listen(PORT, () => {
  //console log the url to the server
  console.log(`Server is running at address: ${``}`)
  console.log(`Server is running! on port: ${PORT}`)
});

