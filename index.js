import express from 'express';
import bodyParser from 'body-parser';
import md5 from "md5";
import path from 'path';
import mime from 'mime-types';
import streamifier from 'streamifier';
import nodemailer from 'nodemailer';
import cors from 'cors';
import Multer from 'multer';
import { Readable } from 'stream';

import { GoogleSpreadsheet } from 'google-spreadsheet';
import { google } from 'googleapis';
import { JWT } from 'google-auth-library'
import fs from 'fs';
import busboy from 'busboy';
import 'dotenv/config';
import pageRoute from './routes/page.js'
import userRoute from './routes/user.js'
import storeRoute from './routes/stores.js'
import authRoute from './routes/auth.js'
import sgMail from '@sendgrid/mail'
import { googleOauthHandler } from './controllers/session.controller.js';


//Cros Setup to limit domainds
const allowedOrigins = ['http://192.168.20.122:3000', "http://usinsurancetraining.com", "https://usinsurancetraining.com", "http://localhost:3000"];

const corsOptions = {
  origin: function (origin, callback) {
    if (allowedOrigins.indexOf(origin) !== -1) {
      // Allow the request
      callback(null, true);
    } else {
      // Deny the request
      callback(null, true);
      //callback(new Error(`${origin} Not allowed by CORS`));
    }
  },
};

//SendGrid Email Service Setup
sgMail.setApiKey(process.env.SENDGRID_API_KEY)

//Google Cloud Platform Setup

//Google Drive Setup
//OLD
const CREDENTIALS = JSON.parse(process.env.CREDENTIALS);

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

//Google Gmail Setup
const OAUTHCREDENTIALS = JSON.parse(process.env.GMAIL_OAUTH)
const gmailOAuth = new google.auth.OAuth2(OAUTHCREDENTIALS.client_id, OAUTHCREDENTIALS.client_secret);
gmailOAuth.setCredentials({ refresh_token: OAUTHCREDENTIALS.refresh_token });


//Express Setup
const app = express();
app.use(bodyParser.raw({ type: 'application/octet-stream', limit: '100mb' }));
app.use(cors(corsOptions))
app.use(express.json());

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*'); // Replace '*' with the specific allowed origin if needed
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  next();
});

//First Route to test connection
app.get("/", (request, response) => {
  console.log("Server")
  return response.json({ message: "Server" }).status(200);
});

//Send Email From SendGrid
app.post("/sendgrid-send-email", (request, response) => {
  console.log("here")
  console.log(request.body)
  const { to, subject, text, html } = request.body;
  sgMail.send({ to, from: 'Courtney@getaiu.com', subject, text, html })
    .then(() => response.json({ message: "Email sent successfully" }).status(200))
    .catch((error) => response.json({ message: error.message }).status(error.code));
});


//Send Email From Gmail
app.post("/send-email", async (request, res) => {
  const { to, subject, text, html } = request.body;
  const extraEmails = ['courtney@getaiu.com', `hrdept@getaiu.com`]
  const emailRecipients = [...to, ...extraEmails]
  try {
    const accessToken = await gmailOAuth.getAccessToken();
    const transport = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        type: 'OAuth2',
        user: 'noreply@getaiu.com',
        clientId: OAUTHCREDENTIALS.client_id,
        clientSecret: OAUTHCREDENTIALS.client_secret,
        refreshToken: OAUTHCREDENTIALS.refresh_token,
        accessToken: accessToken,
      },
    });
    const mailOptions = {
      from: '"Agent Training" <noreply@getaiu.com>',
      to: emailRecipients,
      subject: subject,
      text: text,
      html: html
    };
    await transport.sendMail(mailOptions)
    console.log("Email sent successfully to")
    console.log(emailRecipients)
    res.status(200).send({ message: "Email sent successfully" });

  } catch (error) {
    console.log(error)
    res.status(500).send({ message: "An error occurred while sending the email" });
  }
});

app.post("/send-issue", async (request, res) => {
  const { subject, text, html } = request.body;
  const emailRecipients = ['courtney@getaiu.com',]
  try {
    const accessToken = await gmailOAuth.getAccessToken();
    const transport = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        type: 'OAuth2',
        user: 'noreply@getaiu.com',
        clientId: OAUTHCREDENTIALS.client_id,
        clientSecret: OAUTHCREDENTIALS.client_secret,
        refreshToken: OAUTHCREDENTIALS.refresh_token,
        accessToken: accessToken,
      },
    });
    const mailOptions = {
      from: '"Agent Training" <noreply@getaiu.com>',
      to: emailRecipients,
      subject: subject,
      text: text,
      html: html
    };
    await transport.sendMail(mailOptions)
    console.log("Email sent successfully to")
    console.log(emailRecipients)
    res.status(200).send({ message: "Email sent successfully" });

  } catch (error) {
    console.log(error)
    res.status(500).send({ message: "An error occurred while sending the email" });
  }
});

//Add Row to Google Sheet
const addRowToSheet = async (sheetName, headerData, row) => {
  try {
    // Load document info (e.g., title, worksheets)
    const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID, googleSheetsServiceAuth);
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

//Chunking Files to Google Drive

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

const CHUNKS = {};

app.post('/upload', async (req, res) => {
  try {
    console.log("reached upload")
    const { name, currentChunkIndex, totalChunks } = req.query;
    const lastChunk = parseInt(currentChunkIndex) === parseInt(totalChunks) - 1;
    const ext = name.split('.').pop();
    const data = req.body.toString().split(',')[1];
    const buffer = Buffer.from(data, 'base64');

    // Store the chunk in an array based on the chunk index
    if (!CHUNKS[name]) {
      CHUNKS[name] = [];
    }
    CHUNKS[name][currentChunkIndex] = buffer;

    if (lastChunk) {
      // Concatenate all the chunks into a single buffer
      const concatenatedBuffer = Buffer.concat(CHUNKS[name]);

      // Create the file on Google Drive using the concatenated buffer
      const fileResource = await drive.files.create({
        resource: {
          name: name,
          mimeType: mime.lookup(ext) || 'application/octet-stream',
          parents: [process.env.GOOGLE_DRIVE_FOLDER_ID],
        },
        media: {
          mimeType: mime.lookup(ext) || 'application/octet-stream',
          body: streamifier.createReadStream(concatenatedBuffer), // Convert buffer to a readable stream
        },
        fields: 'id, webViewLink',
      });

      const fileId = fileResource.data.id;
      await setFilePublicAccess(fileId);

      // Clean up the chunks array after successful upload
      delete CHUNKS[name];
      console.log(fileResource.data.webViewLink)
      res.status(200).json({
        message: 'File uploaded successfully',
        fileLink: fileResource.data.webViewLink,
        fileId: fileId,
      });
    } else {
      res.json('ok');
    }
  } catch (error) {
    // Handle error during Google Drive upload
    console.error('Error uploading file to Google Drive:', error.message);
    delete CHUNKS[name]; // Clean up the chunks array in case of error
    res.status(500).json({ error: 'Error uploading file to Google Drive' });
  }
});
//app.get('/api/sessions/oauth/google', googleOauthHandler, )
app.use('/auth', authRoute)
app.use('/page', pageRoute)
app.use('/user', userRoute)
app.use('/store', storeRoute)
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  //console log the url to the server
  console.log(`Server is running! on port: ${PORT}`)
});