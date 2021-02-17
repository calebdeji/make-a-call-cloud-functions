import * as twilio from "twilio";
import * as firebase from "firebase-functions";

import { CreateCallPayload } from "./types";

const client = twilio(
  firebase.config().env.config.TWILIO_ACCOUNT_SID,
  firebase.config().env.config.TWILIO_AUTH_TOKEN
);

const VoiceResponse = twilio.twiml.VoiceResponse;

export default {
  createCall: async ({ phone_number }: CreateCallPayload) => {
    const projectId =
      firebase.config().env.config.FIREBASE_CONFIG_PROJECTID || "";
    const location =
      firebase.config().env.config.FIREBASE_CONFIG_LOCATION || "";
    const url = `https://${location}-${projectId}.cloudfunctions.net/respondWithTwilioVoice?phone_number=${phone_number}`;

    const options = {
      to: phone_number,
      from: firebase.config().env.config.TWILIO_NUMBER || "",
      url,
    };

    try {
      await client.calls.create(options);
      return await Promise.resolve("We will make a call through soon");
    } catch (error) {
      return await Promise.reject(error);
    }
  },

  voiceResponse: (phone_number: string) => {
    const twimlResponse = new VoiceResponse();
    twimlResponse.say(
      { voice: "alice" },
      `Hi, you requested us to call ${phone_number}. We would like you to meet with our agent at the specified location`
    );

    return twimlResponse.toString();
  },
};
