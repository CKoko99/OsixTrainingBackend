const http = require('http');

const server = http.createServer((req, res) => {
    res.end('This is my first response');
});
const PORT = process.env.PORT || 8080;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));


