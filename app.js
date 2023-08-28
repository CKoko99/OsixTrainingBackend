const http = require('http');
require('dotenv').config();

const server = http.createServer((req, res) => {
    console.log(JSON.parse(process.env.TEST))
    res.end(process.env.TEST || 'Hello World');
});
const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`)
}
);


