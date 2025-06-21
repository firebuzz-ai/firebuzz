import Cloudflare from "cloudflare";
import { ERRORS } from "../utils/errors";

const apiKey = process.env.CLOUDFLARE_API_KEY;
const apiEmail = process.env.CLOUDFLARE_EMAIL;

if (!apiKey || !apiEmail) throw new Error(ERRORS.ENVS_NOT_INITIALIZED);

export const cloudflare = new Cloudflare({
  apiKey,
  apiEmail,
});
