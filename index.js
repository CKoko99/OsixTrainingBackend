const express = require('express');
const cors = require('cors');
require('dotenv').config();

const sgMail = require('@sendgrid/mail')



sgMail.setApiKey(process.env.SENDGRID_API_KEY)
const msg = {
  to: 'Courtney3koko@yahoo.com', // Change to your recipient
  from: 'Courtney@getaiu.com', // Change to your verified sender
  subject: 'Sending with SendGrid is Fun',
  text: 'and easy to do anywhere, even with Node.js',
  html: '<strong>and easy to do anywhere, even with Node.js</strong>',
}

const app = express();
app.use(cors())
app.use(express.json());

app.get("/", (request, response) => {
    console.log(process.env.SENDGRID_API_KEY);
    return response.json({ message: process.env.SENDGRID_API_KEY }).status(200);
});
app.post("/send-email", (request, response) => {
    console.log("here")
    console.log(request.body)
    const { to, subject, text, html } = request.body;
    sgMail.send({ to, from: 'Courtney@getaiu.com', subject, text, html })
        .then(() => response.json({ message: "Email sent successfully" }).status(200))
        .catch((error) => response.json({ message: error.message }).status(error.code));
});
app.listen(3333, () => console.log(`Server is running! on port: ${3333}`));

