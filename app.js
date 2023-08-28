const http = require('http');

const server = http.createServer((req, res) => {
    res.end(process.env.test || 'Hello World');
});
const PORT = process.env.PORT || 8080;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));


