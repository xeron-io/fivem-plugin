const axios = require("axios");
const crypto = require("crypto-js");
const Rcon = require('rcon');

const config = require('./conf/config.json');

async function executeCommand(command, server = {
	address: string,
	port: string,
	password: string
}) {
	const conn = new Rcon(server.address, server.port, server.password, { tcp: false, challenge: false });
	conn.on('auth', function() {
		conn.send(command);
	}).on('error', function(err) {
		console.log("Error: " + err);
	}).on('end', function() {
		console.log("Connection closed");
		process.exit();
	});

	conn.connect();
};

RegisterCommand('redeem', async (source, args, raw) => {
	const transactionId = args[0]
	const apiKey = config.apiKey
	const privateKey = config.privateKey

	// Generate Signature
	const signature = crypto.HmacSHA256(transactionId, privateKey).toString(crypto.enc.Hex)
	const body = {
		apiKey,
		transactionId,
		signature
	}

	const response = await axios.post('https://api.xeron.io/callback', body)
	if(response.data.success === true) {
		
		// response mapping
		const server = {
			address: response.data.data.server_ip,
			port: response.data.data.server_port,
			password: config.rconPassword
		}

		emitNet('chat:addMessage', source, { args: [`^2${response.data.message}`] })
		console.log(`[Xeron] ${GetPlayerName(source)} has redeemed a code!`)
		await executeCommand(response.data.data.command.replace('{id}', source), server)
	}
	else {
		emitNet('chat:addMessage', source, { args: [`^1${response.data.message}`] })
		console.log(`[Xeron] ${GetPlayerName(source)} tried to redeem a code but failed!`)
	}
}, false)