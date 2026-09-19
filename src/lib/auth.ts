import { getSessionUserLocal } from "@/lib/store";

export const getSessionTokenFromRequest = (request: Request) => {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const cookie = cookieHeader
    .split(";")
    .map((item) => item.trim())
    .find((item) => item.startsWith("cpyif_session="));

  if (!cookie) return null;
  return decodeURIComponent(cookie.split("=")[1] ?? "");
};

export const getUserFromRequest = async (request: Request) => {
  const token = getSessionTokenFromRequest(request);
  return await getSessionUserLocal(token);
};
