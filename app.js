const http = require('http');

const server = http.createServer((req, res) => {
    const CREDENTIALS = JSON.parse(process.env.CREDENTIALS);
    res.end(JSON.parse(process.env.TEST) || 'Hello World');
});
const PORT = process.env.PORT || 8080;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));


