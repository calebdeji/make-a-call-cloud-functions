import { SetUpCallRequestBody } from "../types";

export type CreateCallPayload = Omit<SetUpCallRequestBody, "time">;
