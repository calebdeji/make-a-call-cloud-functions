import * as admin from "firebase-admin";

export interface SetUpCallRequestBody {
  phone_number: string;
  time: number;
}

export interface CallData
  extends admin.firestore.DocumentData,
    SetUpCallRequestBody {}

export interface CallTaskPayload {
  docPath: string;
}
