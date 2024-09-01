const net = require('net');

const CPP_SERVER_HOST = '127.0.0.1';
const CPP_SERVER_PORT = 5555;

function sendToCppServer(data) {
    return new Promise((resolve, reject) => {
        const client = new net.Socket();
        client.connect(CPP_SERVER_PORT, CPP_SERVER_HOST, () => {
            let message = '';
            for (const [key, value] of Object.entries(data)) {
                message += `${key}:${value}\n`;
            }
            client.write(message);
        });

        let response = '';
        client.on('data', (chunk) => {
            response += chunk;
        });

        client.on('end', () => {
            try {
                const parsedResponse = {};
                response.split('\n').forEach(line => {
                    const [key, value] = line.split(':');
                    if (key && value) {
                        parsedResponse[key.trim()] = value.trim();
                    }
                });
                resolve(parsedResponse);
            } catch (error) {
                reject(error);
            }
        });

        client.on('error', (error) => {
            reject(error);
        });
    });
}

module.exports = { sendToCppServer };