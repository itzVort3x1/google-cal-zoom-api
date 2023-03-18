const requestPromise = require("request-promise");
const jwt = require("jsonwebtoken");

async function zoom(options) {
	const payload = {
		iss: options.ZOOM_API_KEY,
		exp: new Date().getTime() + 5000,
	};

	const token = jwt.sign(payload, options.ZOOM_API_SECRET);

	email = options.ZOOM_DEVELOPER_EMAIL; // your zoom developer email account

	var options2 = {
		method: "POST",
		uri: "https://api.zoom.us/v2/users/" + email + "/meetings",
		body: {
			topic: "Zoom Meeting Using Node JS", //meeting title
			type: 1,
			settings: {
				host_video: "true",
				participant_video: "true",
			},
		},
		auth: {
			bearer: token,
		},
		headers: {
			"User-Agent": "Zoom-api-Jwt-Request",
			"content-type": "application/json",
		},
		json: true, //Parse the JSON string in the response
	};

	let generatedZoomLink;
	let start_url;
	let password;

	requestPromise(options2)
		.then(function (response) {
			console.log("response is: ", response);
			generatedZoomLink = response.join_url;
			start_url = response.start_url;
			password = response.password;
		})
		.catch(function (err) {
			// API call failed...
			throw new Error("Zoom API Call Failed");
		});

	const { google } = require("googleapis");
	const { OAuth2 } = google.auth;

	var date1 =
		options.date +
		"T" +
		options.startTime.split(":")[0] +
		":" +
		options.startTime.split(":")[1] +
		":30";
	var date2 =
		options.date +
		"T" +
		options.endTime.split(":")[0] +
		":" +
		options.endTime.split(":")[1] +
		":30";

	var x = new Date(
		options.date +
			"T" +
			options.startTime.split(":")[0] +
			":" +
			options.startTime.split(":")[1] +
			":30"
	);
	var y = new Date(
		options.date +
			"T" +
			options.endTime.split(":")[0] +
			":" +
			options.endTime.split(":")[1] +
			":30"
	);

	var end1 =
		options.date +
		"T" +
		x.getUTCHours() +
		":" +
		x.getUTCMinutes() +
		":00" +
		".000Z";
	var end2 =
		options.date +
		"T" +
		y.getUTCHours() +
		":" +
		y.getUTCMinutes() +
		":00" +
		".000Z";

	let oAuth2Client = new OAuth2(options.clientId, options.clientSecret);

	oAuth2Client.setCredentials({
		refresh_token: options.refreshToken,
	});

	let calendar = google.calendar({ version: "v3", auth: oAuth2Client });

	let result = await calendar.events.list({
		calendarId: "primary",
		timeMin: end1,
		timeMax: end2,
		maxResults: 1,
		singleEvents: true,
		orderBy: "startTime",
	});

	let events = result.data.items;
	if (events.length) {
		throw new Error("You are busy at this time slot");
	}

	const eventStartTime = new Date();
	eventStartTime.setDate(options.date.split("-")[2]);
	const eventEndTime = new Date();
	eventEndTime.setDate(options.date.split("-")[2]);
	eventEndTime.setMinutes(eventStartTime.getMinutes() + 45);

	const event = {
		summary: options.summary,
		location: options.location,
		description:
			options.description +
			"\n" +
			"Join Meeting: " +
			generatedZoomLink +
			"\n" +
			"Meeting Password: " +
			password +
			"\n",
		colorId: 1,
		start: {
			dateTime: date1,
			timeZone: "Asia/Kolkata",
		},
		end: {
			dateTime: date2,
			timeZone: "Asia/Kolkata",
		},
		attendees: options.attendees,
		reminders: {
			useDefault: false,
			overrides: [
				{ method: "email", minutes: 24 * 60 },
				{ method: "popup", minutes: options.alert },
			],
		},
	};

	await calendar.events.insert({
		calendarId: "primary",
		conferenceDataVersion: "1",
		resource: event,
	});
	return { join_url: generatedZoomLink, start_url, password };
}

module.exports.zoom = zoom;
