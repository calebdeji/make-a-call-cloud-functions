import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { CloudTasksClient } from "@google-cloud/tasks";

import { SetUpCallRequestBody, CallData } from "./types";
import twilioCustoms from "./twillo";

var serviceAccount = require("../config.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

exports.setUpCall = functions.https.onRequest(async (request, response) => {
  try {
    const { phone_number, time } = request.body as SetUpCallRequestBody;
    const created_at = Date.now();
    await admin
      .firestore()
      .collection("calls")
      .add({ phone_number, time, created_at });

    response
      .status(200)
      .json({ status: "successfull", message: `Call successfully added` });
  } catch (error) {
    response.status(400).json({
      status: "Error",
      message: "Unable to add a call, kindly contact the admin",
    });
  }
});

exports.makeCallToTwilio = functions.https.onRequest(async (req, res) => {
  try {
    const { phone_number } = req.body as Omit<SetUpCallRequestBody, "time">;
    await twilioCustoms.createCall({ phone_number });
    res.status(200).json({
      status: "successful",
      message: "Call activated",
    });
  } catch (error) {
    res.status(400).json({
      status: "Error",
      message: "Unable to activate a call, kindly contact the admin",
      error,
    });
  }
});

exports.respondWithTwilioVoice = functions.https.onRequest((req, res) => {
  try {
    const { phone_number } = req.query as Omit<SetUpCallRequestBody, "time">;

    const result = twilioCustoms.voiceResponse(phone_number);
    res.writeHead(200, { "Content-Type": "text/xml" });
    res.end(result);
  } catch (error) {
    res.status(400).json({
      status: "Error",
    });
  }
});

exports.activateCall = functions.firestore
  .document("/calls/{id}")
  .onCreate(async (snapshot) => {
    const data = snapshot.data() as CallData;
    const { phone_number, time } = data;
    const projectId =
      functions.config().env.config.FIREBASE_CONFIG_PROJECTID || "";
    const location =
      functions.config().env.config.FIREBASE_CONFIG_LOCATION || "";
    const queue = functions.config().env.config.FIREBASE_CALL_TASK_QUEUE || "";

    const tasksClient = new CloudTasksClient();
    const queuePath: string = tasksClient.queuePath(projectId, location, queue);
    const url = `https://${location}-${projectId}.cloudfunctions.net/makeCallToTwilio`;
    const inSecondsTime = Number(time) * 60 + Date.now() / 1000;
    console.log({ inSecondsTime });

    await tasksClient.createTask({
      parent: queuePath,
      task: {
        httpRequest: {
          httpMethod: "POST",
          url,
          headers: {
            "Content-Type": "application/json",
          },
          body: Buffer.from(JSON.stringify({ phone_number })).toString(
            "base64"
          ),
        },
        scheduleTime: {
          seconds: inSecondsTime,
        },
      },
    });
    await snapshot.ref.update({ callSentOut: true });
  });
