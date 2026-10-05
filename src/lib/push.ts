import { sign } from "node:crypto";
import { connect } from "node:http2";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";
import { prisma } from "@/lib/prisma";

type PushMessage = {
  title: string;
  body: string;
  path?: string;
};

type ApnsResponse = {
  token: string;
  status: number;
  reason?: string;
};

let warnedAboutFirebase = false;
let warnedAboutApns = false;
let cachedApnsToken: { value: string; createdAt: number; keyId: string; teamId: string } | null = null;

function getFirebaseApp() {
  const rawServiceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!rawServiceAccount) {
    if (!warnedAboutFirebase) {
      console.warn("Android push is disabled: FIREBASE_SERVICE_ACCOUNT_JSON is not configured.");
      warnedAboutFirebase = true;
    }
    return null;
  }

  try {
    const existing = getApps()[0];
    if (existing) return existing;
    return initializeApp({ credential: cert(JSON.parse(rawServiceAccount)) });
  } catch (error) {
    console.error("Firebase push initialization failed.", error);
    return null;
  }
}

function getApnsProviderToken() {
  const keyId = process.env.APNS_KEY_ID;
  const teamId = process.env.APNS_TEAM_ID;
  const privateKey = process.env.APNS_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!keyId || !teamId || !privateKey) {
    if (!warnedAboutApns) {
      console.warn("iOS push is disabled: APNS_KEY_ID, APNS_TEAM_ID and APNS_PRIVATE_KEY are not configured.");
      warnedAboutApns = true;
    }
    return null;
  }

  if (
    cachedApnsToken &&
    cachedApnsToken.keyId === keyId &&
    cachedApnsToken.teamId === teamId &&
    Date.now() - cachedApnsToken.createdAt < 50 * 60 * 1000
  ) {
    return cachedApnsToken.value;
  }

  try {
    const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString("base64url");
    const signingInput = `${encode({ alg: "ES256", kid: keyId })}.${encode({ iss: teamId, iat: Math.floor(Date.now() / 1000) })}`;
    const signature = sign("sha256", Buffer.from(signingInput), { key: privateKey, dsaEncoding: "ieee-p1363" }).toString("base64url");
    const value = `${signingInput}.${signature}`;
    cachedApnsToken = { value, createdAt: Date.now(), keyId, teamId };
    return value;
  } catch (error) {
    console.error("APNs provider-token generation failed.", error);
    return null;
  }
}

function sendApnsBatch(tokens: string[], message: PushMessage, providerToken: string): Promise<ApnsResponse[]> {
  const topic = process.env.APNS_BUNDLE_ID;
  if (!topic) {
    console.error("iOS push delivery failed: APNS_BUNDLE_ID is not configured.");
    return Promise.resolve([]);
  }

  const host = process.env.APNS_USE_SANDBOX === "true" ? "https://api.sandbox.push.apple.com" : "https://api.push.apple.com";
  const session = connect(host);

  return new Promise((resolve) => {
    const results: ApnsResponse[] = [];
    let remaining = tokens.length;
    let finished = false;

    const finish = () => {
      if (finished) return;
      finished = true;
      if (!session.destroyed && !session.closed) session.close();
      resolve(results);
    };

    session.setTimeout(15000, () => {
      console.error("APNs notification delivery timed out.");
      session.destroy();
      finish();
    });
    session.once("error", (error) => {
      console.error("APNs connection failed.", error);
      finish();
    });

    for (const token of tokens) {
      const request = session.request({
        ":method": "POST",
        ":path": `/3/device/${token}`,
        authorization: `bearer ${providerToken}`,
        "apns-topic": topic,
        "apns-push-type": "alert",
        "apns-priority": "10",
        "apns-expiration": "0",
        "content-type": "application/json",
      });
      let status = 0;
      let responseBody = "";
      let requestFinished = false;
      const completeRequest = (result?: ApnsResponse) => {
        if (requestFinished) return;
        requestFinished = true;
        if (result) results.push(result);
        remaining -= 1;
        if (remaining === 0) finish();
      };
      request.setEncoding("utf8");
      request.on("response", (headers) => {
        status = Number(headers[":status"] || 0);
      });
      request.on("data", (chunk: string) => {
        responseBody += chunk;
      });
      request.once("error", (error) => {
        console.error("APNs notification request failed.", error);
        completeRequest({ token, status, reason: "RequestError" });
      });
      request.once("end", () => {
        let reason: string | undefined;
        if (responseBody) {
          try {
            reason = (JSON.parse(responseBody) as { reason?: string }).reason;
          } catch (error) {
            console.error("Unable to parse APNs response.", error);
          }
        }
        const response = { token, status, reason };
        if (status !== 200) console.error("APNs notification was rejected.", { status, reason });
        completeRequest(response);
      });
      request.end(JSON.stringify({
        aps: { alert: { title: message.title, body: message.body }, sound: "default" },
        path: message.path || "/member/notifications",
      }));
    }
  });
}

async function sendAndroidPush(tokens: string[], message: PushMessage) {
  const app = getFirebaseApp();
  if (!app) return;

  for (let offset = 0; offset < tokens.length; offset += 500) {
    const chunk = tokens.slice(offset, offset + 500);
    try {
      const result = await getMessaging(app).sendEachForMulticast({
        tokens: chunk,
        notification: { title: message.title, body: message.body },
        data: { path: message.path || "/member/notifications" },
        android: { priority: "high", notification: { channelId: "cpyif_updates" } },
      });
      const invalidTokens = result.responses.flatMap((response, index) => {
        if (
          !response.success &&
          (response.error?.code === "messaging/registration-token-not-registered" ||
            response.error?.code === "messaging/invalid-registration-token")
        ) {
          return [chunk[index]];
        }
        if (!response.success) console.error("Firebase push delivery failed.", response.error);
        return [];
      });
      if (invalidTokens.length) await prisma.pushDevice.deleteMany({ where: { token: { in: invalidTokens } } });
    } catch (error) {
      console.error("Firebase push delivery failed.", error);
    }
  }
}

async function sendIosPush(tokens: string[], message: PushMessage) {
  if (tokens.length === 0) return;
  const providerToken = getApnsProviderToken();
  if (!providerToken) return;

  for (let offset = 0; offset < tokens.length; offset += 100) {
    const chunk = tokens.slice(offset, offset + 100);
    const responses = await sendApnsBatch(chunk, message, providerToken);
    const invalidTokens = responses
      .filter((response) => response.status === 410 || response.reason === "BadDeviceToken" || response.reason === "DeviceTokenNotForTopic")
      .map((response) => response.token);
    if (invalidTokens.length) await prisma.pushDevice.deleteMany({ where: { token: { in: invalidTokens } } });
  }
}

export async function sendPushNotification(userId: string, message: PushMessage) {
  try {
    const devices = await prisma.pushDevice.findMany({
      where: { userId },
      select: { token: true, platform: true },
    });
    if (devices.length === 0) return;

    const androidTokens = devices.filter((device) => device.platform === "android").map((device) => device.token);
    const iosTokens = devices.filter((device) => device.platform === "ios").map((device) => device.token);
    await Promise.all([sendAndroidPush(androidTokens, message), sendIosPush(iosTokens, message)]);
  } catch (error) {
    console.error("Cooperative push delivery failed.", error);
  }
}
