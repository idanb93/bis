import { DBEnv } from "./enums/DBEnv";
import { Secrets } from "./enums/Secrets";

export const dbEnvToSecretName = new Map<string, Secrets>([
    [DBEnv.LOCAL, Secrets.IDANS_LOCAL_DB],
    [DBEnv.DEV, Secrets.DEV_DB],
    [DBEnv.PROD, Secrets.PROD_DB]
  ]);
  
export function getSecretForDbEnv(env: string): Secrets {
  const secret = dbEnvToSecretName.get(env);

  if (!secret) {
    throw new Error("please enter valid DB environment");
  }

  return secret;
}