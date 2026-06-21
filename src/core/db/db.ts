import { Pool } from "pg";
import { dbEnvironment, nodeEnvironment } from "../consts/environmentVariables";
import { Secrets } from "../consts/enums/Secrets";
import { AWSSecretsManagerWrapper } from "../AWS/SecretsManager";
import { DBConfig } from "../AWS/types";
import { DBEnv } from "../consts/enums/DBEnv";
import { dbEnvToSecretName } from "../consts/dbEnvToSecretName";

let pool: Pool;
const MAX_NUMBER_OF_CONNECTIONS: number = 5; // adjust based on DB capacity
const MAX_CONNECTIONS_ATTEMPTS_SECRETS_MANAGER: number = 3;
const REGION: string = "eu-central-1";
const CLOSE_IDLE_CLIENTS_AFTER_MS: number = 30000; // Close idle clients after 30s

export async function getPool(): Promise<Pool> {
  try {
    const isLocal: boolean = dbEnvironment === DBEnv.LOCAL;
    if (!pool) {
      const secretsManager = new AWSSecretsManagerWrapper({
        region: REGION,
        maxAttempts: MAX_CONNECTIONS_ATTEMPTS_SECRETS_MANAGER,
      });

      console.log("db_env", dbEnvironment);
      console.log("node_env", nodeEnvironment);

      const dbSecretName: Secrets | undefined = dbEnvToSecretName.get(
        dbEnvironment!,
      );
      const dbConfig: DBConfig = await secretsManager.getSecret(dbSecretName!);
      pool = new Pool({
        host: dbConfig.host,
        port: Number(dbConfig.port),
        user: dbConfig.username,
        password: dbConfig.password,
        database: dbConfig.engine,
        max: MAX_NUMBER_OF_CONNECTIONS,
        idleTimeoutMillis: CLOSE_IDLE_CLIENTS_AFTER_MS,
        ...(isLocal ? {} : { ssl: { rejectUnauthorized: false } }),
      });
    }
    return pool;
  } catch (err) {
    throw `err in getPool : ${err}`;
  }
}
